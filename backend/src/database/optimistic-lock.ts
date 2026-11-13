export class OptimisticLockConflictError extends Error {
  constructor(entityName: string, expectedRevision: number) {
    super(`${entityName} đã thay đổi kể từ revision ${expectedRevision}`);
    this.name = 'OptimisticLockConflictError';
  }
}

export async function requireOptimisticUpdate<T>(
  entityName: string,
  expectedRevision: number,
  update: () => Promise<readonly T[]>,
): Promise<T> {
  if (!Number.isInteger(expectedRevision) || expectedRevision < 1) {
    throw new RangeError('expectedRevision phải là số nguyên dương');
  }

  const updatedRows = await update();
  if (updatedRows.length !== 1) {
    throw new OptimisticLockConflictError(entityName, expectedRevision);
  }
  return updatedRows[0]!;
}
