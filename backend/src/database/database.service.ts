import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import type { Pool } from 'pg';
import { DatabaseUnavailableError } from './database.errors';
import { DATABASE_POOL } from './database.tokens';

@Injectable()
export class DatabaseService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseService.name);
  private closed = false;
  private readonly handlePoolError = (): void => {
    this.logger.error('PostgreSQL pool mất kết nối nền');
  };

  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {
    this.pool.on('error', this.handlePoolError);
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.pool.query('select 1');
    } catch (cause) {
      await this.close().catch(() => undefined);
      throw new DatabaseUnavailableError({ cause });
    }
  }

  async isReady(): Promise<boolean> {
    if (this.closed) return false;

    try {
      await this.pool.query('select 1');
      return true;
    } catch {
      return false;
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.close();
  }

  private async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.pool.off('error', this.handlePoolError);
    await this.pool.end();
  }
}
