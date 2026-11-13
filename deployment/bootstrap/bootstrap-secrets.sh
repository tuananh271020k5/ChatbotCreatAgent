#!/bin/sh
set -eu

secrets_dir=/secrets
umask 077
mkdir -p "$secrets_dir"

random_hex() {
  byte_count="$1"
  od -An -N "$byte_count" -tx1 /dev/urandom | tr -d ' \n'
}

ensure_secret() {
  file_name="$1"
  byte_count="$2"
  target="$secrets_dir/$file_name"
  if [ ! -s "$target" ]; then
    random_hex "$byte_count" > "$target"
  fi
}

ensure_secret postgres_admin_password 24
ensure_secret postgres_migration_password 24
ensure_secret postgres_application_password 24
ensure_secret keycloak_database_password 24
ensure_secret keycloak_admin_password 24
ensure_secret s3_access_key 10
ensure_secret s3_secret_key 32

admin_password="$(cat "$secrets_dir/postgres_admin_password")"
migration_password="$(cat "$secrets_dir/postgres_migration_password")"
application_password="$(cat "$secrets_dir/postgres_application_password")"
keycloak_password="$(cat "$secrets_dir/keycloak_database_password")"
s3_access_key="$(cat "$secrets_dir/s3_access_key")"
s3_secret_key="$(cat "$secrets_dir/s3_secret_key")"

printf '%s' "postgresql://agent_application:${application_password}@postgres:5432/agent_builder" \
  > "$secrets_dir/database_url"
printf '%s' "postgresql://agent_application:${application_password}@localhost:5432/agent_builder" \
  > "$secrets_dir/database_url_host"
printf '%s' "postgresql://agent_migration:${migration_password}@postgres:5432/agent_builder" \
  > "$secrets_dir/migration_database_url"
printf '%s' "postgresql://agent_migration:${migration_password}@localhost:5432/agent_builder" \
  > "$secrets_dir/migration_database_url_host"

cat > "$secrets_dir/seaweed-s3.json" <<EOF
{
  "identities": [
    {
      "name": "agent-builder",
      "credentials": [
        {
          "accessKey": "${s3_access_key}",
          "secretKey": "${s3_secret_key}"
        }
      ],
      "actions": ["Admin", "Read", "List", "Tagging", "Write"]
    }
  ]
}
EOF

mkdir -p "$secrets_dir/postgres" "$secrets_dir/seaweed" "$secrets_dir/backend" "$secrets_dir/keycloak"

for file_name in postgres_migration_password postgres_application_password keycloak_database_password; do
  cp "$secrets_dir/$file_name" "$secrets_dir/postgres/$file_name"
done
cp "$secrets_dir/seaweed-s3.json" "$secrets_dir/seaweed/seaweed-s3.json"
for file_name in database_url migration_database_url s3_access_key s3_secret_key; do
  cp "$secrets_dir/$file_name" "$secrets_dir/backend/$file_name"
done
for file_name in keycloak_database_password keycloak_admin_password; do
  cp "$secrets_dir/$file_name" "$secrets_dir/keycloak/$file_name"
done

chown -R 999:999 "$secrets_dir/postgres"
chown -R 1000:1000 "$secrets_dir/seaweed" "$secrets_dir/backend" "$secrets_dir/keycloak"
chmod 700 "$secrets_dir/postgres" "$secrets_dir/seaweed" "$secrets_dir/backend" "$secrets_dir/keycloak"
chmod 600 "$secrets_dir"/*_password "$secrets_dir"/s3_* "$secrets_dir"/*database_url*
chmod 600 "$secrets_dir/postgres"/* "$secrets_dir/seaweed"/* "$secrets_dir/backend"/* "$secrets_dir/keycloak"/*
printf 'Secret cục bộ đã sẵn sàng; giá trị hiện có được giữ nguyên.\n'
