#!/bin/sh

set -eu

log() {
  printf '%s %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"
}

require_env() {
  var_name="$1"
  eval "var_value=\${$var_name:-}"

  if [ -z "$var_value" ]; then
    printf 'Missing required environment variable: %s\n' "$var_name" >&2
    exit 1
  fi
}

require_number() {
  var_name="$1"
  eval "var_value=\${$var_name:-}"

  case "$var_value" in
    '' | *[!0-9]*)
      printf 'Environment variable must be a positive integer: %s\n' "$var_name" >&2
      exit 1
      ;;
  esac
}

aws_s3() {
  if [ -n "${BACKUP_S3_ENDPOINT_URL:-}" ]; then
    aws --endpoint-url "$BACKUP_S3_ENDPOINT_URL" s3 "$@"
    return
  fi

  aws s3 "$@"
}

upload_file() {
  source_path="$1"
  destination_uri="$2"

  if [ -n "${BACKUP_S3_SSE:-}" ]; then
    if [ -n "${BACKUP_S3_SSE_KMS_KEY_ID:-}" ]; then
      aws_s3 cp "$source_path" "$destination_uri" \
        --sse "$BACKUP_S3_SSE" \
        --sse-kms-key-id "$BACKUP_S3_SSE_KMS_KEY_ID"
      return
    fi

    aws_s3 cp "$source_path" "$destination_uri" --sse "$BACKUP_S3_SSE"
    return
  fi

  aws_s3 cp "$source_path" "$destination_uri"
}

prune_prefix() {
  remote_prefix="$1"
  keep_count="$2"

  keys_file="$(mktemp)"
  trap 'rm -f "$keys_file"' RETURN

  aws_s3 ls "s3://${BACKUP_S3_BUCKET}/${remote_prefix}" --recursive \
    | awk '{ print $4 }' \
    | sed '/^$/d' \
    | sort > "$keys_file"

  object_count="$(wc -l < "$keys_file" | tr -d ' ')"

  if [ "$object_count" -le "$keep_count" ]; then
    rm -f "$keys_file"
    trap - RETURN
    return
  fi

  delete_count=$((object_count - keep_count))

  sed -n "1,${delete_count}p" "$keys_file" | while IFS= read -r key; do
    [ -n "$key" ] || continue
    log "Pruning s3://${BACKUP_S3_BUCKET}/${key}"
    aws_s3 rm "s3://${BACKUP_S3_BUCKET}/${key}"
  done

  rm -f "$keys_file"
  trap - RETURN
}

require_env POSTGRES_DB
require_env POSTGRES_USER
require_env POSTGRES_PASSWORD
require_env BACKUP_S3_BUCKET
require_env AWS_ACCESS_KEY_ID
require_env AWS_SECRET_ACCESS_KEY

BACKUP_S3_PREFIX="${BACKUP_S3_PREFIX:-carnotea/postgres}"
BACKUP_DB_HOST="${BACKUP_DB_HOST:-postgres}"
BACKUP_DB_PORT="${BACKUP_DB_PORT:-5432}"
BACKUP_KEEP_DAILY="${BACKUP_KEEP_DAILY:-7}"
BACKUP_KEEP_WEEKLY="${BACKUP_KEEP_WEEKLY:-8}"
BACKUP_WEEKLY_DAY="${BACKUP_WEEKLY_DAY:-7}"

require_number BACKUP_KEEP_DAILY
require_number BACKUP_KEEP_WEEKLY
require_number BACKUP_WEEKLY_DAY

case "$BACKUP_WEEKLY_DAY" in
  1 | 2 | 3 | 4 | 5 | 6 | 7) ;;
  *)
    printf 'BACKUP_WEEKLY_DAY must be between 1 (Mon) and 7 (Sun)\n' >&2
    exit 1
    ;;
esac

if [ -n "${BACKUP_S3_ENDPOINT_URL:-}" ]; then
  case "$BACKUP_S3_ENDPOINT_URL" in
    https://*) ;;
    *)
      printf 'BACKUP_S3_ENDPOINT_URL must start with https://\n' >&2
      exit 1
      ;;
  esac
fi

if [ -n "${BACKUP_S3_SSE:-}" ]; then
  case "$BACKUP_S3_SSE" in
    AES256 | aws:kms) ;;
    *)
      printf 'BACKUP_S3_SSE must be AES256 or aws:kms when set\n' >&2
      exit 1
      ;;
  esac
fi

export AWS_PAGER=''
export PGPASSWORD="$POSTGRES_PASSWORD"

timestamp="$(date -u +'%Y-%m-%dT%H-%M-%SZ')"
day_of_week="$(date -u +'%u')"
prefix="$(printf '%s' "$BACKUP_S3_PREFIX" | sed 's#^/*##; s#/*$##')"
file_name="postgres-${POSTGRES_DB}-${timestamp}.dump"
local_dump="/tmp/${file_name}"
daily_prefix="${prefix}/daily"
weekly_prefix="${prefix}/weekly"
daily_uri="s3://${BACKUP_S3_BUCKET}/${daily_prefix}/${file_name}"

cleanup() {
  rm -f "$local_dump"
}

trap cleanup EXIT

log "Creating pg_dump backup at ${local_dump}"
pg_dump \
  -Fc \
  -h "$BACKUP_DB_HOST" \
  -p "$BACKUP_DB_PORT" \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  -f "$local_dump"

log "Uploading daily backup to ${daily_uri}"
upload_file "$local_dump" "$daily_uri"

if [ "$day_of_week" = "$BACKUP_WEEKLY_DAY" ]; then
  weekly_uri="s3://${BACKUP_S3_BUCKET}/${weekly_prefix}/${file_name}"
  log "Uploading weekly backup to ${weekly_uri}"
  upload_file "$local_dump" "$weekly_uri"
fi

log "Applying retention policy: keep ${BACKUP_KEEP_DAILY} daily backups"
prune_prefix "$daily_prefix" "$BACKUP_KEEP_DAILY"

if [ "$day_of_week" = "$BACKUP_WEEKLY_DAY" ]; then
  log "Applying retention policy: keep ${BACKUP_KEEP_WEEKLY} weekly backups"
  prune_prefix "$weekly_prefix" "$BACKUP_KEEP_WEEKLY"
fi

log 'Backup completed successfully'
