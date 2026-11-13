import type { TenantTransaction } from './tenant-transaction';

const defaultPageSize = 20;
const maximumPageSize = 100;

export interface CursorPageRequest {
  cursor?: string;
  limit?: number;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export interface StableCursor {
  createdAt: string;
  id: string;
}

export interface NormalizedCursorPageRequest {
  cursor: StableCursor | null;
  limit: number;
}

export abstract class TenantScopedRepository {
  protected constructor(
    protected readonly transaction: TenantTransaction,
    protected readonly tenantId: string,
  ) {}
}

export function encodeCursor(cursor: StableCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function normalizeCursorPageRequest(
  request: CursorPageRequest = {},
): NormalizedCursorPageRequest {
  const limit = request.limit ?? defaultPageSize;
  if (!Number.isInteger(limit) || limit < 1 || limit > maximumPageSize) {
    throw new RangeError(`limit phải là số nguyên từ 1 đến ${maximumPageSize}`);
  }

  return {
    cursor: request.cursor ? decodeCursor(request.cursor) : null,
    limit,
  };
}

function decodeCursor(encoded: string): StableCursor {
  try {
    const value: unknown = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!isStableCursor(value)) throw new TypeError('Cấu trúc cursor không hợp lệ');
    return value;
  } catch (cause) {
    throw new TypeError('Cursor không hợp lệ', { cause });
  }
}

function isStableCursor(value: unknown): value is StableCursor {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<StableCursor>;
  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    typeof candidate.createdAt === 'string' &&
    !Number.isNaN(Date.parse(candidate.createdAt))
  );
}
