export class MigrationFileError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'MigrationFileError';
  }
}

export class MigrationChecksumMismatchError extends Error {
  constructor(migrationId: string) {
    super(`Checksum không khớp cho migration đã áp dụng: ${migrationId}`);
    this.name = 'MigrationChecksumMismatchError';
  }
}

export class MigrationExecutionError extends Error {
  constructor(migrationId: string, options?: ErrorOptions) {
    super(`Không thể áp dụng migration: ${migrationId}`, options);
    this.name = 'MigrationExecutionError';
  }
}
