import { Test } from '@nestjs/testing';
import type { Pool } from 'pg';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { DATABASE_CLIENT, DATABASE_POOL } from '../src/database';

describe('AppModule', () => {
  let application: INestApplication | undefined;

  afterEach(async () => {
    await application?.close();
  });

  it('khởi tạo và đóng ứng dụng thành công', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ value: 1 }] });
    const end = vi.fn().mockResolvedValue(undefined);
    const pool = {
      query,
      end,
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as Pool;
    const testingModule = Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DATABASE_POOL)
      .useValue(pool)
      .overrideProvider(DATABASE_CLIENT)
      .useValue({});
    const moduleRef = await testingModule.compile();

    application = moduleRef.createNestApplication();
    await application.init();

    expect(application.get(AppModule)).toBeInstanceOf(AppModule);
    expect(query).toHaveBeenCalledWith('select 1');

    await application.close();
    application = undefined;
    expect(end).toHaveBeenCalledTimes(1);
  });
});
