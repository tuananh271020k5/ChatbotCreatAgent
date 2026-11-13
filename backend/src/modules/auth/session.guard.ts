import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUTH_SESSION_COOKIE_NAME } from './auth.constants';
import { AuthenticationRequiredException } from './auth.errors';
import type { AuthenticatedUser, SessionData } from './auth.types';
import { IS_PUBLIC_KEY } from './decorators';
import { SessionService } from './session.service';
import { AuthService } from './auth.service';

export interface HttpRequest {
  headers: Record<string, string | string[] | undefined>;
  method: string;
  path: string;
  params: Record<string, string>;
  socket: { remoteAddress?: string };
}

export interface HttpResponse {
  cookie(name: string, value: string, options?: Record<string, unknown>): void;
  clearCookie(name: string, options?: Record<string, unknown>): void;
}

export interface AuthenticatedRequest extends HttpRequest {
  user?: AuthenticatedUser;
  session?: SessionData;
  rawSessionToken?: string;
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessionService: SessionService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // Luôn cho phép endpoint health check đi qua
    if (request.path?.includes('/health/ready')) {
      return true;
    }

    const cookieHeader = request.headers['cookie'];
    const token = this.extractTokenFromCookies(
      typeof cookieHeader === 'string' ? cookieHeader : undefined,
    );

    if (!token) {
      if (isPublic) return true;
      throw new AuthenticationRequiredException();
    }

    const session = await this.sessionService.getSessionByToken(token);
    if (!session) {
      if (isPublic) return true;
      throw new AuthenticationRequiredException('Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
    }

    const profile = await this.authService.getUserProfile(session.userId, session.activeTenantId);

    request.user = profile.user;
    request.session = session;
    request.rawSessionToken = token;

    return true;
  }

  private extractTokenFromCookies(cookieHeader?: string): string | null {
    if (!cookieHeader) return null;
    for (const cookie of cookieHeader.split(';')) {
      const [name, ...rest] = cookie.trim().split('=');
      if (name === AUTH_SESSION_COOKIE_NAME) {
        return decodeURIComponent(rest.join('='));
      }
    }
    return null;
  }
}
