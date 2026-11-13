import type { Pool, PoolClient } from 'pg';
import { MigrationChecksumMismatchError, MigrationExecutionError } from './migration.errors';
import { loadMigrationFiles, type MigrationFile } from './migration-loader';

const migrationLockId = 7_284_031_337;

interface AppliedMigrationRow {
  checksum: string;
}

export interface MigrationResult {
  applied: string[];
  skipped: string[];
}

async function ensureTrackingTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE SCHEMA IF NOT EXISTS infrastructure;
    CREATE TABLE IF NOT EXISTS infrastructure.schema_migrations (
      id text PRIMARY KEY,
      checksum text NOT NULL CHECK (length(checksum) = 64),
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

async function findAppliedMigration(
  client: PoolClient,
  migrationId: string,
): Promise<AppliedMigrationRow | undefined> {
  const result = await client.query<AppliedMigrationRow>(
    'SELECT checksum FROM infrastructure.schema_migrations WHERE id = $1',
    [migrationId],
  );
  return result.rows[0];
}

async function applyMigration(client: PoolClient, migration: MigrationFile): Promise<void> {
  await client.query('BEGIN');
  try {
    await client.query(migration.sql);
    await client.query(
      'INSERT INTO infrastructure.schema_migrations (id, checksum) VALUES ($1, $2)',
      [migration.id, migration.checksum],
    );
    await client.query('COMMIT');
  } catch (cause) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw new MigrationExecutionError(migration.id, { cause });
  }
}

export async function runMigrations(
  pool: Pool,
  migrationsDirectory: string,
): Promise<MigrationResult> {
  const client = await pool.connect();
  let lockAcquired = false;
  const result: MigrationResult = { applied: [], skipped: [] };

  try {
    await client.query('SELECT pg_advisory_lock($1::bigint)', [migrationLockId]);
    lockAcquired = true;
    await ensureTrackingTable(client);

    for (const migration of await loadMigrationFiles(migrationsDirectory)) {
      const appliedMigration = await findAppliedMigration(client, migration.id);
      if (appliedMigration) {
        if (appliedMigration.checksum !== migration.checksum) {
          throw new MigrationChecksumMismatchError(migration.id);
        }
        result.skipped.push(migration.id);
        continue;
      }

      await applyMigration(client, migration);
      result.applied.push(migration.id);
    }

    return result;
  } finally {
    if (lockAcquired) {
      await client
        .query('SELECT pg_advisory_unlock($1::bigint)', [migrationLockId])
        .catch(() => undefined);
    }
    client.release();
  }
}
