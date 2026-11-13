import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { Pool } from 'pg';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createDatabaseClient } from '../src/database/database.providers';
import { runMigrations } from '../src/database/migrations/migration-runner';
import { tenants } from '../src/database/schema';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const migrationsDirectory = path.resolve(__dirname, '../../database/migrations');

async function expectPostgresError(promise: Promise<unknown>, code: string): Promise<void> {
  try {
    await promise;
    throw new Error(`Câu lệnh phải thất bại với PostgreSQL code ${code}`);
  } catch (error) {
    expect(error).toMatchObject({ code });
  }
}

describe.runIf(Boolean(testDatabaseUrl))('tenant schema integration', () => {
  const pool = new Pool({ connectionString: testDatabaseUrl });
  const database = createDatabaseClient(pool);
  const createdSlugs: string[] = [];

  beforeAll(async () => {
    await runMigrations(pool, migrationsDirectory);
  });

  afterEach(async () => {
    if (createdSlugs.length === 0) return;
    await pool.query('DELETE FROM app.tenants WHERE slug = ANY($1::text[])', [createdSlugs]);
    createdSlugs.length = 0;
  });

  afterAll(async () => {
    await pool.end();
  });

  function createSlug(suffix: string): string {
    const slug = `integration-${suffix}-${randomUUID().slice(0, 8)}`;
    createdSlugs.push(slug);
    return slug;
  }

  it('tạo tenant active với UUID và timestamps mặc định', async () => {
    const slug = createSlug('valid');
    const [tenant] = await database
      .insert(tenants)
      .values({ slug, name: 'Tenant tích hợp' })
      .returning();

    expect(tenant).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        slug,
        name: 'Tenant tích hợp',
        status: 'active',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        archivedAt: null,
      }),
    );
  });

  it('chặn slug trùng và slug sai định dạng', async () => {
    const slug = createSlug('unique');
    await database.insert(tenants).values({ slug, name: 'Tenant đầu tiên' });

    await expectPostgresError(
      pool.query('INSERT INTO app.tenants (slug, name) VALUES ($1, $2)', [slug, 'Tenant trùng']),
      '23505',
    );
    await expectPostgresError(
      pool.query('INSERT INTO app.tenants (slug, name) VALUES ($1, $2)', [
        'Slug Không Hợp Lệ',
        'Tenant lỗi',
      ]),
      '23514',
    );
  });

  it('chặn trạng thái sai và archived thiếu thời điểm', async () => {
    await expectPostgresError(
      pool.query('INSERT INTO app.tenants (slug, name, status) VALUES ($1, $2, $3)', [
        createSlug('bad-status'),
        'Tenant lỗi',
        'unknown',
      ]),
      '22P02',
    );
    await expectPostgresError(
      pool.query('INSERT INTO app.tenants (slug, name, status) VALUES ($1, $2, $3)', [
        createSlug('bad-archive'),
        'Tenant lỗi',
        'archived',
      ]),
      '23514',
    );
  });
});
