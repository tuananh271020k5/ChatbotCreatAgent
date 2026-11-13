import { sql } from 'drizzle-orm';
import { boolean, check, index, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { appSchema } from './app.schema';

export const users = appSchema.table(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    issuer: varchar('issuer', { length: 512 }).notNull(),
    subject: varchar('subject', { length: 255 }).notNull(),
    email: varchar('email', { length: 320 }),
    emailVerified: boolean('email_verified').default(false).notNull(),
    displayName: varchar('display_name', { length: 160 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    lastAuthenticatedAt: timestamp('last_authenticated_at', { withTimezone: true }),
  },
  (table) => [
    unique('users_issuer_subject_unique').on(table.issuer, table.subject),
    index('users_email_idx').on(table.email),
    check('users_issuer_not_blank_check', sql`btrim(${table.issuer}) <> ''`),
    check('users_subject_not_blank_check', sql`btrim(${table.subject}) <> ''`),
    check(
      'users_email_not_blank_check',
      sql`${table.email} IS NULL OR btrim(${table.email}) <> ''`,
    ),
  ],
);
