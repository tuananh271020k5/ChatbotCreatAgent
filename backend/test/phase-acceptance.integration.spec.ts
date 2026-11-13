import { copyFile, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDatabaseClient } from '../src/database/database.providers';
import { runMigrations } from '../src/database/migrations/migration-runner';
import { seedDevelopmentData } from '../src/database/seeds/development-seed';
import { agents, tenantMemberships } from '../src/database/schema';
import { runInTenantTransaction } from '../src/database/tenant-transaction';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const migrationsDirectory = path.resolve(__dirname, '../../database/migrations');

function databaseUrl(baseUrl: string, databaseName: string): string {
  const parsed = new URL(baseUrl);
  parsed.pathname = `/${databaseName}`;
  return parsed.toString();
}

function createDatabaseName(label: string): string {
  return `agent_builder_${label}_${randomUUID().replaceAll('-', '')}`;
}

async function createDatabase(adminPool: Pool, name: string): Promise<void> {
  await adminPool.query(`CREATE DATABASE "${name}"`);
}

async function dropDatabase(adminPool: Pool, name: string): Promise<void> {
  await adminPool.query(
    'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
    [name],
  );
  await adminPool.query(`DROP DATABASE IF EXISTS "${name}"`);
}

describe.runIf(Boolean(testDatabaseUrl))('Plan 3 phase acceptance', () => {
  const adminPool = new Pool({ connectionString: testDatabaseUrl });
  const acceptanceDatabase = createDatabaseName('acceptance');
  let pool: Pool;

  beforeAll(async () => {
    await createDatabase(adminPool, acceptanceDatabase);
    pool = new Pool({ connectionString: databaseUrl(testDatabaseUrl!, acceptanceDatabase) });
    await runMigrations(pool, migrationsDirectory);
  });

  afterAll(async () => {
    await pool?.end();
    await dropDatabase(adminPool, acceptanceDatabase);
    await adminPool.end();
  });

  it('migrate database sạch tạo đủ schema nền tảng', async () => {
    const tables = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'app' ORDER BY table_name`,
    );
    expect(tables.rows.map(({ table_name }) => table_name)).toEqual(
      expect.arrayContaining([
        'tenants',
        'tenant_memberships',
        'agents',
        'agent_versions',
        'workflows',
        'workflow_versions',
        'executions',
        'audit_events',
        'outbox_events',
      ]),
    );
  });

  it('nâng cấp từ migration trước giữ dữ liệu và chỉ apply migration mới', async () => {
    const upgradeDatabase = createDatabaseName('upgrade');
    const previousMigrations = await mkdtemp(path.join(tmpdir(), 'agent-builder-previous-'));
    let upgradePool: Pool | undefined;

    try {
      const migrationFiles = (await readdir(migrationsDirectory))
        .filter((fileName) => /^000[1-7]_.+\.sql$/.test(fileName))
        .sort();
      await Promise.all(
        migrationFiles.map((fileName) =>
          copyFile(
            path.join(migrationsDirectory, fileName),
            path.join(previousMigrations, fileName),
          ),
        ),
      );

      await createDatabase(adminPool, upgradeDatabase);
      upgradePool = new Pool({ connectionString: databaseUrl(testDatabaseUrl!, upgradeDatabase) });
      const previousResult = await runMigrations(upgradePool, previousMigrations);
      expect(previousResult.applied).toHaveLength(7);

      await upgradePool.query(
        "INSERT INTO app.tenants (slug, name) VALUES ('upgrade-marker', 'Upgrade Marker')",
      );
      const upgradeResult = await runMigrations(upgradePool, migrationsDirectory);
      expect(upgradeResult.applied).toEqual(['0008_create_runtime_principals']);
      const marker = await upgradePool.query<{ count: string }>(
        "SELECT count(*)::text AS count FROM app.tenants WHERE slug = 'upgrade-marker'",
      );
      expect(marker.rows[0]?.count).toBe('1');
    } finally {
      await upgradePool?.end();
      await dropDatabase(adminPool, upgradeDatabase);
      await rm(previousMigrations, { recursive: true, force: true });
    }
  });

  it('seed phát triển chạy lặp không nhân đôi và bị chặn trong production', async () => {
    const database = createDatabaseClient(pool);
    const first = await seedDevelopmentData(database, { NODE_ENV: 'test' });
    const second = await seedDevelopmentData(database, { NODE_ENV: 'test' });

    expect(second).toEqual(first);
    const counts = await pool.query<{ tenants: string; users: string; memberships: string }>(
      `SELECT
         (SELECT count(*) FROM app.tenants WHERE slug IN ('demo-alpha', 'demo-beta'))::text AS tenants,
         (SELECT count(*) FROM app.users WHERE issuer = 'https://seed.local')::text AS users,
         (SELECT count(*) FROM app.tenant_memberships WHERE tenant_id = ANY($1::uuid[]))::text AS memberships`,
      [first.tenantIds],
    );
    expect(counts.rows[0]).toEqual({ tenants: '2', users: '2', memberships: '2' });
    await expect(seedDevelopmentData(database, { NODE_ENV: 'production' })).rejects.toThrow(
      'Không được chạy seed phát triển trong production',
    );
  });

  it('cô lập dữ liệu cho API, worker và raw SQL không có context', async () => {
    const database = createDatabaseClient(pool);
    const seeded = await seedDevelopmentData(database, { NODE_ENV: 'test' });
    const alpha = { tenantId: seeded.tenantIds[0]!, userId: seeded.userIds[0]! };
    const beta = { tenantId: seeded.tenantIds[1]!, userId: seeded.userIds[1]! };

    await runInTenantTransaction(database, { ...alpha, principal: 'api' }, async (transaction) => {
      await transaction.insert(agents).values({ tenantId: alpha.tenantId, name: 'API Agent' });
    });
    await runInTenantTransaction(
      database,
      { ...beta, principal: 'worker' },
      async (transaction) => {
        await transaction.insert(agents).values({ tenantId: beta.tenantId, name: 'Worker Agent' });
      },
    );

    await runInTenantTransaction(database, { ...alpha, principal: 'api' }, async (transaction) => {
      const visible = await transaction.select().from(agents);
      expect(visible.map(({ name }) => name)).toEqual(['API Agent']);
    });
    await runInTenantTransaction(
      database,
      { ...beta, principal: 'worker' },
      async (transaction) => {
        const visible = await transaction.select().from(agents);
        expect(visible.map(({ name }) => name)).toEqual(['Worker Agent']);
        expect(await transaction.select().from(tenantMemberships)).toHaveLength(1);
      },
    );

    await database.transaction(async (transaction) => {
      await transaction.execute(sql`SET LOCAL ROLE app_api`);
      const rawWithoutContext = await transaction.execute<{ count: string }>(
        sql`SELECT count(*)::text AS count FROM app.agents`,
      );
      expect(rawWithoutContext.rows[0]?.count).toBe('0');
    });
  });
});
