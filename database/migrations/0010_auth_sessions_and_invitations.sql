CREATE TABLE app.sessions (
  id varchar(128) PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  active_tenant_id uuid REFERENCES app.tenants(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_active_at timestamptz NOT NULL DEFAULT now(),
  user_agent varchar(512),
  ip_address varchar(45)
);

CREATE INDEX sessions_user_idx ON app.sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON app.sessions (expires_at);

CREATE TABLE app.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  email varchar(320) NOT NULL,
  role_id uuid NOT NULL REFERENCES app.roles(id) ON DELETE CASCADE,
  token_hash varchar(128) NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invitations_email_not_blank_check CHECK (btrim(email) <> '')
);

CREATE INDEX invitations_tenant_idx ON app.invitations (tenant_id);
CREATE INDEX invitations_email_idx ON app.invitations (email);

CREATE TABLE app.api_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  name varchar(160) NOT NULL,
  token_hash varchar(128) NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT '{}',
  created_by uuid NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  last_used_at timestamptz,
  revoked_at timestamptz,
  CONSTRAINT api_tokens_name_not_blank_check CHECK (btrim(name) <> '')
);

CREATE INDEX api_tokens_tenant_idx ON app.api_tokens (tenant_id);

ALTER TABLE app.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.invitations FORCE ROW LEVEL SECURITY;
CREATE POLICY invitations_tenant_isolation ON app.invitations
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());

ALTER TABLE app.api_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.api_tokens FORCE ROW LEVEL SECURITY;
CREATE POLICY api_tokens_tenant_isolation ON app.api_tokens
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());

