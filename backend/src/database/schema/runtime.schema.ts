import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { appSchema } from './app.schema';
import { tenants } from './tenant.schema';
import { users } from './user.schema';

export const executionStatusValues = [
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled',
  'timed_out',
] as const;
export type ExecutionStatus = (typeof executionStatusValues)[number];
export const executionStatus = appSchema.enum('execution_status', executionStatusValues);

export const nodeExecutionStatusValues = [
  'queued',
  'running',
  'succeeded',
  'failed',
  'skipped',
] as const;
export type NodeExecutionStatus = (typeof nodeExecutionStatusValues)[number];
export const nodeExecutionStatus = appSchema.enum(
  'node_execution_status',
  nodeExecutionStatusValues,
);

export const agents = appSchema.table(
  'agents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 160 }).notNull(),
    description: text('description'),
    draftConfig: jsonb('draft_config').$type<Record<string, unknown>>().default({}).notNull(),
    revision: integer('revision').default(1).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (table) => [
    unique('agents_id_tenant_unique').on(table.id, table.tenantId),
    unique('agents_tenant_name_unique').on(table.tenantId, table.name),
    index('agents_tenant_updated_idx').on(table.tenantId, table.updatedAt, table.id),
    check('agents_name_not_blank_check', sql`btrim(${table.name}) <> ''`),
    check('agents_revision_positive_check', sql`${table.revision} > 0`),
  ],
);

export const agentVersions = appSchema.table(
  'agent_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    agentId: uuid('agent_id').notNull(),
    version: integer('version').notNull(),
    config: jsonb('config').$type<Record<string, unknown>>().notNull(),
    contentHash: varchar('content_hash', { length: 64 }).notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('agent_versions_id_tenant_unique').on(table.id, table.tenantId),
    unique('agent_versions_tenant_agent_version_unique').on(
      table.tenantId,
      table.agentId,
      table.version,
    ),
    foreignKey({
      name: 'agent_versions_agent_tenant_foreign_key',
      columns: [table.agentId, table.tenantId],
      foreignColumns: [agents.id, agents.tenantId],
    }).onDelete('cascade'),
    index('agent_versions_tenant_agent_idx').on(table.tenantId, table.agentId, table.version),
    check('agent_versions_version_positive_check', sql`${table.version} > 0`),
    check('agent_versions_content_hash_check', sql`${table.contentHash} ~ '^[a-f0-9]{64}$'`),
  ],
);

export const workflows = appSchema.table(
  'workflows',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 160 }).notNull(),
    description: text('description'),
    draftDefinition: jsonb('draft_definition')
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    schemaVersion: integer('schema_version').default(1).notNull(),
    revision: integer('revision').default(1).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (table) => [
    unique('workflows_id_tenant_unique').on(table.id, table.tenantId),
    unique('workflows_tenant_name_unique').on(table.tenantId, table.name),
    index('workflows_tenant_updated_idx').on(table.tenantId, table.updatedAt, table.id),
    check('workflows_name_not_blank_check', sql`btrim(${table.name}) <> ''`),
    check('workflows_schema_version_positive_check', sql`${table.schemaVersion} > 0`),
    check('workflows_revision_positive_check', sql`${table.revision} > 0`),
  ],
);

export const workflowVersions = appSchema.table(
  'workflow_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    workflowId: uuid('workflow_id').notNull(),
    version: integer('version').notNull(),
    schemaVersion: integer('schema_version').notNull(),
    definition: jsonb('definition').$type<Record<string, unknown>>().notNull(),
    contentHash: varchar('content_hash', { length: 64 }).notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('workflow_versions_id_tenant_unique').on(table.id, table.tenantId),
    unique('workflow_versions_tenant_workflow_version_unique').on(
      table.tenantId,
      table.workflowId,
      table.version,
    ),
    foreignKey({
      name: 'workflow_versions_workflow_tenant_foreign_key',
      columns: [table.workflowId, table.tenantId],
      foreignColumns: [workflows.id, workflows.tenantId],
    }).onDelete('cascade'),
    index('workflow_versions_tenant_workflow_idx').on(
      table.tenantId,
      table.workflowId,
      table.version,
    ),
    check('workflow_versions_version_positive_check', sql`${table.version} > 0`),
    check('workflow_versions_schema_version_positive_check', sql`${table.schemaVersion} > 0`),
    check('workflow_versions_content_hash_check', sql`${table.contentHash} ~ '^[a-f0-9]{64}$'`),
  ],
);

