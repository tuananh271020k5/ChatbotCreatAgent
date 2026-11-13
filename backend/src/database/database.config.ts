import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { DatabaseConfigurationError } from './database.errors';

export interface DatabaseEnvironment {
  DATABASE_URL?: string;
  DATABASE_URL_FILE?: string;
}

export async function resolveDatabaseUrl(
  environment: DatabaseEnvironment = process.env,
): Promise<string> {
  const inlineUrl = environment.DATABASE_URL?.trim();
  const urlFile = environment.DATABASE_URL_FILE?.trim();

  if (inlineUrl && urlFile) {
    throw new DatabaseConfigurationError(
      'Chỉ được cấu hình một trong DATABASE_URL hoặc DATABASE_URL_FILE',
    );
  }

  if (urlFile) {
    let fileValue: string;
    try {
      fileValue = await readFile(urlFile, 'utf8');
    } catch (cause) {
      throw new DatabaseConfigurationError('Không thể đọc DATABASE_URL_FILE', { cause });
    }

    const value = fileValue.trim();
    if (!value) {
      throw new DatabaseConfigurationError('DATABASE_URL_FILE không được để trống');
    }
    return value;
  }

  if (inlineUrl) return inlineUrl;

  throw new DatabaseConfigurationError('Thiếu DATABASE_URL hoặc DATABASE_URL_FILE');
}

export async function createDatabasePool(
  environment: DatabaseEnvironment = process.env,
): Promise<Pool> {
  const connectionString = await resolveDatabaseUrl(environment);
  return new Pool({
    connectionString,
    connectionTimeoutMillis: 5_000,
    application_name: 'ai-agent-builder-api',
  });
}
