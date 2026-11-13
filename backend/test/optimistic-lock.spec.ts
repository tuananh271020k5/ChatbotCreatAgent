import { describe, expect, it } from 'vitest';
import {
  OptimisticLockConflictError,
  requireOptimisticUpdate,
} from '../src/database/optimistic-lock';

describe('optimistic lock', () => {
  it('trả đúng bản ghi khi update một dòng', async () => {
    await expect(
      requireOptimisticUpdate('Agent', 2, async () => [{ revision: 3 }]),
    ).resolves.toEqual({
      revision: 3,
    });
  });

  it('báo conflict rõ khi revision đã cũ', async () => {
    await expect(requireOptimisticUpdate('Agent', 2, async () => [])).rejects.toBeInstanceOf(
      OptimisticLockConflictError,
    );
    await expect(requireOptimisticUpdate('Agent', 0, async () => [])).rejects.toThrow(
      'expectedRevision phải là số nguyên dương',
    );
  });
});
