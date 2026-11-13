import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import { afterEach, describe, expect, it } from 'vitest';
import { createDatabaseClient } from '../src/database/database.providers';
import { DatabaseService } from '../src/database/database.service';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe.runIf(Boolean(testDatabaseUrl))('PostgreSQL integration', () => {
  let service: DatabaseService | undefined;

  afterEach(async () => {
    await service?.onApplicationShutdown();
    service = undefined;
  });

  it('kết nối bằng pool và thực thi query qua Drizzle', async () => {
    const pool = new Pool({ connectionString: testDatabaseUrl });
    service = new DatabaseService(pool);
    const database = createDatabaseClient(pool);

    await service.onModuleInit();
    const result = await database.execute<{ value: number }>(sql`select 1 as value`);

    expect(result.rows).toEqual([{ value: 1 }]);
    await expect(service.isReady()).resolves.toBe(true);
  });
});
