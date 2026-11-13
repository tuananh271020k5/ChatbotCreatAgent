CREATE TYPE app.execution_status AS ENUM (
  'queued', 'running', 'succeeded', 'failed', 'cancelled', 'timed_out'
);
CREATE TYPE app.node_execution_status AS ENUM (
  'queued', 'running', 'succeeded', 'failed', 'skipped'
);

CREATE TABLE app.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  name varchar(160) NOT NULL,
  description text,
  draft_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  revision integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT agents_id_tenant_unique UNIQUE (id, tenant_id),
  CONSTRAINT agents_tenant_name_unique UNIQUE (tenant_id, name),
  CONSTRAINT agents_name_not_blank_check CHECK (btrim(name) <> ''),
  CONSTRAINT agents_revision_positive_check CHECK (revision > 0)
);
CREATE INDEX agents_tenant_updated_idx ON app.agents (tenant_id, updated_at, id);

CREATE TABLE app.agent_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  version integer NOT NULL,
  config jsonb NOT NULL,
  content_hash varchar(64) NOT NULL,
  created_by uuid NOT NULL REFERENCES app.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agent_versions_id_tenant_unique UNIQUE (id, tenant_id),
  CONSTRAINT agent_versions_tenant_agent_version_unique UNIQUE (tenant_id, agent_id, version),
  CONSTRAINT agent_versions_agent_tenant_foreign_key
    FOREIGN KEY (agent_id, tenant_id) REFERENCES app.agents(id, tenant_id) ON DELETE CASCADE,
  CONSTRAINT agent_versions_version_positive_check CHECK (version > 0),
  CONSTRAINT agent_versions_content_hash_check CHECK (content_hash ~ '^[a-f0-9]{64}$')
);
CREATE INDEX agent_versions_tenant_agent_idx
  ON app.agent_versions (tenant_id, agent_id, version);

CREATE TABLE app.workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  name varchar(160) NOT NULL,
  description text,
  draft_definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  schema_version integer NOT NULL DEFAULT 1,
  revision integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT workflows_id_tenant_unique UNIQUE (id, tenant_id),
  CONSTRAINT workflows_tenant_name_unique UNIQUE (tenant_id, name),
  CONSTRAINT workflows_name_not_blank_check CHECK (btrim(name) <> ''),
  CONSTRAINT workflows_schema_version_positive_check CHECK (schema_version > 0),
  CONSTRAINT workflows_revision_positive_check CHECK (revision > 0)
);
CREATE INDEX workflows_tenant_updated_idx ON app.workflows (tenant_id, updated_at, id);

CREATE TABLE app.workflow_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  workflow_id uuid NOT NULL,
  version integer NOT NULL,
  schema_version integer NOT NULL,
  definition jsonb NOT NULL,
  content_hash varchar(64) NOT NULL,
  created_by uuid NOT NULL REFERENCES app.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workflow_versions_id_tenant_unique UNIQUE (id, tenant_id),
  CONSTRAINT workflow_versions_tenant_workflow_version_unique
    UNIQUE (tenant_id, workflow_id, version),
  CONSTRAINT workflow_versions_workflow_tenant_foreign_key
    FOREIGN KEY (workflow_id, tenant_id)
    REFERENCES app.workflows(id, tenant_id)
    ON DELETE CASCADE,
  CONSTRAINT workflow_versions_version_positive_check CHECK (version > 0),
  CONSTRAINT workflow_versions_schema_version_positive_check CHECK (schema_version > 0),
  CONSTRAINT workflow_versions_content_hash_check CHECK (content_hash ~ '^[a-f0-9]{64}$')
);
CREATE INDEX workflow_versions_tenant_workflow_idx
  ON app.workflow_versions (tenant_id, workflow_id, version);

CREATE TABLE app.executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  workflow_version_id uuid NOT NULL,
  agent_version_id uuid,
  status app.execution_status NOT NULL DEFAULT 'queued',
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb,
  error_code varchar(100),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  CONSTRAINT executions_id_tenant_unique UNIQUE (id, tenant_id),
  CONSTRAINT executions_workflow_version_tenant_foreign_key
    FOREIGN KEY (workflow_version_id, tenant_id)
    REFERENCES app.workflow_versions(id, tenant_id)
    ON DELETE RESTRICT,
  CONSTRAINT executions_agent_version_tenant_foreign_key
    FOREIGN KEY (agent_version_id, tenant_id)
    REFERENCES app.agent_versions(id, tenant_id)
    ON DELETE RESTRICT,
  CONSTRAINT executions_completion_check CHECK (
    (status IN ('succeeded', 'failed', 'cancelled', 'timed_out')) = (completed_at IS NOT NULL)
  )
);
CREATE INDEX executions_tenant_status_created_idx
  ON app.executions (tenant_id, status, created_at);

