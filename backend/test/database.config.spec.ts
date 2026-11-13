import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveDatabaseUrl } from '../src/database/database.config';
import { DatabaseConfigurationError } from '../src/database/database.errors';

describe('resolveDatabaseUrl', () => {
  let temporaryDirectory: string | undefined;

  afterEach(async () => {
    if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
    temporaryDirectory = undefined;
  });

  it('đọc URL trực tiếp từ environment', async () => {
    await expect(resolveDatabaseUrl({ DATABASE_URL: '  postgresql://example  ' })).resolves.toBe(
      'postgresql://example',
    );
  });

  it('đọc URL từ file secret', async () => {
    temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'agent-builder-database-'));
    const secretPath = path.join(temporaryDirectory, 'database-url');
    await writeFile(secretPath, 'postgresql://from-file\n', 'utf8');

    await expect(resolveDatabaseUrl({ DATABASE_URL_FILE: secretPath })).resolves.toBe(
      'postgresql://from-file',
    );
  });

  it('từ chối cấu hình mơ hồ hoặc bị thiếu', async () => {
    await expect(
      resolveDatabaseUrl({
        DATABASE_URL: 'postgresql://inline',
        DATABASE_URL_FILE: 'database-url',
      }),
    ).rejects.toBeInstanceOf(DatabaseConfigurationError);
    await expect(resolveDatabaseUrl({})).rejects.toThrow(
      'Thiếu DATABASE_URL hoặc DATABASE_URL_FILE',
    );
  });

  it('không đưa đường dẫn hoặc credential vào thông báo khi đọc file lỗi', async () => {
    const secretPath = path.join(tmpdir(), 'secret-does-not-exist');

    await expect(resolveDatabaseUrl({ DATABASE_URL_FILE: secretPath })).rejects.toThrow(
      'Không thể đọc DATABASE_URL_FILE',
    );
  });
});
