import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  customType,
  foreignKey,
  index,
  jsonb,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { appSchema } from './app.schema';
import { tenants } from './tenant.schema';

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => 'bytea',
});

export const providerStatusValues = ['active', 'disabled'] as const;
export type ProviderStatus = (typeof providerStatusValues)[number];
export const providerStatus = appSchema.enum('provider_status', providerStatusValues);

export const mcpTransportValues = ['stdio', 'streamable_http', 'sse'] as const;
export type McpTransport = (typeof mcpTransportValues)[number];
export const mcpTransport = appSchema.enum('mcp_transport', mcpTransportValues);

export const secretReferences = appSchema.table(
  'secret_references',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    ownerType: varchar('owner_type', { length: 63 }).notNull(),
    ownerId: uuid('owner_id').notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    ciphertext: bytea('ciphertext').notNull(),
    nonce: bytea('nonce').notNull(),
    keyId: varchar('key_id', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('secret_references_id_tenant_unique').on(table.id, table.tenantId),
    unique('secret_references_owner_name_unique').on(
      table.tenantId,
      table.ownerType,
      table.ownerId,
      table.name,
    ),
    index('secret_references_tenant_idx').on(table.tenantId),
    check(
      'secret_references_owner_type_format_check',
      sql`${table.ownerType} ~ '^[a-z][a-z0-9_]*$'`,
    ),
    check('secret_references_name_not_blank_check', sql`btrim(${table.name}) <> ''`),
    check('secret_references_key_id_not_blank_check', sql`btrim(${table.keyId}) <> ''`),
    check('secret_references_nonce_length_check', sql`octet_length(${table.nonce}) = 12`),
    check(
      'secret_references_ciphertext_length_check',
      sql`octet_length(${table.ciphertext}) >= 17`,
    ),
  ],
);

export const aiProviders = appSchema.table(
  'ai_providers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    secretReferenceId: uuid('secret_reference_id'),
    code: varchar('code', { length: 63 }).notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    baseUrl: varchar('base_url', { length: 2048 }),
    config: jsonb('config').$type<Record<string, unknown>>().default({}).notNull(),
    status: providerStatus('status').default('active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('ai_providers_id_tenant_unique').on(table.id, table.tenantId),
    unique('ai_providers_tenant_code_unique').on(table.tenantId, table.code),
    foreignKey({
      name: 'ai_providers_secret_tenant_foreign_key',
      columns: [table.secretReferenceId, table.tenantId],
      foreignColumns: [secretReferences.id, secretReferences.tenantId],
    }).onDelete('restrict'),
    index('ai_providers_tenant_status_idx').on(table.tenantId, table.status),
    check('ai_providers_code_format_check', sql`${table.code} ~ '^[a-z][a-z0-9-]*$'`),
    check('ai_providers_name_not_blank_check', sql`btrim(${table.name}) <> ''`),
    check(
      'ai_providers_config_no_secrets_check',
      sql`NOT (${table.config} ?| ARRAY['apiKey', 'api_key', 'token', 'secret', 'password'])`,
    ),
  ],
);

export const aiModels = appSchema.table(
  'ai_models',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    providerId: uuid('provider_id').notNull(),
    modelKey: varchar('model_key', { length: 255 }).notNull(),
    displayName: varchar('display_name', { length: 160 }).notNull(),
    capabilities: text('capabilities').array().notNull(),
    config: jsonb('config').$type<Record<string, unknown>>().default({}).notNull(),
    enabled: boolean('enabled').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('ai_models_tenant_provider_key_unique').on(
      table.tenantId,
      table.providerId,
      table.modelKey,
    ),
    foreignKey({
      name: 'ai_models_provider_tenant_foreign_key',
      columns: [table.providerId, table.tenantId],
      foreignColumns: [aiProviders.id, aiProviders.tenantId],
    }).onDelete('cascade'),
    index('ai_models_tenant_enabled_idx').on(table.tenantId, table.enabled),
    check('ai_models_key_not_blank_check', sql`btrim(${table.modelKey}) <> ''`),
    check('ai_models_name_not_blank_check', sql`btrim(${table.displayName}) <> ''`),
    check(
      'ai_models_capabilities_check',
      sql`cardinality(${table.capabilities}) > 0 AND ${table.capabilities} <@ ARRAY['chat', 'embedding', 'vision', 'tool_calling']::text[]`,
    ),
    check(
      'ai_models_config_no_secrets_check',
      sql`NOT (${table.config} ?| ARRAY['apiKey', 'api_key', 'token', 'secret', 'password'])`,
    ),
  ],
);

export const mcpServers = appSchema.table(
  'mcp_servers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    secretReferenceId: uuid('secret_reference_id'),
    name: varchar('name', { length: 160 }).notNull(),
    transport: mcpTransport('transport').notNull(),
    config: jsonb('config').$type<Record<string, unknown>>().default({}).notNull(),
    enabled: boolean('enabled').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('mcp_servers_id_tenant_unique').on(table.id, table.tenantId),
    unique('mcp_servers_tenant_name_unique').on(table.tenantId, table.name),
    foreignKey({
      name: 'mcp_servers_secret_tenant_foreign_key',
      columns: [table.secretReferenceId, table.tenantId],
      foreignColumns: [secretReferences.id, secretReferences.tenantId],
    }).onDelete('restrict'),
    index('mcp_servers_tenant_enabled_idx').on(table.tenantId, table.enabled),
    check('mcp_servers_name_not_blank_check', sql`btrim(${table.name}) <> ''`),
    check(
      'mcp_servers_config_no_secrets_check',
      sql`NOT (${table.config} ?| ARRAY['apiKey', 'api_key', 'token', 'secret', 'password'])`,
    ),
  ],
);

export const mcpTools = appSchema.table(
  'mcp_tools',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    serverId: uuid('server_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    inputSchema: jsonb('input_schema').$type<Record<string, unknown>>().notNull(),
    snapshotHash: varchar('snapshot_hash', { length: 64 }).notNull(),
    discoveredAt: timestamp('discovered_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('mcp_tools_tenant_server_name_unique').on(table.tenantId, table.serverId, table.name),
    foreignKey({
      name: 'mcp_tools_server_tenant_foreign_key',
      columns: [table.serverId, table.tenantId],
      foreignColumns: [mcpServers.id, mcpServers.tenantId],
    }).onDelete('cascade'),
    index('mcp_tools_tenant_server_idx').on(table.tenantId, table.serverId),
    check('mcp_tools_name_not_blank_check', sql`btrim(${table.name}) <> ''`),
    check('mcp_tools_snapshot_hash_check', sql`${table.snapshotHash} ~ '^[a-f0-9]{64}$'`),
  ],
);