CREATE TABLE app.execution_node_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  execution_id uuid NOT NULL,
  node_id varchar(255) NOT NULL,
  attempt integer NOT NULL DEFAULT 1,
  status app.node_execution_status NOT NULL DEFAULT 'queued',
  input jsonb,
  output jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT execution_node_logs_execution_node_attempt_unique
    UNIQUE (execution_id, node_id, attempt),
  CONSTRAINT execution_node_logs_execution_tenant_foreign_key
    FOREIGN KEY (execution_id, tenant_id)
    REFERENCES app.executions(id, tenant_id)
    ON DELETE CASCADE,
  CONSTRAINT execution_node_logs_node_not_blank_check CHECK (btrim(node_id) <> ''),
  CONSTRAINT execution_node_logs_attempt_positive_check CHECK (attempt > 0)
);
CREATE INDEX execution_node_logs_tenant_execution_idx
  ON app.execution_node_logs (tenant_id, execution_id);

CREATE TABLE app.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES app.tenants(id) ON DELETE RESTRICT,
  actor_user_id uuid REFERENCES app.users(id) ON DELETE SET NULL,
  action varchar(100) NOT NULL,
  entity_type varchar(100) NOT NULL,
  entity_id uuid NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_events_action_not_blank_check CHECK (btrim(action) <> ''),
  CONSTRAINT audit_events_entity_type_not_blank_check CHECK (btrim(entity_type) <> '')
);
CREATE INDEX audit_events_tenant_created_idx
  ON app.audit_events (tenant_id, created_at, id);
CREATE INDEX audit_events_tenant_entity_idx
  ON app.audit_events (tenant_id, entity_type, entity_id);

CREATE TABLE app.outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  aggregate_type varchar(100) NOT NULL,
  aggregate_id uuid NOT NULL,
  event_type varchar(160) NOT NULL,
  payload jsonb NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT outbox_events_attempts_nonnegative_check CHECK (attempts >= 0),
  CONSTRAINT outbox_events_aggregate_not_blank_check CHECK (btrim(aggregate_type) <> ''),
  CONSTRAINT outbox_events_type_not_blank_check CHECK (btrim(event_type) <> '')
);
CREATE INDEX outbox_events_pending_idx
  ON app.outbox_events (tenant_id, published_at, available_at);

CREATE FUNCTION app.reject_immutable_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% is immutable', TG_TABLE_NAME USING ERRCODE = '55000';
END
$$;

CREATE TRIGGER agent_versions_immutable
  BEFORE UPDATE OR DELETE ON app.agent_versions
  FOR EACH ROW EXECUTE FUNCTION app.reject_immutable_change();
CREATE TRIGGER workflow_versions_immutable
  BEFORE UPDATE OR DELETE ON app.workflow_versions
  FOR EACH ROW EXECUTE FUNCTION app.reject_immutable_change();
CREATE TRIGGER audit_events_append_only
  BEFORE UPDATE OR DELETE ON app.audit_events
  FOR EACH ROW EXECUTE FUNCTION app.reject_immutable_change();

ALTER TABLE app.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.agents FORCE ROW LEVEL SECURITY;
CREATE POLICY agents_tenant_isolation ON app.agents
  USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());

ALTER TABLE app.agent_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.agent_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY agent_versions_tenant_isolation ON app.agent_versions
  USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());

ALTER TABLE app.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.workflows FORCE ROW LEVEL SECURITY;
CREATE POLICY workflows_tenant_isolation ON app.workflows
  USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());

ALTER TABLE app.workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.workflow_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY workflow_versions_tenant_isolation ON app.workflow_versions
  USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());

ALTER TABLE app.executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.executions FORCE ROW LEVEL SECURITY;
CREATE POLICY executions_tenant_isolation ON app.executions
  USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());

ALTER TABLE app.execution_node_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.execution_node_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY execution_node_logs_tenant_isolation ON app.execution_node_logs
  USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());

ALTER TABLE app.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.audit_events FORCE ROW LEVEL SECURITY;
CREATE POLICY audit_events_tenant_isolation ON app.audit_events
  USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());

ALTER TABLE app.outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.outbox_events FORCE ROW LEVEL SECURITY;
CREATE POLICY outbox_events_tenant_isolation ON app.outbox_events
  USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());
