import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  primaryKey,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { appSchema } from './app.schema';
import { tenants } from './tenant.schema';
import { users } from './user.schema';

export const membershipStatusValues = ['invited', 'active', 'suspended', 'revoked'] as const;
export type MembershipStatus = (typeof membershipStatusValues)[number];

export const membershipStatus = appSchema.enum('membership_status', membershipStatusValues);

export const tenantMemberships = appSchema.table(
  'tenant_memberships',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: membershipStatus('status').default('invited').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => [
    unique('tenant_memberships_tenant_user_unique').on(table.tenantId, table.userId),
    unique('tenant_memberships_id_tenant_unique').on(table.id, table.tenantId),
    index('tenant_memberships_user_idx').on(table.userId),
    index('tenant_memberships_tenant_status_idx').on(table.tenantId, table.status),
    check(
      'tenant_memberships_revoked_at_check',
      sql`(${table.status} = 'revoked') = (${table.revokedAt} IS NOT NULL)`,
    ),
  ],
);

export const permissions = appSchema.table(
  'permissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: varchar('code', { length: 100 }).notNull(),
    description: varchar('description', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('permissions_code_unique').on(table.code),
    check('permissions_code_format_check', sql`${table.code} ~ '^[a-z][a-z0-9_.:-]*$'`),
    check('permissions_description_not_blank_check', sql`btrim(${table.description}) <> ''`),
  ],
);

export const roles = appSchema.table(
  'roles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 63 }).notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('roles_tenant_code_unique').on(table.tenantId, table.code),
    unique('roles_id_tenant_unique').on(table.id, table.tenantId),
    index('roles_tenant_idx').on(table.tenantId),
    check('roles_code_format_check', sql`${table.code} ~ '^[a-z][a-z0-9-]*$'`),
    check('roles_name_not_blank_check', sql`btrim(${table.name}) <> ''`),
  ],
);

export const rolePermissions = appSchema.table(
  'role_permissions',
  {
    roleId: uuid('role_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({
      name: 'role_permissions_primary_key',
      columns: [table.roleId, table.permissionId],
    }),
    foreignKey({
      name: 'role_permissions_role_tenant_foreign_key',
      columns: [table.roleId, table.tenantId],
      foreignColumns: [roles.id, roles.tenantId],
    }).onDelete('cascade'),
    index('role_permissions_tenant_idx').on(table.tenantId),
  ],
);

export const membershipRoles = appSchema.table(
  'membership_roles',
  {
    membershipId: uuid('membership_id').notNull(),
    roleId: uuid('role_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({
      name: 'membership_roles_primary_key',
      columns: [table.membershipId, table.roleId],
    }),
    foreignKey({
      name: 'membership_roles_membership_tenant_foreign_key',
      columns: [table.membershipId, table.tenantId],
      foreignColumns: [tenantMemberships.id, tenantMemberships.tenantId],
    }).onDelete('cascade'),
    foreignKey({
      name: 'membership_roles_role_tenant_foreign_key',
      columns: [table.roleId, table.tenantId],
      foreignColumns: [roles.id, roles.tenantId],
    }).onDelete('cascade'),
    index('membership_roles_tenant_idx').on(table.tenantId),
  ],
);
