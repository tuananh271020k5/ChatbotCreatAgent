import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { AUTH_CSRF_COOKIE_NAME, AUTH_CSRF_HEADER_NAME, DEFAULT_WEB_URL } from './auth.constants';
import { CsrfForbiddenException } from './auth.errors';
import type { HttpRequest } from './session.guard';

@Injectable()
export class CsrfGuard implements CanActivate {
  private get allowedOrigins(): Set<string> {
    const origins = new Set<string>(['http://localhost:3000', 'http://127.0.0.1:3000']);

    const configuredWebUrl = process.env.WEB_URL ?? process.env.FRONTEND_URL ?? DEFAULT_WEB_URL;
    if (configuredWebUrl) {
      try {
        origins.add(new URL(configuredWebUrl).origin);
      } catch {
        origins.add(configuredWebUrl.replace(/\/+$/, ''));
      }
    }

    const trustedOrigins = (process.env.CSRF_TRUSTED_ORIGINS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    for (const rawOrigin of trustedOrigins) {
      try {
        origins.add(new URL(rawOrigin).origin);
      } catch {
        origins.add(rawOrigin.replace(/\/+$/, ''));
      }
    }

    return origins;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<HttpRequest>();
    const method = (request.method || 'GET').toUpperCase();

    // Các request an toàn (GET, HEAD, OPTIONS) không cần kiểm tra CSRF
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    // 1. Kiểm tra Origin hoặc Referer header
    const origin = request.headers['origin'];
    const referer = request.headers['referer'];

    if (typeof origin === 'string') {
      try {
        const originUrl = new URL(origin).origin;
        if (this.allowedOrigins.has(originUrl)) {
          return true;
        }
      } catch {
        // origin không hợp lệ
      }
    }

    if (typeof referer === 'string') {
      try {
        const refererUrl = new URL(referer).origin;
        if (this.allowedOrigins.has(refererUrl)) {
          return true;
        }
      } catch {
        // referer không hợp lệ
      }
    }

    // 2. Double-submit cookie check (nếu client gửi x-csrf-token)
    const headerCsrf = request.headers[AUTH_CSRF_HEADER_NAME];
    const cookieHeader = request.headers['cookie'];

    if (typeof headerCsrf === 'string' && typeof cookieHeader === 'string') {
      const cookies = this.parseCookies(cookieHeader);
      const cookieCsrf = cookies[AUTH_CSRF_COOKIE_NAME];
      if (cookieCsrf && cookieCsrf === headerCsrf) {
        return true;
      }
    }

    throw new CsrfForbiddenException();
  }

  private parseCookies(cookieHeader: string): Record<string, string> {
    const list: Record<string, string> = {};
    for (const cookie of cookieHeader.split(';')) {
      const [name, ...rest] = cookie.trim().split('=');
      if (name) {
        list[name] = decodeURIComponent(rest.join('='));
      }
    }
    return list;
  }
}
