import { describe, expect, it } from 'vitest';
import { encodeCursor, normalizeCursorPageRequest } from '../src/database/tenant-repository';

describe('tenant repository pagination', () => {
  it('chuẩn hóa giới hạn và giải mã cursor ổn định', () => {
    const cursor = { createdAt: '2026-01-02T03:04:05.000Z', id: 'item-01' };

    expect(normalizeCursorPageRequest({ cursor: encodeCursor(cursor), limit: 50 })).toEqual({
      cursor,
      limit: 50,
    });
    expect(normalizeCursorPageRequest()).toEqual({ cursor: null, limit: 20 });
  });

  it('từ chối limit và cursor không hợp lệ', () => {
    expect(() => normalizeCursorPageRequest({ limit: 0 })).toThrow('limit phải là số nguyên');
    expect(() => normalizeCursorPageRequest({ limit: 101 })).toThrow('limit phải là số nguyên');
    expect(() => normalizeCursorPageRequest({ cursor: 'khong-hop-le' })).toThrow(
      'Cursor không hợp lệ',
    );
  });
});
