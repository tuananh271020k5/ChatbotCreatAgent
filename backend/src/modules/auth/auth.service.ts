import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DATABASE_CLIENT, type DatabaseClient } from '../../database/database.tokens';
import {
  membershipRoles,
  permissions,
  rolePermissions,
  roles,
  tenantMemberships,
  tenants,
  users,
} from '../../database/schema';
import { TenantAccessForbiddenException, TenantSuspendedException } from './auth.errors';
import type {
  AuthenticatedUser,
  CurrentUserProfile,
  OidcTokenPayload,
  UserMembershipDetail,
} from './auth.types';
import { OidcService } from './oidc.service';
import { SessionService } from './session.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: DatabaseClient,
    private readonly sessionService: SessionService,
    private readonly oidcService: OidcService,
  ) {}

  async upsertUserFromOidc(claims: OidcTokenPayload): Promise<AuthenticatedUser> {
    const issuer = claims.iss;
    const subject = claims.sub;
    const email = claims.email ?? null;
    const emailVerified = Boolean(claims.email_verified);
    const displayName = claims.name ?? claims.preferred_username ?? null;
    const now = new Date();

    const [existing] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.issuer, issuer), eq(users.subject, subject)))
      .limit(1);

    if (existing) {
      const [updated] = await this.db
        .update(users)
        .set({
          displayName: displayName ?? existing.displayName,
          email: emailVerified ? email : existing.email,
          emailVerified: emailVerified || existing.emailVerified,
          lastAuthenticatedAt: now,
          updatedAt: now,
        })
        .where(eq(users.id, existing.id))
        .returning();

      if (!updated) {
        throw new Error('Không thể cập nhật thông tin người dùng');
      }

      return {
        id: updated.id,
        issuer: updated.issuer,
        subject: updated.subject,
        email: updated.email,
        emailVerified: updated.emailVerified,
        displayName: updated.displayName,
      };
    }

    const [created] = await this.db
      .insert(users)
      .values({
        issuer,
        subject,
        email,
        emailVerified,
        displayName,
        createdAt: now,
        updatedAt: now,
        lastAuthenticatedAt: now,
      })
      .returning();

    if (!created) {
      throw new Error('Không thể tạo người dùng mới');
    }

    return {
      id: created.id,
      issuer: created.issuer,
      subject: created.subject,
      email: created.email,
      emailVerified: created.emailVerified,
      displayName: created.displayName,
    };
  }

  async getUserMemberships(userId: string): Promise<UserMembershipDetail[]> {
    const membershipRows = await this.db
      .select({
        membershipId: tenantMemberships.id,
        membershipStatus: tenantMemberships.status,
        tenantId: tenants.id,
        tenantSlug: tenants.slug,
        tenantName: tenants.name,
        tenantStatus: tenants.status,
      })
      .from(tenantMemberships)
      .innerJoin(tenants, eq(tenantMemberships.tenantId, tenants.id))
      .where(eq(tenantMemberships.userId, userId));

    const result: UserMembershipDetail[] = [];

    for (const row of membershipRows) {
      // Lấy danh sách roles của membership này
      const roleRows = await this.db
        .select({
          roleCode: roles.code,
          roleId: roles.id,
        })
        .from(membershipRoles)
        .innerJoin(roles, eq(membershipRoles.roleId, roles.id))
        .where(eq(membershipRoles.membershipId, row.membershipId));

      const roleCodes = roleRows.map((r) => r.roleCode);

      // Lấy danh sách permissions của các roles này
      const permissionCodes: string[] = [];
      if (roleRows.length > 0) {
        for (const r of roleRows) {
          const permRows = await this.db
            .select({ code: permissions.code })
            .from(rolePermissions)
            .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
            .where(eq(rolePermissions.roleId, r.roleId));

          for (const p of permRows) {
            if (!permissionCodes.includes(p.code)) {
              permissionCodes.push(p.code);
            }
          }
        }
      }

      result.push({
        id: row.membershipId,
        tenantId: row.tenantId,
        tenantSlug: row.tenantSlug,
        tenantName: row.tenantName,
        tenantStatus: row.tenantStatus,
        status: row.membershipStatus,
        roles: roleCodes,
        permissions: permissionCodes,
      });
    }

    return result;
  }

  async getUserProfile(
    userId: string,
    activeTenantId?: string | null,
  ): Promise<CurrentUserProfile> {
    const [userRow] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!userRow) {
      throw new Error(`Không tìm thấy người dùng: ${userId}`);
    }

    const memberships = await this.getUserMemberships(userId);

    // Xác định active membership
    let effectiveActiveTenantId = activeTenantId ?? null;
    let activeMembership = effectiveActiveTenantId
      ? (memberships.find((m) => m.tenantId === effectiveActiveTenantId) ?? null)
      : null;

    if (!activeMembership) {
      // Chọn membership active đầu tiên nếu chưa chọn
      const firstActive = memberships.find(
        (m) => m.status === 'active' && m.tenantStatus === 'active',
      );
      if (firstActive) {
        effectiveActiveTenantId = firstActive.tenantId;
        activeMembership = firstActive;
      }
    }

    const capabilities = activeMembership ? activeMembership.permissions : [];

    return {
      user: {
        id: userRow.id,
        issuer: userRow.issuer,
        subject: userRow.subject,
        email: userRow.email,
        emailVerified: userRow.emailVerified,
        displayName: userRow.displayName,
      },
      activeTenantId: effectiveActiveTenantId,
      activeMembership,
      memberships,
      capabilities,
    };
  }

  async switchActiveTenant(params: {
    token: string;
    userId: string;
    tenantId: string;
  }): Promise<CurrentUserProfile> {
    const memberships = await this.getUserMemberships(params.userId);
    const targetMembership = memberships.find((m) => m.tenantId === params.tenantId);

    if (!targetMembership || targetMembership.status !== 'active') {
      throw new TenantAccessForbiddenException();
    }

    if (targetMembership.tenantStatus !== 'active') {
      throw new TenantSuspendedException();
    }

    await this.sessionService.setActiveTenant(params.token, params.tenantId);
    return this.getUserProfile(params.userId, params.tenantId);
  }

  async handleOidcCallback(params: {
    code: string;
    state: string;
    userAgent?: string | null;
    ipAddress?: string | null;
  }): Promise<{ token: string; profile: CurrentUserProfile }> {
    const transientState = this.oidcService.getTransientState(params.state);
    const tokens = await this.oidcService.exchangeCodeForTokens(params.code, transientState);
    const claims = this.oidcService.verifyIdTokenPayload(tokens.idToken, transientState.nonce);

    const user = await this.upsertUserFromOidc(claims);
    const profile = await this.getUserProfile(user.id);

    const { token } = await this.sessionService.createSession({
      userId: user.id,
      activeTenantId: profile.activeTenantId,
      userAgent: params.userAgent,
      ipAddress: params.ipAddress,
    });

    return { token, profile };
  }
}
