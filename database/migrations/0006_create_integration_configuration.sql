CREATE TYPE app.provider_status AS ENUM ('active', 'disabled');
CREATE TYPE app.mcp_transport AS ENUM ('stdio', 'streamable_http', 'sse');

CREATE TABLE app.secret_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  owner_type varchar(63) NOT NULL,
  owner_id uuid NOT NULL,
  name varchar(100) NOT NULL,
  ciphertext bytea NOT NULL,
  nonce bytea NOT NULL,
  key_id varchar(255) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT secret_references_id_tenant_unique UNIQUE (id, tenant_id),
  CONSTRAINT secret_references_owner_name_unique UNIQUE (tenant_id, owner_type, owner_id, name),
  CONSTRAINT secret_references_owner_type_format_check CHECK (owner_type ~ '^[a-z][a-z0-9_]*$'),
  CONSTRAINT secret_references_name_not_blank_check CHECK (btrim(name) <> ''),
  CONSTRAINT secret_references_key_id_not_blank_check CHECK (btrim(key_id) <> ''),
  CONSTRAINT secret_references_nonce_length_check CHECK (octet_length(nonce) = 12),
  CONSTRAINT secret_references_ciphertext_length_check CHECK (octet_length(ciphertext) >= 17)
);

CREATE INDEX secret_references_tenant_idx ON app.secret_references (tenant_id);

CREATE TABLE app.ai_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  secret_reference_id uuid,
  code varchar(63) NOT NULL,
  name varchar(160) NOT NULL,
  base_url varchar(2048),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  status app.provider_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_providers_id_tenant_unique UNIQUE (id, tenant_id),
  CONSTRAINT ai_providers_tenant_code_unique UNIQUE (tenant_id, code),
  CONSTRAINT ai_providers_secret_tenant_foreign_key
    FOREIGN KEY (secret_reference_id, tenant_id)
    REFERENCES app.secret_references(id, tenant_id)
    ON DELETE RESTRICT,
  CONSTRAINT ai_providers_code_format_check CHECK (code ~ '^[a-z][a-z0-9-]*$'),
  CONSTRAINT ai_providers_name_not_blank_check CHECK (btrim(name) <> ''),
  CONSTRAINT ai_providers_config_no_secrets_check CHECK (
    NOT (config ?| ARRAY['apiKey', 'api_key', 'token', 'secret', 'password'])
  )
);

CREATE INDEX ai_providers_tenant_status_idx ON app.ai_providers (tenant_id, status);

CREATE TABLE app.ai_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  model_key varchar(255) NOT NULL,
  display_name varchar(160) NOT NULL,
  capabilities text[] NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_models_tenant_provider_key_unique UNIQUE (tenant_id, provider_id, model_key),
  CONSTRAINT ai_models_provider_tenant_foreign_key
    FOREIGN KEY (provider_id, tenant_id)
    REFERENCES app.ai_providers(id, tenant_id)
    ON DELETE CASCADE,
  CONSTRAINT ai_models_key_not_blank_check CHECK (btrim(model_key) <> ''),
  CONSTRAINT ai_models_name_not_blank_check CHECK (btrim(display_name) <> ''),
  CONSTRAINT ai_models_capabilities_check CHECK (
    cardinality(capabilities) > 0
    AND capabilities <@ ARRAY['chat', 'embedding', 'vision', 'tool_calling']::text[]
  ),
  CONSTRAINT ai_models_config_no_secrets_check CHECK (
    NOT (config ?| ARRAY['apiKey', 'api_key', 'token', 'secret', 'password'])
  )
);

CREATE INDEX ai_models_tenant_enabled_idx ON app.ai_models (tenant_id, enabled);

CREATE TABLE app.mcp_servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  secret_reference_id uuid,
  name varchar(160) NOT NULL,
  transport app.mcp_transport NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mcp_servers_id_tenant_unique UNIQUE (id, tenant_id),
  CONSTRAINT mcp_servers_tenant_name_unique UNIQUE (tenant_id, name),
  CONSTRAINT mcp_servers_secret_tenant_foreign_key
    FOREIGN KEY (secret_reference_id, tenant_id)
    REFERENCES app.secret_references(id, tenant_id)
    ON DELETE RESTRICT,
  CONSTRAINT mcp_servers_name_not_blank_check CHECK (btrim(name) <> ''),
  CONSTRAINT mcp_servers_config_no_secrets_check CHECK (
    NOT (config ?| ARRAY['apiKey', 'api_key', 'token', 'secret', 'password'])
  )
);

CREATE INDEX mcp_servers_tenant_enabled_idx ON app.mcp_servers (tenant_id, enabled);

CREATE TABLE app.mcp_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  server_id uuid NOT NULL,
  name varchar(255) NOT NULL,
  description text,
  input_schema jsonb NOT NULL,
  snapshot_hash varchar(64) NOT NULL,
  discovered_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mcp_tools_tenant_server_name_unique UNIQUE (tenant_id, server_id, name),
  CONSTRAINT mcp_tools_server_tenant_foreign_key
    FOREIGN KEY (server_id, tenant_id)
    REFERENCES app.mcp_servers(id, tenant_id)
    ON DELETE CASCADE,
  CONSTRAINT mcp_tools_name_not_blank_check CHECK (btrim(name) <> ''),
  CONSTRAINT mcp_tools_snapshot_hash_check CHECK (snapshot_hash ~ '^[a-f0-9]{64}$')
);

CREATE INDEX mcp_tools_tenant_server_idx ON app.mcp_tools (tenant_id, server_id);

ALTER TABLE app.secret_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.secret_references FORCE ROW LEVEL SECURITY;
CREATE POLICY secret_references_tenant_isolation ON app.secret_references
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());

ALTER TABLE app.ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.ai_providers FORCE ROW LEVEL SECURITY;
CREATE POLICY ai_providers_tenant_isolation ON app.ai_providers
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());

ALTER TABLE app.ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.ai_models FORCE ROW LEVEL SECURITY;
CREATE POLICY ai_models_tenant_isolation ON app.ai_models
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());

ALTER TABLE app.mcp_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.mcp_servers FORCE ROW LEVEL SECURITY;
CREATE POLICY mcp_servers_tenant_isolation ON app.mcp_servers
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());

ALTER TABLE app.mcp_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.mcp_tools FORCE ROW LEVEL SECURITY;
CREATE POLICY mcp_tools_tenant_isolation ON app.mcp_tools
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());
