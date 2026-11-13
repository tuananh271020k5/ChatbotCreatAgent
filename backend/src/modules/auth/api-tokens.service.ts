import { Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { DATABASE_CLIENT, type DatabaseClient } from '../../database/database.tokens';
import { apiTokens } from '../../database/schema';
import { generateOpaqueToken, hashToken } from './crypto.util';

export interface ApiTokenValidationResult {
  id: string;
  tenantId: string;
  name: string;
  scopes: string[];
  createdBy: string;
}

@Injectable()
export class ApiTokensService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: DatabaseClient) {}

  async createToken(params: {
    tenantId: string;
    name: string;
    scopes: string[];
    createdByUserId: string;
    expiresInDays?: number;
  }): Promise<{ id: string; rawToken: string }> {
    const rawSecret = generateOpaqueToken(32);
    const rawToken = `agb_live_${rawSecret}`;
    const tokenHash = hashToken(rawToken);

    const now = new Date();
    const expiresAt = params.expiresInDays
      ? new Date(now.getTime() + params.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const [row] = await this.db
      .insert(apiTokens)
      .values({
        tenantId: params.tenantId,
        name: params.name.trim(),
        tokenHash,
        scopes: params.scopes,
        createdBy: params.createdByUserId,
        createdAt: now,
        expiresAt,
      })
      .returning();

    if (!row) {
      throw new Error('Không thể khởi tạo API token');
    }

    return {
      id: row.id,
      rawToken,
    };
  }

  async validateToken(rawToken: string): Promise<ApiTokenValidationResult> {
    const tokenHash = hashToken(rawToken);
    const now = new Date();

    const [row] = await this.db
      .select()
      .from(apiTokens)
      .where(and(eq(apiTokens.tokenHash, tokenHash), isNull(apiTokens.revokedAt)))
      .limit(1);

    if (!row) {
      throw new UnauthorizedException('API token không hợp lệ hoặc đã bị thu hồi');
    }

    if (row.expiresAt && row.expiresAt < now) {
      throw new UnauthorizedException('API token đã hết hạn');
    }

    // Cập nhật lastUsedAt
    await this.db.update(apiTokens).set({ lastUsedAt: now }).where(eq(apiTokens.id, row.id));

    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      scopes: row.scopes,
      createdBy: row.createdBy,
    };
  }

  async revokeToken(tokenId: string, tenantId: string): Promise<void> {
    const result = await this.db
      .update(apiTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(apiTokens.id, tokenId), eq(apiTokens.tenantId, tenantId)));

    if (result.rowCount === 0) {
      throw new NotFoundException('Không tìm thấy token để thu hồi');
    }
  }

  async listTokens(tenantId: string) {
    return this.db
      .select({
        id: apiTokens.id,
        name: apiTokens.name,
        scopes: apiTokens.scopes,
        createdAt: apiTokens.createdAt,
        expiresAt: apiTokens.expiresAt,
        lastUsedAt: apiTokens.lastUsedAt,
        revokedAt: apiTokens.revokedAt,
      })
      .from(apiTokens)
      .where(eq(apiTokens.tenantId, tenantId));
  }
}
