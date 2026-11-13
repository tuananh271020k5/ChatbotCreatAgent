import { describe, expect, it } from 'vitest';
import { RateLimiterService } from '../src/modules/auth/rate-limiter.service';

describe('RateLimiterService', () => {
  it('cho phép request khi chưa đạt giới hạn limit', () => {
    const limiter = new RateLimiterService();
    const result1 = limiter.checkLimit('ip:127.0.0.1', 3, 60_000);
    const result2 = limiter.checkLimit('ip:127.0.0.1', 3, 60_000);

    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(2);
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(1);
  });

  it('chặn request khi vượt quá limit trong cùng window', () => {
    const limiter = new RateLimiterService();
    limiter.checkLimit('test-key', 2, 60_000);
    limiter.checkLimit('test-key', 2, 60_000);

    const result = limiter.checkLimit('test-key', 2, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});
