import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MigrationFileError } from '../src/database/migrations/migration.errors';
import { loadMigrationFiles } from '../src/database/migrations/migration-loader';

describe('loadMigrationFiles', () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), 'agent-builder-migrations-'));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('sắp xếp migration và tạo checksum ổn định', async () => {
    await writeFile(path.join(directory, '0002_second.sql'), 'select 2;\n', 'utf8');
    await writeFile(path.join(directory, '0001_first.sql'), 'select 1;\n', 'utf8');

    const migrations = await loadMigrationFiles(directory);

    expect(migrations.map(({ id }) => id)).toEqual(['0001_first', '0002_second']);
    expect(migrations[0]?.checksum).toMatch(/^[a-f0-9]{64}$/);
    await expect(loadMigrationFiles(directory)).resolves.toEqual(migrations);
  });

  it('giữ checksum giống nhau giữa LF và CRLF', async () => {
    const migrationPath = path.join(directory, '0001_line_endings.sql');
    await writeFile(migrationPath, 'select 1;\nselect 2;\n', 'utf8');
    const [lfMigration] = await loadMigrationFiles(directory);

    await writeFile(migrationPath, 'select 1;\r\nselect 2;\r\n', 'utf8');
    const [crlfMigration] = await loadMigrationFiles(directory);

    expect(crlfMigration?.checksum).toBe(lfMigration?.checksum);
  });

  it('từ chối tên sai, thứ tự trùng và file rỗng', async () => {
    await writeFile(path.join(directory, 'migration.sql'), 'select 1;', 'utf8');
    await expect(loadMigrationFiles(directory)).rejects.toBeInstanceOf(MigrationFileError);

    await rm(path.join(directory, 'migration.sql'));
    await writeFile(path.join(directory, '0001_first.sql'), 'select 1;', 'utf8');
    await writeFile(path.join(directory, '0001_duplicate.sql'), 'select 2;', 'utf8');
    await expect(loadMigrationFiles(directory)).rejects.toThrow('Trùng thứ tự migration: 0001');

    await rm(path.join(directory, '0001_duplicate.sql'));
    await writeFile(path.join(directory, '0002_empty.sql'), '  \n', 'utf8');
    await expect(loadMigrationFiles(directory)).rejects.toThrow(
      'Migration không được để trống: 0002_empty.sql',
    );
  });
});
