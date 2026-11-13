import path from 'node:path';
import { createDatabasePool } from '../database.config';
import { runMigrations } from './migration-runner';

const defaultMigrationsDirectory = path.resolve(__dirname, '../../../../database/migrations');

async function main(): Promise<void> {
  const pool = await createDatabasePool();
  try {
    const result = await runMigrations(
      pool,
      process.env.MIGRATIONS_DIR?.trim() || defaultMigrationsDirectory,
    );
    console.log(
      `Migration hoàn tất: ${result.applied.length} đã áp dụng, ${result.skipped.length} đã bỏ qua.`,
    );
  } finally {
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Migration thất bại');
  process.exitCode = 1;
});
