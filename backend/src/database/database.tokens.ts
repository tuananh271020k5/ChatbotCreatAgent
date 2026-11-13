import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

export const DATABASE_POOL = Symbol('DATABASE_POOL');
export const DATABASE_CLIENT = Symbol('DATABASE_CLIENT');

export type DatabaseClient = NodePgDatabase<Record<string, never>>;
