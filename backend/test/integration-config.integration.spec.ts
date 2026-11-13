import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { Pool } from 'pg';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createDatabaseClient } from '../src/database/database.providers';
import { runMigrations } from '../src/database/migrations/migration-runner';
import {
  aiModels,
  aiProviders,
  mcpServers,
  mcpTools,
  secretReferences,
  tenants,
  users,
} from '../src/database/schema';
import { runInTenantTransaction } from '../src/database/tenant-transaction';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const migrationsDirectory = path.resolve(__dirname, '../../database/migrations');

async function expectPostgresError(promise: Promise<unknown>, code: string): Promise<void> {
  try {
    await promise;
    throw new Error(`Câu lệnh phải thất bại với PostgreSQL code ${code}`);
  } catch (error) {
    const databaseError = error as { code?: string; cause?: { code?: string } };
    expect(databaseError.code ?? databaseError.cause?.code).toBe(code);
  }
}

describe.runIf(Boolean(testDatabaseUrl))('integration configuration schema', () => {
  const pool = new Pool({ connectionString: testDatabaseUrl });
  const database = createDatabaseClient(pool);
  const tenantIds: string[] = [];
  const userIds: string[] = [];

  beforeAll(async () => {
    await runMigrations(pool, migrationsDirectory);
  });

  afterEach(async () => {
    if (tenantIds.length > 0) {
      await pool.query('DELETE FROM app.tenants WHERE id = ANY($1::uuid[])', [tenantIds]);
    }
    if (userIds.length > 0) {
      await pool.query('DELETE FROM app.users WHERE id = ANY($1::uuid[])', [userIds]);
    }
    tenantIds.length = 0;
    userIds.length = 0;
  });

  afterAll(async () => {
    await pool.end();
  });

  async function createContext(label: string): Promise<{ tenantId: string; userId: string }> {
    const suffix = randomUUID();
    const [tenant] = await database
      .insert(tenants)
      .values({ slug: `${label}-${suffix.slice(0, 8)}`, name: `Tenant ${label}` })
      .returning({ id: tenants.id });
    const [user] = await database
      .insert(users)
      .values({ issuer: `https://${label}.integration/${suffix}`, subject: suffix })
      .returning({ id: users.id });
    tenantIds.push(tenant.id);
    userIds.push(user.id);
    return { tenantId: tenant.id, userId: user.id };
  }

  async function createSecret(context: { tenantId: string; userId: string }): Promise<string> {
    return runInTenantTransaction(database, context, async (transaction) => {
      const [secret] = await transaction
        .insert(secretReferences)
        .values({
          tenantId: context.tenantId,
          ownerType: 'provider',
          ownerId: randomUUID(),
          name: 'api-credential',
          ciphertext: Buffer.alloc(32, 7),
          nonce: Buffer.alloc(12, 3),
          keyId: 'local-development-key',
        })
        .returning({ id: secretReferences.id });
      return secret.id;
    });
  }

  it('lưu cấu hình provider, model và snapshot MCP không chứa plaintext secret', async () => {
    const context = await createContext('integration-config');
    const secretReferenceId = await createSecret(context);

    await runInTenantTransaction(database, context, async (transaction) => {
      const [provider] = await transaction
        .insert(aiProviders)
        .values({
          tenantId: context.tenantId,
          secretReferenceId,
          code: 'openai',
          name: 'OpenAI',
          config: { organization: 'example' },
        })
        .returning({ id: aiProviders.id });
      await transaction.insert(aiModels).values({
        tenantId: context.tenantId,
        providerId: provider.id,
        modelKey: 'gpt-example',
        displayName: 'GPT Example',
        capabilities: ['chat', 'tool_calling'],
      });

      const [server] = await transaction
        .insert(mcpServers)
        .values({
          tenantId: context.tenantId,
          secretReferenceId,
          name: 'GitHub MCP',
          transport: 'streamable_http',
          config: { url: 'https://mcp.example.test' },
        })
        .returning({ id: mcpServers.id });
      await transaction.insert(mcpTools).values({
        tenantId: context.tenantId,
        serverId: server.id,
        name: 'search_code',
        inputSchema: { type: 'object' },
        snapshotHash: 'a'.repeat(64),
      });

      expect(await transaction.select().from(aiModels)).toHaveLength(1);
      expect(await transaction.select().from(mcpTools)).toHaveLength(1);
    });

    const columns = await pool.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'app' AND table_name = 'secret_references'`,
    );
    expect(columns.rows.map(({ column_name }) => column_name)).not.toEqual(
      expect.arrayContaining(['plaintext', 'api_key', 'token', 'password']),
    );
  });

  it('chặn tham chiếu secret khác tenant', async () => {
    const first = await createContext('secret-owner');
    const second = await createContext('provider-owner');
    const secretReferenceId = await createSecret(first);

    await runInTenantTransaction(database, second, async (transaction) => {
      await expectPostgresError(
        transaction.insert(aiProviders).values({
          tenantId: second.tenantId,
          secretReferenceId,
          code: 'foreign-secret',
          name: 'Provider sai tenant',
        }),
        '23503',
      );
    });
  });

  it('chặn ciphertext, capability và config có secret không hợp lệ', async () => {
    const context = await createContext('invalid-config');

    await runInTenantTransaction(database, context, async (transaction) => {
      await expectPostgresError(
        transaction.insert(secretReferences).values({
          tenantId: context.tenantId,
          ownerType: 'provider',
          ownerId: randomUUID(),
          name: 'nonce-sai',
          ciphertext: Buffer.alloc(32),
          nonce: Buffer.alloc(8),
          keyId: 'key-id',
        }),
        '23514',
      );
    });

    await runInTenantTransaction(database, context, async (transaction) => {
      await expectPostgresError(
        transaction.insert(aiProviders).values({
          tenantId: context.tenantId,
          code: 'plaintext-secret',
          name: 'Provider có key thô',
          config: { apiKey: 'khong-duoc-luu' },
        }),
        '23514',
      );
    });

    const providerId = await runInTenantTransaction(database, context, async (transaction) => {
      const [provider] = await transaction
        .insert(aiProviders)
        .values({ tenantId: context.tenantId, code: 'valid', name: 'Provider hợp lệ' })
        .returning({ id: aiProviders.id });
      return provider.id;
    });

    await runInTenantTransaction(database, context, async (transaction) => {
      await expectPostgresError(
        transaction.insert(aiModels).values({
          tenantId: context.tenantId,
          providerId,
          modelKey: 'invalid-capability',
          displayName: 'Model lỗi',
          capabilities: ['khong-hop-le'],
        }),
        '23514',
      );
    });

    await runInTenantTransaction(database, context, async (transaction) => {
      await expectPostgresError(
        transaction.insert(mcpServers).values({
          tenantId: context.tenantId,
          name: 'MCP có token thô',
          transport: 'sse',
          config: { token: 'khong-duoc-luu' },
        }),
        '23514',
      );
    });
  });
});
