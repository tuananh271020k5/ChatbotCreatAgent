import path from 'node:path';
import { createDatabasePool } from '../database.config';
import { createDatabaseClient } from '../database.providers';
import { runMigrations } from '../migrations/migration-runner';
import { seedDevelopmentData } from './development-seed';

const migrationsDirectory = path.resolve(__dirname, '../../../../../database/migrations');

async function main(): Promise<void> {
  const pool = await createDatabasePool();
  try {
    await runMigrations(pool, migrationsDirectory);
    const result = await seedDevelopmentData(createDatabaseClient(pool));
    console.log(
      `Seed hoàn tất: ${result.tenantIds.length} tenant và ${result.userIds.length} user.`,
    );
  } finally {
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Seed thất bại');
  process.exitCode = 1;
});
