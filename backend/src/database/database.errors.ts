export class DatabaseConfigurationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'DatabaseConfigurationError';
  }
}

export class DatabaseUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super('Không thể kết nối tới PostgreSQL', options);
    this.name = 'DatabaseUnavailableError';
  }
}
