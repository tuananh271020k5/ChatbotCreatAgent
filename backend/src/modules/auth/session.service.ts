import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, lte } from 'drizzle-orm';
import { DATABASE_CLIENT, type DatabaseClient } from '../../database/database.tokens';
import { sessions } from '../../database/schema';
import { AUTH_SESSION_TTL_MS } from './auth.constants';
import type { SessionData } from './auth.types';
import { generateOpaqueToken, hashToken } from './crypto.util';

@Injectable()
export class SessionService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: DatabaseClient) {}

  async createSession(params: {
    userId: string;
    activeTenantId?: string | null;
    userAgent?: string | null;
    ipAddress?: string | null;
  }): Promise<{ token: string; session: SessionData }> {
    const rawToken = generateOpaqueToken(32);
    const tokenHash = hashToken(rawToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + AUTH_SESSION_TTL_MS);

    const [row] = await this.db
      .insert(sessions)
      .values({
        id: tokenHash,
        userId: params.userId,
        activeTenantId: params.activeTenantId ?? null,
        createdAt: now,
        expiresAt,
        lastActiveAt: now,
        userAgent: params.userAgent?.slice(0, 512) ?? null,
        ipAddress: params.ipAddress?.slice(0, 45) ?? null,
      })
      .returning();

    if (!row) {
      throw new Error('Không thể khởi tạo phiên đăng nhập');
    }

    return {
      token: rawToken,
      session: {
        id: row.id,
        userId: row.userId,
        activeTenantId: row.activeTenantId,
        createdAt: row.createdAt,
        expiresAt: row.expiresAt,
        lastActiveAt: row.lastActiveAt,
        userAgent: row.userAgent,
        ipAddress: row.ipAddress,
      },
    };
  }

  async getSessionByToken(rawToken: string): Promise<SessionData | null> {
    const tokenHash = hashToken(rawToken);
    const now = new Date();

    const [row] = await this.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, tokenHash), gt(sessions.expiresAt, now)))
      .limit(1);

    if (!row) return null;

    // Cập nhật lastActiveAt nếu lần trước đó cách hơn 1 phút
    if (now.getTime() - row.lastActiveAt.getTime() > 60_000) {
      await this.db.update(sessions).set({ lastActiveAt: now }).where(eq(sessions.id, tokenHash));
    }

    return {
      id: row.id,
      userId: row.userId,
      activeTenantId: row.activeTenantId,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
      lastActiveAt: row.lastActiveAt,
      userAgent: row.userAgent,
      ipAddress: row.ipAddress,
    };
  }

  async setActiveTenant(rawToken: string, tenantId: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    await this.db
      .update(sessions)
      .set({ activeTenantId: tenantId, lastActiveAt: new Date() })
      .where(eq(sessions.id, tokenHash));
  }

  async revokeSession(rawToken: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    await this.db.delete(sessions).where(eq(sessions.id, tokenHash));
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.userId, userId));
  }

  async cleanupExpiredSessions(): Promise<number> {
    const now = new Date();
    const result = await this.db.delete(sessions).where(lte(sessions.expiresAt, now));
    return result.rowCount ?? 0;
  }
}
