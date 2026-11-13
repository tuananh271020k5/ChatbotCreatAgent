#!/bin/sh
set -eu

migration_password="$(cat /run/local-secrets/postgres/postgres_migration_password)"
application_password="$(cat /run/local-secrets/postgres/postgres_application_password)"
keycloak_password="$(cat /run/local-secrets/postgres/keycloak_database_password)"

psql --set ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set migration_password="$migration_password" \
  --set application_password="$application_password" \
  --set keycloak_password="$keycloak_password" <<'SQL'
SELECT format(
  'CREATE ROLE agent_migration LOGIN CREATEROLE NOSUPERUSER NOCREATEDB PASSWORD %L',
  :'migration_password'
) WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'agent_migration') \gexec
ALTER ROLE agent_migration WITH LOGIN CREATEROLE NOSUPERUSER NOCREATEDB PASSWORD :'migration_password';

SELECT format(
  'CREATE ROLE agent_application LOGIN NOCREATEROLE NOSUPERUSER NOCREATEDB PASSWORD %L',
  :'application_password'
) WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'agent_application') \gexec
ALTER ROLE agent_application WITH LOGIN NOCREATEROLE NOSUPERUSER NOCREATEDB PASSWORD :'application_password';

SELECT format(
  'CREATE ROLE keycloak LOGIN NOCREATEROLE NOSUPERUSER NOCREATEDB PASSWORD %L',
  :'keycloak_password'
) WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'keycloak') \gexec
ALTER ROLE keycloak WITH LOGIN NOCREATEROLE NOSUPERUSER NOCREATEDB PASSWORD :'keycloak_password';

ALTER DATABASE agent_builder OWNER TO agent_migration;
REVOKE CONNECT ON DATABASE agent_builder FROM PUBLIC;
GRANT CONNECT ON DATABASE agent_builder TO agent_migration, agent_application;
CREATE EXTENSION IF NOT EXISTS vector;

SELECT 'CREATE DATABASE identity OWNER keycloak'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'identity') \gexec
REVOKE CONNECT ON DATABASE identity FROM PUBLIC;
GRANT CONNECT ON DATABASE identity TO keycloak;
SQL
