#!/bin/sh
set -eu

backup_dir="${1:-/backups}"
mkdir -p "$backup_dir"
timestamp="$(date -u +%Y%m%d_%H%M%S)"
archive_name="agent_builder_backup_${timestamp}"
target_dir="${backup_dir}/${archive_name}"
mkdir -p "$target_dir"

printf 'Bắt đầu sao lưu cơ sở dữ liệu và cấu hình tại %s...\n' "$timestamp"

admin_password="$(cat /run/local-secrets/postgres_admin_password 2>/dev/null || cat /run/local-secrets/postgres/postgres_migration_password)"

PGPASSWORD="$admin_password" pg_dump -h postgres -U platform_admin -d agent_builder \
  --format=custom --file="${target_dir}/agent_builder.dump"

PGPASSWORD="$admin_password" pg_dump -h postgres -U platform_admin -d identity \
  --format=custom --file="${target_dir}/identity.dump"

sha256sum "${target_dir}/agent_builder.dump" > "${target_dir}/agent_builder.dump.sha256"
sha256sum "${target_dir}/identity.dump" > "${target_dir}/identity.dump.sha256"

printf 'Sao lưu hoàn tất tại %s\n' "$target_dir"
printf 'Checksums:\n'
cat "${target_dir}/agent_builder.dump.sha256"
cat "${target_dir}/identity.dump.sha256"

