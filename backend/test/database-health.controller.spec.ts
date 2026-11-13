import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { DatabaseHealthController } from '../src/database/database-health.controller';
import type { DatabaseService } from '../src/database/database.service';

function createController(ready: boolean): DatabaseHealthController {
  const databaseService = {
    isReady: vi.fn().mockResolvedValue(ready),
  } as unknown as DatabaseService;
  return new DatabaseHealthController(databaseService);
}

describe('DatabaseHealthController', () => {
  it('trả trạng thái ready khi PostgreSQL phản hồi', async () => {
    await expect(createController(true).readiness()).resolves.toEqual({
      status: 'ready',
      checks: { database: 'up' },
    });
  });

  it('trả 503 mà không lộ credential khi PostgreSQL lỗi', async () => {
    const error = await createController(false)
      .readiness()
      .catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect((error as ServiceUnavailableException).getStatus()).toBe(503);
    expect((error as ServiceUnavailableException).getResponse()).toEqual({
      status: 'not_ready',
      checks: { database: 'down' },
    });
  });
});
