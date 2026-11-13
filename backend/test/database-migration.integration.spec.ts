import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Pool } from 'pg';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { MigrationChecksumMismatchError } from '../src/database/migrations/migration.errors';
import { runMigrations } from '../src/database/migrations/migration-runner';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const defaultMigrationsDirectory = path.resolve(__dirname, '../../database/migrations');

describe.runIf(Boolean(testDatabaseUrl))('migration runner integration', () => {
  const pool = new Pool({ connectionString: testDatabaseUrl });
  const firstMigrationId = '0001_initialize';
  const checksumProbeId = '9999_checksum_probe';
  let temporaryDirectory: string | undefined;

  beforeAll(async () => {
    await runMigrations(pool, defaultMigrationsDirectory);
  });

  afterEach(async () => {
    if (temporaryDirectory) {
      await rm(temporaryDirectory, { recursive: true, force: true });
      temporaryDirectory = undefined;
    }
    await pool.query('DELETE FROM infrastructure.schema_migrations WHERE id = $1', [
      checksumProbeId,
    ]);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('khóa hai runner đồng thời để migration chỉ được ghi một lần', async () => {
    await pool.query('DELETE FROM infrastructure.schema_migrations WHERE id = $1', [
      firstMigrationId,
    ]);

    const results = await Promise.all([
      runMigrations(pool, defaultMigrationsDirectory),
      runMigrations(pool, defaultMigrationsDirectory),
    ]);
    const countResult = await pool.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM infrastructure.schema_migrations WHERE id = $1',
      [firstMigrationId],
    );

    expect(results.flatMap(({ applied }) => applied)).toEqual([firstMigrationId]);
    expect(countResult.rows[0]?.count).toBe('1');
  });

  it('dừng khi checksum của migration đã áp dụng bị thay đổi', async () => {
    temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'agent-builder-checksum-'));
    const migrationPath = path.join(temporaryDirectory, `${checksumProbeId}.sql`);
    await writeFile(migrationPath, 'select 1;\n', 'utf8');
    await runMigrations(pool, temporaryDirectory);
    await writeFile(migrationPath, 'select 2;\n', 'utf8');

    await expect(runMigrations(pool, temporaryDirectory)).rejects.toBeInstanceOf(
      MigrationChecksumMismatchError,
    );
  });
});
