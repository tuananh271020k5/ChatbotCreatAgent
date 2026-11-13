import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createDatabaseClient } from '../src/database/database.providers';
import { runMigrations } from '../src/database/migrations/migration-runner';
import {
  membershipRoles,
  permissions,
  rolePermissions,
  roles,
  tenantMemberships,
  tenants,
  users,
} from '../src/database/schema';
import { runInTenantTransaction } from '../src/database/tenant-transaction';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const migrationsDirectory = path.resolve(__dirname, '../../database/migrations');

async function expectPostgresError(promise: Promise<unknown>, code: string): Promise<void> {
  try {
    await promise;
    throw new Error(`Câu lệnh phải thất bại với PostgreSQL code ${code}`);
  } catch (error) {
    const databaseError = error as { code?: string; cause?: { code?: string } };
    expect(databaseError.code ?? databaseError.cause?.code).toBe(code);
  }
}

describe.runIf(Boolean(testDatabaseUrl))('tenant access integration', () => {
  const pool = new Pool({ connectionString: testDatabaseUrl });
  const database = createDatabaseClient(pool);
  const tenantIds: string[] = [];
  const userIds: string[] = [];
  const permissionIds: string[] = [];

  beforeAll(async () => {
    await runMigrations(pool, migrationsDirectory);
  });

  afterEach(async () => {
    if (tenantIds.length > 0) {
      await pool.query('DELETE FROM app.tenants WHERE id = ANY($1::uuid[])', [tenantIds]);
    }
    if (userIds.length > 0) {
      await pool.query('DELETE FROM app.users WHERE id = ANY($1::uuid[])', [userIds]);
    }
    if (permissionIds.length > 0) {
      await pool.query('DELETE FROM app.permissions WHERE id = ANY($1::uuid[])', [permissionIds]);
    }
    tenantIds.length = 0;
    userIds.length = 0;
    permissionIds.length = 0;
  });

  afterAll(async () => {
    await pool.end();
  });

  async function createIdentity(label: string): Promise<{ tenantId: string; userId: string }> {
    const suffix = randomUUID();
    const [tenant] = await database
      .insert(tenants)
      .values({ slug: `${label}-${suffix.slice(0, 8)}`, name: `Tenant ${label}` })
      .returning({ id: tenants.id });
    const [user] = await database
      .insert(users)
      .values({ issuer: `https://${label}.integration/${suffix}`, subject: suffix })
      .returning({ id: users.id });
    tenantIds.push(tenant.id);
    userIds.push(user.id);
    return { tenantId: tenant.id, userId: user.id };
  }

  async function createPermission(): Promise<string> {
    const [permission] = await database
      .insert(permissions)
      .values({
        code: `agent.read.${randomUUID().replaceAll('-', '')}`,
        description: 'Đọc agent trong tenant',
      })
      .returning({ id: permissions.id });
    permissionIds.push(permission.id);
    return permission.id;
  }

  it('cô lập membership, role và quyền theo tenant, kể cả truy vấn SQL trực tiếp', async () => {
    const first = await createIdentity('first');
    const second = await createIdentity('second');
    const permissionId = await createPermission();

    for (const context of [first, second]) {
      await runInTenantTransaction(database, context, async (transaction) => {
        const [membership] = await transaction
          .insert(tenantMemberships)
          .values({ ...context, status: 'active' })
          .returning({ id: tenantMemberships.id });
        const [role] = await transaction
          .insert(roles)
          .values({ tenantId: context.tenantId, code: 'owner', name: 'Chủ sở hữu' })
          .returning({ id: roles.id });
        await transaction.insert(rolePermissions).values({
          tenantId: context.tenantId,
          roleId: role.id,
          permissionId,
        });
        await transaction.insert(membershipRoles).values({
          tenantId: context.tenantId,
          membershipId: membership.id,
          roleId: role.id,
        });
      });
    }

    await runInTenantTransaction(database, first, async (transaction) => {
      const result = await transaction.execute<{ tenant_id: string }>(
        sql`SELECT tenant_id FROM app.tenant_memberships ORDER BY tenant_id`,
      );
      expect(result.rows).toEqual([{ tenant_id: first.tenantId }]);
    });

    await database.transaction(async (transaction) => {
      await transaction.execute(sql`SET LOCAL ROLE app_runtime`);
      const withoutContext = await transaction.execute<{ tenant_id: string }>(
        sql`SELECT tenant_id FROM app.tenant_memberships`,
      );
      expect(withoutContext.rows).toEqual([]);
    });
  });

  it('chặn gán role khác tenant bằng khóa ngoại kép', async () => {
    const first = await createIdentity('role-owner');
    const second = await createIdentity('membership-owner');

    const roleId = await runInTenantTransaction(database, first, async (transaction) => {
      const [role] = await transaction
        .insert(roles)
        .values({ tenantId: first.tenantId, code: 'editor', name: 'Biên tập viên' })
        .returning({ id: roles.id });
      return role.id;
    });
    const membershipId = await runInTenantTransaction(database, second, async (transaction) => {
      const [membership] = await transaction
        .insert(tenantMemberships)
        .values({ ...second, status: 'active' })
        .returning({ id: tenantMemberships.id });
      return membership.id;
    });

    await runInTenantTransaction(database, second, async (transaction) => {
      await expectPostgresError(
        transaction.insert(membershipRoles).values({
          tenantId: second.tenantId,
          membershipId,
          roleId,
        }),
        '23503',
      );
    });
  });

  it('xóa membership thu hồi role và context không rò rỉ qua pool', async () => {
    const context = await createIdentity('revoked');

    await runInTenantTransaction(database, context, async (transaction) => {
      const [membership] = await transaction
        .insert(tenantMemberships)
        .values({ ...context, status: 'active' })
        .returning({ id: tenantMemberships.id });
      const [role] = await transaction
        .insert(roles)
        .values({ tenantId: context.tenantId, code: 'viewer', name: 'Người xem' })
        .returning({ id: roles.id });
      await transaction.insert(membershipRoles).values({
        tenantId: context.tenantId,
        membershipId: membership.id,
        roleId: role.id,
      });
      await transaction.delete(tenantMemberships);

      const assignments = await transaction.select().from(membershipRoles);
      expect(assignments).toEqual([]);
    });

    await expect(
      runInTenantTransaction(
        database,
        { tenantId: 'khong-phai-uuid', userId: context.userId },
        async () => undefined,
      ),
    ).rejects.toThrow('tenantId phải là UUID hợp lệ');

    await database.transaction(async (transaction) => {
      await transaction.execute(sql`SET LOCAL ROLE app_runtime`);
      const leakedRows = await transaction.select().from(tenantMemberships);
      expect(leakedRows).toEqual([]);
    });
  });
});
