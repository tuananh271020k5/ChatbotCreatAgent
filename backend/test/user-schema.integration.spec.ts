import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { Pool } from 'pg';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createDatabaseClient } from '../src/database/database.providers';
import { runMigrations } from '../src/database/migrations/migration-runner';
import { users } from '../src/database/schema';

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

describe.runIf(Boolean(testDatabaseUrl))('user schema integration', () => {
  const pool = new Pool({ connectionString: testDatabaseUrl });
  const database = createDatabaseClient(pool);
  const createdIssuers: string[] = [];

  beforeAll(async () => {
    await runMigrations(pool, migrationsDirectory);
  });

  afterEach(async () => {
    if (createdIssuers.length === 0) return;
    await pool.query('DELETE FROM app.users WHERE issuer = ANY($1::text[])', [createdIssuers]);
    createdIssuers.length = 0;
  });

  afterAll(async () => {
    await pool.end();
  });

  function createIssuer(provider: string): string {
    const issuer = `https://${provider}.integration/${randomUUID()}`;
    createdIssuers.push(issuer);
    return issuer;
  }

  it('không tự gộp hai danh tính có cùng email nhưng khác issuer', async () => {
    const email = 'same-email@example.com';
    const createdUsers = await database
      .insert(users)
      .values([
        {
          issuer: createIssuer('first-idp'),
          subject: 'user-1',
          email,
          emailVerified: true,
        },
        {
          issuer: createIssuer('second-idp'),
          subject: 'user-2',
          email,
          emailVerified: true,
        },
      ])
      .returning();

    expect(createdUsers).toHaveLength(2);
    expect(new Set(createdUsers.map(({ id }) => id)).size).toBe(2);
    expect(createdUsers.map(({ email: value }) => value)).toEqual([email, email]);
  });

  it('chặn trùng cặp issuer và subject', async () => {
    const issuer = createIssuer('duplicate-idp');
    await database.insert(users).values({ issuer, subject: 'same-subject' });

    await expectPostgresError(
      pool.query('INSERT INTO app.users (issuer, subject) VALUES ($1, $2)', [
        issuer,
        'same-subject',
      ]),
      '23505',
    );
  });

  it('chặn issuer hoặc subject rỗng và không có cột mật khẩu', async () => {
    await expectPostgresError(
      pool.query('INSERT INTO app.users (issuer, subject) VALUES ($1, $2)', [' ', 'valid-subject']),
      '23514',
    );
    await expectPostgresError(
      pool.query('INSERT INTO app.users (issuer, subject) VALUES ($1, $2)', [
        createIssuer('blank-subject'),
        ' ',
      ]),
      '23514',
    );

    const columns = await pool.query<{ column_name: string }>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'app' AND table_name = 'users'`,
    );
    const columnNames = columns.rows.map(({ column_name }) => column_name);
    expect(columnNames).not.toContain('password');
    expect(columnNames).not.toContain('password_hash');
  });
});
