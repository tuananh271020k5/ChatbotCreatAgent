#!/bin/sh
set -eu

target_dir="$1"
if [ ! -d "$target_dir" ]; then
  printf 'Thư mục sao lưu không tồn tại: %s\n' "$target_dir" >&2
  exit 1
fi

printf 'Kiểm tra mã băm SHA-256...\n'
cd "$target_dir"
sha256sum -c agent_builder.dump.sha256
sha256sum -c identity.dump.sha256

printf 'Mã băm hợp lệ. Tiến hành phục hồi...\n'
admin_password="$(cat /run/local-secrets/postgres_admin_password 2>/dev/null || cat /run/local-secrets/postgres/postgres_migration_password)"

PGPASSWORD="$admin_password" pg_restore -h postgres -U platform_admin -d agent_builder \
  --clean --if-exists agent_builder.dump || true

PGPASSWORD="$admin_password" pg_restore -h postgres -U platform_admin -d identity \
  --clean --if-exists identity.dump || true

printf 'Phục hồi hoàn tất thành công.\n'

