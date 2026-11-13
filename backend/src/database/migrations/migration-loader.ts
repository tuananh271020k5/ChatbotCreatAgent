import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { MigrationFileError } from './migration.errors';

const migrationFilePattern = /^(?<sequence>\d{4})_[a-z0-9]+(?:_[a-z0-9]+)*\.sql$/;

export interface MigrationFile {
  id: string;
  checksum: string;
  sql: string;
}

export async function loadMigrationFiles(directory: string): Promise<MigrationFile[]> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (cause) {
    throw new MigrationFileError('Không thể đọc thư mục migration', { cause });
  }

  const sqlEntries = entries
    .filter((entry) => entry.isFile() && path.extname(entry.name) === '.sql')
    .sort((left, right) => left.name.localeCompare(right.name));
  const seenSequences = new Set<string>();
  const migrations: MigrationFile[] = [];

  for (const entry of sqlEntries) {
    const match = migrationFilePattern.exec(entry.name);
    const sequence = match?.groups?.sequence;
    if (!sequence) {
      throw new MigrationFileError(`Tên migration không hợp lệ: ${entry.name}`);
    }
    if (seenSequences.has(sequence)) {
      throw new MigrationFileError(`Trùng thứ tự migration: ${sequence}`);
    }
    seenSequences.add(sequence);

    const sql = await readFile(path.join(directory, entry.name), 'utf8');
    if (!sql.trim()) {
      throw new MigrationFileError(`Migration không được để trống: ${entry.name}`);
    }

    migrations.push({
      id: path.basename(entry.name, '.sql'),
      checksum: createHash('sha256').update(sql).digest('hex'),
      sql,
    });
  }

  return migrations;
}
