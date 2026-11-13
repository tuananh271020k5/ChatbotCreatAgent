import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDatabaseClient } from '../src/database/database.providers';
import { membershipRoles, roles, tenantMemberships, tenants, users } from '../src/database/schema';
import { ApiTokensService } from '../src/modules/auth/api-tokens.service';
import { AuthService } from '../src/modules/auth/auth.service';
import { OidcService } from '../src/modules/auth/oidc.service';
import { SessionService } from '../src/modules/auth/session.service';
import { MembersService } from '../src/modules/permissions/members.service';
import { STANDARD_ROLES } from '../src/modules/permissions/permissions.constants';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe.runIf(Boolean(testDatabaseUrl))('Auth & Permissions Integration Tests', () => {
  let pool: Pool;
  let db: ReturnType<typeof createDatabaseClient>;
  let sessionService: SessionService;
  let oidcService: OidcService;
  let authService: AuthService;
  let membersService: MembersService;
  let apiTokensService: ApiTokensService;

  let testTenantId: string;
  let testUserId: string;

  beforeAll(async () => {
    pool = new Pool({ connectionString: testDatabaseUrl });
    db = createDatabaseClient(pool);

    sessionService = new SessionService(db);
    oidcService = new OidcService();
    authService = new AuthService(db, sessionService, oidcService);
    membersService = new MembersService(db);
    apiTokensService = new ApiTokensService(db);

    // Tạo tenant mẫu
    const [tenant] = await db
      .insert(tenants)
      .values({
        slug: `auth-test-tenant-${Date.now()}`,
        name: 'Auth Test Tenant',
        status: 'active',
      })
      .returning();
    testTenantId = tenant.id;

    // Tạo user mẫu
    const [user] = await db
      .insert(users)
      .values({
        issuer: 'http://localhost:8080/realms/agent-builder',
        subject: `test-sub-${Date.now()}`,
        email: `test-user-${Date.now()}@example.com`,
        displayName: 'Test Auth User',
      })
      .returning();
    testUserId = user.id;

    // Tạo role owner cho tenant
    const [ownerRole] = await db
      .insert(roles)
      .values({
        tenantId: testTenantId,
        code: STANDARD_ROLES.OWNER,
        name: 'Chủ sở hữu',
      })
      .returning();

    // Tạo role member cho tenant
    await db
      .insert(roles)
      .values({
        tenantId: testTenantId,
        code: STANDARD_ROLES.MEMBER,
        name: 'Thành viên',
      })
      .returning();

    // Tạo membership cho user
    const [membership] = await db
      .insert(tenantMemberships)
      .values({
        tenantId: testTenantId,
        userId: testUserId,
        status: 'active',
      })
      .returning();

    // Gán role owner cho membership
    await db.insert(membershipRoles).values({
      membershipId: membership.id,
      roleId: ownerRole.id,
      tenantId: testTenantId,
    });
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });

  it('tạo và truy vấn phiên đăng nhập từ database', async () => {
    const { token, session } = await sessionService.createSession({
      userId: testUserId,
      activeTenantId: testTenantId,
    });

    expect(token).toBeDefined();
    expect(session.userId).toBe(testUserId);

    const fetched = await sessionService.getSessionByToken(token);
    expect(fetched).not.toBeNull();
    expect(fetched?.activeTenantId).toBe(testTenantId);

    // Thu hồi session
    await sessionService.revokeSession(token);
    const afterRevoke = await sessionService.getSessionByToken(token);
    expect(afterRevoke).toBeNull();
  });

  it('lấy profile người dùng kèm quyền và membership chính xác', async () => {
    const profile = await authService.getUserProfile(testUserId, testTenantId);
    expect(profile.user.id).toBe(testUserId);
    expect(profile.activeTenantId).toBe(testTenantId);
    expect(profile.activeMembership?.roles).toContain(STANDARD_ROLES.OWNER);
  });

  it('bảo vệ không cho phép xóa Owner duy nhất trong tenant', async () => {
    const members = await membersService.listMembers(testTenantId);
    const ownerMembership = members.find((m) => m.userId === testUserId);
    expect(ownerMembership).toBeDefined();

    // Cố gắng xóa owner duy nhất -> phải bị ném lỗi ForbiddenException
    await expect(
      membersService.removeMember(testTenantId, ownerMembership!.membershipId),
    ).rejects.toThrow();
  });

  it('tạo, xác thực và thu hồi API token có scope', async () => {
    const { id, rawToken } = await apiTokensService.createToken({
      tenantId: testTenantId,
      name: 'CI Integration Token',
      scopes: ['workflows:execute', 'agents:read'],
      createdByUserId: testUserId,
    });

    expect(rawToken).startsWith('agb_live_');

    const validated = await apiTokensService.validateToken(rawToken);
    expect(validated.id).toBe(id);
    expect(validated.scopes).toEqual(['workflows:execute', 'agents:read']);

    // Thu hồi
    await apiTokensService.revokeToken(id, testTenantId);
    await expect(apiTokensService.validateToken(rawToken)).rejects.toThrow();
  });
});
