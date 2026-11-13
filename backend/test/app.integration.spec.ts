import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';

describe('AppModule', () => {
  let application: INestApplication | undefined;

  afterEach(async () => {
    await application?.close();
  });

  it('khởi tạo và đóng ứng dụng thành công', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    application = moduleRef.createNestApplication();
    await application.init();

    expect(application.get(AppModule)).toBeInstanceOf(AppModule);
  });
});