export const executions = appSchema.table(
  'executions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    workflowVersionId: uuid('workflow_version_id').notNull(),
    agentVersionId: uuid('agent_version_id'),
    status: executionStatus('status').default('queued').notNull(),
    input: jsonb('input').$type<Record<string, unknown>>().default({}).notNull(),
    output: jsonb('output').$type<Record<string, unknown>>(),
    errorCode: varchar('error_code', { length: 100 }),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    unique('executions_id_tenant_unique').on(table.id, table.tenantId),
    foreignKey({
      name: 'executions_workflow_version_tenant_foreign_key',
      columns: [table.workflowVersionId, table.tenantId],
      foreignColumns: [workflowVersions.id, workflowVersions.tenantId],
    }).onDelete('restrict'),
    foreignKey({
      name: 'executions_agent_version_tenant_foreign_key',
      columns: [table.agentVersionId, table.tenantId],
      foreignColumns: [agentVersions.id, agentVersions.tenantId],
    }).onDelete('restrict'),
    index('executions_tenant_status_created_idx').on(table.tenantId, table.status, table.createdAt),
    check(
      'executions_completion_check',
      sql`(${table.status} IN ('succeeded', 'failed', 'cancelled', 'timed_out')) = (${table.completedAt} IS NOT NULL)`,
    ),
  ],
);

export const executionNodeLogs = appSchema.table(
  'execution_node_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    executionId: uuid('execution_id').notNull(),
    nodeId: varchar('node_id', { length: 255 }).notNull(),
    attempt: integer('attempt').default(1).notNull(),
    status: nodeExecutionStatus('status').default('queued').notNull(),
    input: jsonb('input').$type<Record<string, unknown>>(),
    output: jsonb('output').$type<Record<string, unknown>>(),
    errorMessage: text('error_message'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('execution_node_logs_execution_node_attempt_unique').on(
      table.executionId,
      table.nodeId,
      table.attempt,
    ),
    foreignKey({
      name: 'execution_node_logs_execution_tenant_foreign_key',
      columns: [table.executionId, table.tenantId],
      foreignColumns: [executions.id, executions.tenantId],
    }).onDelete('cascade'),
    index('execution_node_logs_tenant_execution_idx').on(table.tenantId, table.executionId),
    check('execution_node_logs_node_not_blank_check', sql`btrim(${table.nodeId}) <> ''`),
    check('execution_node_logs_attempt_positive_check', sql`${table.attempt} > 0`),
  ],
);

export const auditEvents = appSchema.table(
  'audit_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 100 }).notNull(),
    entityType: varchar('entity_type', { length: 100 }).notNull(),
    entityId: uuid('entity_id').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('audit_events_tenant_created_idx').on(table.tenantId, table.createdAt, table.id),
    index('audit_events_tenant_entity_idx').on(table.tenantId, table.entityType, table.entityId),
    check('audit_events_action_not_blank_check', sql`btrim(${table.action}) <> ''`),
    check('audit_events_entity_type_not_blank_check', sql`btrim(${table.entityType}) <> ''`),
  ],
);

export const outboxEvents = appSchema.table(
  'outbox_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    aggregateType: varchar('aggregate_type', { length: 100 }).notNull(),
    aggregateId: uuid('aggregate_id').notNull(),
    eventType: varchar('event_type', { length: 160 }).notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    attempts: integer('attempts').default(0).notNull(),
    availableAt: timestamp('available_at', { withTimezone: true }).defaultNow().notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('outbox_events_pending_idx').on(table.tenantId, table.publishedAt, table.availableAt),
    check('outbox_events_attempts_nonnegative_check', sql`${table.attempts} >= 0`),
    check('outbox_events_aggregate_not_blank_check', sql`btrim(${table.aggregateType}) <> ''`),
    check('outbox_events_type_not_blank_check', sql`btrim(${table.eventType}) <> ''`),
  ],
);
