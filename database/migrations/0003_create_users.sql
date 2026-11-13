CREATE TABLE app.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer varchar(512) NOT NULL,
  subject varchar(255) NOT NULL,
  email varchar(320),
  email_verified boolean NOT NULL DEFAULT false,
  display_name varchar(160),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_authenticated_at timestamptz,
  CONSTRAINT users_issuer_subject_unique UNIQUE (issuer, subject),
  CONSTRAINT users_issuer_not_blank_check CHECK (btrim(issuer) <> ''),
  CONSTRAINT users_subject_not_blank_check CHECK (btrim(subject) <> ''),
  CONSTRAINT users_email_not_blank_check CHECK (email IS NULL OR btrim(email) <> '')
);

CREATE INDEX users_email_idx ON app.users (email);
