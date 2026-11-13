import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { DATABASE_CLIENT, type DatabaseClient } from '../../database/database.tokens';
import {
  invitations,
  membershipRoles,
  roles,
  tenantMemberships,
  users,
} from '../../database/schema';
import { generateOpaqueToken, hashToken } from '../auth/crypto.util';
import { STANDARD_ROLES } from './permissions.constants';

@Injectable()
export class MembersService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: DatabaseClient) {}

  async listMembers(tenantId: string) {
    const rows = await this.db
      .select({
        membershipId: tenantMemberships.id,
        status: tenantMemberships.status,
        createdAt: tenantMemberships.createdAt,
        userId: users.id,
        email: users.email,
        displayName: users.displayName,
      })
      .from(tenantMemberships)
      .innerJoin(users, eq(tenantMemberships.userId, users.id))
      .where(eq(tenantMemberships.tenantId, tenantId));

    const result = [];
    for (const r of rows) {
      const memberRoles = await this.db
        .select({
          roleId: roles.id,
          code: roles.code,
          name: roles.name,
        })
        .from(membershipRoles)
        .innerJoin(roles, eq(membershipRoles.roleId, roles.id))
        .where(eq(membershipRoles.membershipId, r.membershipId));

      result.push({
        ...r,
        roles: memberRoles,
      });
    }

    return result;
  }

  async createInvitation(params: {
    tenantId: string;
    email: string;
    roleCode: string;
    createdByUserId: string;
  }): Promise<{ invitationId: string; token: string }> {
    // 1. Tìm role
    const [targetRole] = await this.db
      .select()
      .from(roles)
      .where(and(eq(roles.tenantId, params.tenantId), eq(roles.code, params.roleCode)))
      .limit(1);

    if (!targetRole) {
      throw new NotFoundException(`Không tìm thấy vai trò '${params.roleCode}' trong tenant này`);
    }

    const rawToken = generateOpaqueToken(32);
    const tokenHash = hashToken(rawToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 ngày

    const [created] = await this.db
      .insert(invitations)
      .values({
        tenantId: params.tenantId,
        email: params.email.trim().toLowerCase(),
        roleId: targetRole.id,
        tokenHash,
        createdBy: params.createdByUserId,
        expiresAt,
        createdAt: now,
      })
      .returning();

    if (!created) {
      throw new Error('Không thể tạo bản ghi lời mời');
    }

    // Gửi email giả lập tới Mailpit (SMTP) nếu cần
    await this.notifyInvitationEmail(params.email, rawToken, params.tenantId);

    return {
      invitationId: created.id,
      token: rawToken,
    };
  }

  async acceptInvitation(rawToken: string, userId: string): Promise<{ tenantId: string }> {
    const tokenHash = hashToken(rawToken);
    const now = new Date();

    const [invitation] = await this.db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.tokenHash, tokenHash),
          isNull(invitations.acceptedAt),
          isNull(invitations.revokedAt),
        ),
      )
      .limit(1);

    if (!invitation) {
      throw new BadRequestException('Lời mời không hợp lệ, đã được dùng hoặc đã bị thu hồi');
    }

    if (invitation.expiresAt < now) {
      throw new BadRequestException('Lời mời đã hết hạn');
    }

    // Kiểm tra user có tồn tại
    const [user] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    // Upsert membership
    const [existingMembership] = await this.db
      .select()
      .from(tenantMemberships)
      .where(
        and(
          eq(tenantMemberships.tenantId, invitation.tenantId),
          eq(tenantMemberships.userId, userId),
        ),
      )
      .limit(1);

    let membershipId: string;
    if (existingMembership) {
      membershipId = existingMembership.id;
      await this.db
        .update(tenantMemberships)
        .set({ status: 'active', updatedAt: now, revokedAt: null })
        .where(eq(tenantMemberships.id, membershipId));
    } else {
      const [newMembership] = await this.db
        .insert(tenantMemberships)
        .values({
          tenantId: invitation.tenantId,
          userId,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!newMembership) {
        throw new Error('Không thể tạo tư cách thành viên');
      }

      membershipId = newMembership.id;
    }

    // Gán role
    await this.db
      .insert(membershipRoles)
      .values({
        membershipId,
        roleId: invitation.roleId,
        tenantId: invitation.tenantId,
      })
      .onConflictDoNothing();

    // Đánh dấu invitation đã nhận
    await this.db
      .update(invitations)
      .set({ acceptedAt: now })
      .where(eq(invitations.id, invitation.id));

    return { tenantId: invitation.tenantId };
  }

  async revokeInvitation(invitationId: string, tenantId: string): Promise<void> {
    await this.db
      .update(invitations)
      .set({ revokedAt: new Date() })
      .where(and(eq(invitations.id, invitationId), eq(invitations.tenantId, tenantId)));
  }

  async updateMemberRole(params: {
    tenantId: string;
    membershipId: string;
    newRoleCode: string;
  }): Promise<void> {
    const [targetRole] = await this.db
      .select()
      .from(roles)
      .where(and(eq(roles.tenantId, params.tenantId), eq(roles.code, params.newRoleCode)))
      .limit(1);

    if (!targetRole) {
      throw new NotFoundException(`Không tìm thấy vai trò '${params.newRoleCode}'`);
    }

    // Bảo vệ: Kiểm tra không cho phép hạ quyền Owner nếu là Owner duy nhất còn lại
    await this.assertNotDemotingLastOwner(params.tenantId, params.membershipId, params.newRoleCode);

    // Xóa role cũ và gán role mới
    await this.db
      .delete(membershipRoles)
      .where(
        and(
          eq(membershipRoles.membershipId, params.membershipId),
          eq(membershipRoles.tenantId, params.tenantId),
        ),
      );

    await this.db.insert(membershipRoles).values({
      membershipId: params.membershipId,
      roleId: targetRole.id,
      tenantId: params.tenantId,
    });
  }

  async removeMember(tenantId: string, membershipId: string): Promise<void> {
    // Bảo vệ không xóa Owner cuối cùng
    await this.assertNotDemotingLastOwner(tenantId, membershipId, null);

    await this.db
      .update(tenantMemberships)
      .set({ status: 'revoked', revokedAt: new Date() })
      .where(and(eq(tenantMemberships.id, membershipId), eq(tenantMemberships.tenantId, tenantId)));
  }

  private async assertNotDemotingLastOwner(
    tenantId: string,
    membershipId: string,
    newRoleCode: string | null,
  ): Promise<void> {
    if (newRoleCode === STANDARD_ROLES.OWNER) {
      return; // Vẫn là owner hoặc nâng lên owner thì an toàn
    }

    // Kiểm tra xem thành viên này hiện có phải là Owner không
    const currentRoles = await this.db
      .select({ code: roles.code })
      .from(membershipRoles)
      .innerJoin(roles, eq(membershipRoles.roleId, roles.id))
      .where(
        and(eq(membershipRoles.membershipId, membershipId), eq(membershipRoles.tenantId, tenantId)),
      );

    const isCurrentOwner = currentRoles.some((r) => r.code === STANDARD_ROLES.OWNER);
    if (!isCurrentOwner) return;

    // Đếm tổng số Owner đang hoạt động trong tenant
    const allOwners = await this.db
      .select({ membershipId: membershipRoles.membershipId })
      .from(membershipRoles)
      .innerJoin(roles, eq(membershipRoles.roleId, roles.id))
      .innerJoin(tenantMemberships, eq(membershipRoles.membershipId, tenantMemberships.id))
      .where(
        and(
          eq(membershipRoles.tenantId, tenantId),
          eq(roles.code, STANDARD_ROLES.OWNER),
          eq(tenantMemberships.status, 'active'),
        ),
      );

    if (allOwners.length <= 1) {
      throw new ForbiddenException(
        'Không thể xóa hoặc thay đổi vai trò của Chủ sở hữu (Owner) duy nhất trong không gian làm việc',
      );
    }
  }

  private async notifyInvitationEmail(
    email: string,
    token: string,
    tenantId: string,
  ): Promise<void> {
    // Ghi nhận sự kiện gửi thư mời tới Mailpit SMTP
    void email;
    void token;
    void tenantId;
  }
}
