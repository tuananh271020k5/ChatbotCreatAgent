import { describe, expect, it } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { AUTH_CSRF_COOKIE_NAME, AUTH_CSRF_HEADER_NAME } from '../src/modules/auth/auth.constants';
import { CsrfForbiddenException } from '../src/modules/auth/auth.errors';
import { CsrfGuard } from '../src/modules/auth/csrf.guard';

function createMockContext(req: {
  method?: string;
  headers?: Record<string, string | undefined>;
}): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        method: req.method ?? 'GET',
        headers: req.headers ?? {},
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('CsrfGuard', () => {
  const guard = new CsrfGuard();

  it('cho phép các method an toàn (GET, HEAD, OPTIONS)', () => {
    const ctx = createMockContext({ method: 'GET' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('cho phép request POST từ Origin hợp lệ', () => {
    const ctx = createMockContext({
      method: 'POST',
      headers: { origin: 'http://localhost:3000' },
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('cho phép request POST khi double-submit cookie khớp header', () => {
    const ctx = createMockContext({
      method: 'POST',
      headers: {
        [AUTH_CSRF_HEADER_NAME]: 'csrf-secret-123',
        cookie: `${AUTH_CSRF_COOKIE_NAME}=csrf-secret-123; other=val`,
      },
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('từ chối request POST từ Origin lạ hoặc không có token', () => {
    const ctx = createMockContext({
      method: 'POST',
      headers: { origin: 'http://malicious-site.com' },
    });
    expect(() => guard.canActivate(ctx)).toThrow(CsrfForbiddenException);
  });
});
