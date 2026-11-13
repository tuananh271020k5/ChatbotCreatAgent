CREATE TYPE app.tenant_status AS ENUM ('active', 'suspended', 'archived');

CREATE TABLE app.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug varchar(63) NOT NULL,
  name varchar(160) NOT NULL,
  status app.tenant_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT tenants_slug_unique UNIQUE (slug),
  CONSTRAINT tenants_slug_format_check CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT tenants_name_not_blank_check CHECK (btrim(name) <> ''),
  CONSTRAINT tenants_archived_at_check CHECK (
    (status = 'archived') = (archived_at IS NOT NULL)
  )
);

CREATE INDEX tenants_status_idx ON app.tenants (status);
