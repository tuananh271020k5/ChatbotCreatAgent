import {
  permissions,
  roles,
  tenantMemberships,
  tenants,
  users,
  membershipRoles,
  rolePermissions,
} from '../schema';
import type { DatabaseClient } from '../database.tokens';
import { runInTenantTransaction } from '../tenant-transaction';

interface SeedEnvironment {
  NODE_ENV?: string;
}

export interface DevelopmentSeedResult {
  tenantIds: string[];
  userIds: string[];
}

const permissionSeeds = [
  { code: 'agent.read', description: 'Xem Agent trong tenant' },
  { code: 'agent.manage', description: 'Tạo và chỉnh sửa Agent trong tenant' },
] as const;

const tenantSeeds = [
  {
    slug: 'demo-alpha',
    name: 'Demo Alpha',
    issuer: 'https://seed.local',
    subject: 'demo-alpha-owner',
    email: 'alpha@example.test',
    displayName: 'Alpha Owner',
  },
  {
    slug: 'demo-beta',
    name: 'Demo Beta',
    issuer: 'https://seed.local',
    subject: 'demo-beta-owner',
    email: 'beta@example.test',
    displayName: 'Beta Owner',
  },
] as const;

function requireSeedRow<T>(rows: readonly T[], entityName: string): T {
  const row = rows[0];
  if (!row) throw new Error(`Không thể seed ${entityName}`);
  return row;
}

export async function seedDevelopmentData(
  database: DatabaseClient,
  environment: SeedEnvironment = process.env,
): Promise<DevelopmentSeedResult> {
  if (environment.NODE_ENV === 'production') {
    throw new Error('Không được chạy seed phát triển trong production');
  }

  const seededPermissions = await Promise.all(
    permissionSeeds.map((seed) =>
      database
        .insert(permissions)
        .values(seed)
        .onConflictDoUpdate({ target: permissions.code, set: { description: seed.description } })
        .returning({ id: permissions.id }),
    ),
  );
  const permissionIds = seededPermissions.map((rows) => requireSeedRow(rows, 'permission').id);
  const tenantIds: string[] = [];
  const userIds: string[] = [];

  for (const seed of tenantSeeds) {
    const tenant = requireSeedRow(
      await database
        .insert(tenants)
        .values({ slug: seed.slug, name: seed.name })
        .onConflictDoUpdate({
          target: tenants.slug,
          set: { name: seed.name, updatedAt: new Date() },
        })
        .returning({ id: tenants.id }),
      'tenant',
    );
    const user = requireSeedRow(
      await database
        .insert(users)
        .values({
          issuer: seed.issuer,
          subject: seed.subject,
          email: seed.email,
          emailVerified: true,
          displayName: seed.displayName,
        })
        .onConflictDoUpdate({
          target: [users.issuer, users.subject],
          set: {
            email: seed.email,
            emailVerified: true,
            displayName: seed.displayName,
            updatedAt: new Date(),
          },
        })
        .returning({ id: users.id }),
      'user',
    );

    tenantIds.push(tenant.id);
    userIds.push(user.id);

    await runInTenantTransaction(
      database,
      { tenantId: tenant.id, userId: user.id },
      async (transaction) => {
        const membership = requireSeedRow(
          await transaction
            .insert(tenantMemberships)
            .values({ tenantId: tenant.id, userId: user.id, status: 'active' })
            .onConflictDoUpdate({
              target: [tenantMemberships.tenantId, tenantMemberships.userId],
              set: { status: 'active', revokedAt: null, updatedAt: new Date() },
            })
            .returning({ id: tenantMemberships.id }),
          'membership',
        );
        const role = requireSeedRow(
          await transaction
            .insert(roles)
            .values({ tenantId: tenant.id, code: 'owner', name: 'Chủ sở hữu' })
            .onConflictDoUpdate({
              target: [roles.tenantId, roles.code],
              set: { name: 'Chủ sở hữu', updatedAt: new Date() },
            })
            .returning({ id: roles.id }),
          'role',
        );

        await transaction
          .insert(rolePermissions)
          .values(
            permissionIds.map((permissionId) => ({
              tenantId: tenant.id,
              roleId: role.id,
              permissionId,
            })),
          )
          .onConflictDoNothing();
        await transaction
          .insert(membershipRoles)
          .values({ tenantId: tenant.id, membershipId: membership.id, roleId: role.id })
          .onConflictDoNothing();
      },
    );
  }

  return { tenantIds, userIds };
}
