import {
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { HttpRequest } from './session.guard';

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export const RATE_LIMIT_KEY = 'rateLimitOptions';
export const RateLimit = (limit: number, windowMs = 60_000) =>
  SetMetadata(RATE_LIMIT_KEY, { limit, windowMs });

interface WindowRecord {
  timestamps: number[];
}

@Injectable()
export class RateLimiterService {
  private readonly windows = new Map<string, WindowRecord>();

  checkLimit(
    key: string,
    limit: number,
    windowMs: number,
  ): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const windowStart = now - windowMs;

    let record = this.windows.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.windows.set(key, record);
    }

    // Lọc bỏ các timestamp ngoài window
    record.timestamps = record.timestamps.filter((t) => t > windowStart);

    if (record.timestamps.length >= limit) {
      return { allowed: false, remaining: 0 };
    }

    record.timestamps.push(now);
    return {
      allowed: true,
      remaining: limit - record.timestamps.length,
    };
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.windows.entries()) {
      record.timestamps = record.timestamps.filter((t) => now - t < 300_000);
      if (record.timestamps.length === 0) {
        this.windows.delete(key);
      }
    }
  }
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimiter: RateLimiterService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!options) return true;

    const request = context.switchToHttp().getRequest<HttpRequest>();
    const clientIp =
      (request.headers['x-real-ip'] as string) ?? request.socket?.remoteAddress ?? 'unknown-ip';

    const route = request.path || '/';
    const key = `${clientIp}:${route}`;

    const { allowed } = this.rateLimiter.checkLimit(key, options.limit, options.windowMs);

    if (!allowed) {
      throw new HttpException(
        'Đã vượt quá giới hạn tần suất yêu cầu. Vui lòng thử lại sau.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
