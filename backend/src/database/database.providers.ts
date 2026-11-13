import type { Provider } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import { createDatabasePool } from './database.config';
import * as schema from './schema';
import { DATABASE_CLIENT, DATABASE_POOL, type DatabaseClient } from './database.tokens';

export function createDatabaseClient(pool: Pool): DatabaseClient {
  return drizzle(pool, { schema });
}

export const databaseProviders: Provider[] = [
  {
    provide: DATABASE_POOL,
    useFactory: createDatabasePool,
  },
  {
    provide: DATABASE_CLIENT,
    inject: [DATABASE_POOL],
    useFactory: createDatabaseClient,
  },
];
