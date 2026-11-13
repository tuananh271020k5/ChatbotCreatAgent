import { sql } from 'drizzle-orm';
import { check, index, pgSchema, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';

const appSchema = pgSchema('app');

export const tenantStatusValues = ['active', 'suspended', 'archived'] as const;
export type TenantStatus = (typeof tenantStatusValues)[number];

export const tenantStatus = appSchema.enum('tenant_status', tenantStatusValues);

export const tenants = appSchema.table(
  'tenants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 63 }).notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    status: tenantStatus('status').default('active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (table) => [
    unique('tenants_slug_unique').on(table.slug),
    index('tenants_status_idx').on(table.status),
    check('tenants_slug_format_check', sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check('tenants_name_not_blank_check', sql`btrim(${table.name}) <> ''`),
    check(
      'tenants_archived_at_check',
      sql`(${table.status} = 'archived') = (${table.archivedAt} IS NOT NULL)`,
    ),
  ],
);
