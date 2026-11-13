#!/bin/sh
set -eu

master_address="seaweedfs:9333"
filer_address="seaweedfs:8888"
buckets="${S3_BUCKET_DOCUMENTS:-agent-documents} ${S3_BUCKET_OUTPUTS:-agent-outputs} ${S3_BUCKET_BACKUPS:-agent-backups}"

until bucket_list="$(printf 's3.bucket.list\n' | weed shell -master="$master_address" -filer="$filer_address" 2>&1)"; do
  printf 'Đang chờ SeaweedFS sẵn sàng...\n'
  sleep 2
done

for bucket in $buckets; do
  if printf '%s\n' "$bucket_list" | grep -Eq "(^|[[:space:]])${bucket}([[:space:]]|$)"; then
    printf 'Bucket %s đã tồn tại, giữ nguyên.\n' "$bucket"
    continue
  fi

  output="$(printf 's3.bucket.create -name %s -owner agent-builder\n' "$bucket" \
    | weed shell -master="$master_address" -filer="$filer_address" 2>&1)"
  printf '%s\n' "$output"
  printf '%s\n' "$output" | grep -q "created bucket ${bucket}"
done

printf 'Bucket S3 cục bộ đã sẵn sàng.\n'
