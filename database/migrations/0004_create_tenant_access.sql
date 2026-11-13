CREATE TYPE app.membership_status AS ENUM ('invited', 'active', 'suspended', 'revoked');

CREATE TABLE app.tenant_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  status app.membership_status NOT NULL DEFAULT 'invited',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CONSTRAINT tenant_memberships_tenant_user_unique UNIQUE (tenant_id, user_id),
  CONSTRAINT tenant_memberships_id_tenant_unique UNIQUE (id, tenant_id),
  CONSTRAINT tenant_memberships_revoked_at_check CHECK (
    (status = 'revoked') = (revoked_at IS NOT NULL)
  )
);

CREATE INDEX tenant_memberships_user_idx ON app.tenant_memberships (user_id);
CREATE INDEX tenant_memberships_tenant_status_idx ON app.tenant_memberships (tenant_id, status);

CREATE TABLE app.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(100) NOT NULL,
  description varchar(255) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT permissions_code_unique UNIQUE (code),
  CONSTRAINT permissions_code_format_check CHECK (code ~ '^[a-z][a-z0-9_.:-]*$'),
  CONSTRAINT permissions_description_not_blank_check CHECK (btrim(description) <> '')
);

CREATE TABLE app.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  code varchar(63) NOT NULL,
  name varchar(160) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT roles_tenant_code_unique UNIQUE (tenant_id, code),
  CONSTRAINT roles_id_tenant_unique UNIQUE (id, tenant_id),
  CONSTRAINT roles_code_format_check CHECK (code ~ '^[a-z][a-z0-9-]*$'),
  CONSTRAINT roles_name_not_blank_check CHECK (btrim(name) <> '')
);

CREATE INDEX roles_tenant_idx ON app.roles (tenant_id);

CREATE TABLE app.role_permissions (
  role_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  permission_id uuid NOT NULL REFERENCES app.permissions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT role_permissions_primary_key PRIMARY KEY (role_id, permission_id),
  CONSTRAINT role_permissions_role_tenant_foreign_key
    FOREIGN KEY (role_id, tenant_id) REFERENCES app.roles(id, tenant_id) ON DELETE CASCADE
);

CREATE INDEX role_permissions_tenant_idx ON app.role_permissions (tenant_id);

CREATE TABLE app.membership_roles (
  membership_id uuid NOT NULL,
  role_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT membership_roles_primary_key PRIMARY KEY (membership_id, role_id),
  CONSTRAINT membership_roles_membership_tenant_foreign_key
    FOREIGN KEY (membership_id, tenant_id)
    REFERENCES app.tenant_memberships(id, tenant_id) ON DELETE CASCADE,
  CONSTRAINT membership_roles_role_tenant_foreign_key
    FOREIGN KEY (role_id, tenant_id) REFERENCES app.roles(id, tenant_id) ON DELETE CASCADE
);

CREATE INDEX membership_roles_tenant_idx ON app.membership_roles (tenant_id);

CREATE FUNCTION app.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
$$;

ALTER TABLE app.tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.tenant_memberships FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_memberships_tenant_isolation ON app.tenant_memberships
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());

ALTER TABLE app.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.roles FORCE ROW LEVEL SECURITY;
CREATE POLICY roles_tenant_isolation ON app.roles
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());

ALTER TABLE app.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.role_permissions FORCE ROW LEVEL SECURITY;
CREATE POLICY role_permissions_tenant_isolation ON app.role_permissions
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());

ALTER TABLE app.membership_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.membership_roles FORCE ROW LEVEL SECURITY;
CREATE POLICY membership_roles_tenant_isolation ON app.membership_roles
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());
