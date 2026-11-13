import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { DatabaseUnavailableError } from '../src/database/database.errors';
import { DatabaseService } from '../src/database/database.service';

function createPoolMock() {
  const query = vi.fn().mockResolvedValue({ rows: [{ value: 1 }] });
  const end = vi.fn().mockResolvedValue(undefined);
  const on = vi.fn();
  const off = vi.fn();
  const pool = { query, end, on, off } as unknown as Pool;
  return { pool, query, end, on, off };
}

describe('DatabaseService', () => {
  it('kiểm tra kết nối khi module khởi tạo và đóng pool đúng một lần', async () => {
    const { pool, query, end, on, off } = createPoolMock();
    const service = new DatabaseService(pool);

    await service.onModuleInit();
    await service.onApplicationShutdown();
    await service.onApplicationShutdown();

    expect(query).toHaveBeenCalledWith('select 1');
    expect(on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(off).toHaveBeenCalledWith('error', expect.any(Function));
    expect(end).toHaveBeenCalledTimes(1);
  });

  it('đóng pool và trả lỗi an toàn khi kết nối ban đầu thất bại', async () => {
    const { pool, query, end } = createPoolMock();
    query.mockRejectedValueOnce(new Error('credential=khong-duoc-lo'));
    const service = new DatabaseService(pool);

    await expect(service.onModuleInit()).rejects.toEqual(
      expect.objectContaining<Partial<DatabaseUnavailableError>>({
        name: 'DatabaseUnavailableError',
        message: 'Không thể kết nối tới PostgreSQL',
      }),
    );
    expect(end).toHaveBeenCalledTimes(1);
  });

  it('báo readiness false khi query lỗi hoặc pool đã đóng', async () => {
    const { pool, query } = createPoolMock();
    const service = new DatabaseService(pool);

    query.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(service.isReady()).resolves.toBe(false);

    await service.onApplicationShutdown();
    await expect(service.isReady()).resolves.toBe(false);
  });
});
