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

aws_s3() {
  if [ -n "${BACKUP_S3_ENDPOINT_URL:-}" ]; then
    aws --endpoint-url "$BACKUP_S3_ENDPOINT_URL" s3 "$@"
    return
  fi

  aws s3 "$@"
}

require_env POSTGRES_USER
require_env POSTGRES_PASSWORD
require_env RESTORE_TARGET_DB

RESTORE_DB_HOST="${RESTORE_DB_HOST:-postgres}"
RESTORE_DB_PORT="${RESTORE_DB_PORT:-5432}"
restore_source="${1:-${RESTORE_SOURCE:-}}"

if [ -z "$restore_source" ]; then
  printf 'Usage: restore.sh <dump-file-or-s3-uri>\n' >&2
  exit 1
fi

case "$RESTORE_TARGET_DB" in
  *[!A-Za-z0-9_-]* | '')
    printf 'RESTORE_TARGET_DB may only contain letters, digits, hyphen, and underscore\n' >&2
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

export AWS_PAGER=''
export PGPASSWORD="$POSTGRES_PASSWORD"

local_dump="$restore_source"
downloaded_dump=''

cleanup() {
  if [ -n "$downloaded_dump" ]; then
    rm -f "$downloaded_dump"
  fi
}

trap cleanup EXIT

case "$restore_source" in
  s3://*)
    require_env BACKUP_S3_BUCKET
    require_env AWS_ACCESS_KEY_ID
    require_env AWS_SECRET_ACCESS_KEY
    downloaded_dump="$(mktemp /tmp/carnotea-restore-XXXXXX.dump)"
    local_dump="$downloaded_dump"
    log "Downloading backup from ${restore_source}"
    aws_s3 cp "$restore_source" "$local_dump"
    ;;
  *)
    if [ ! -f "$restore_source" ]; then
      printf 'Backup file does not exist: %s\n' "$restore_source" >&2
      exit 1
    fi
    ;;
esac

log "Ensuring target database ${RESTORE_TARGET_DB} exists"
psql \
  -h "$RESTORE_DB_HOST" \
  -p "$RESTORE_DB_PORT" \
  -U "$POSTGRES_USER" \
  -d postgres \
  -v ON_ERROR_STOP=1 \
  -tc "SELECT 1 FROM pg_database WHERE datname = '${RESTORE_TARGET_DB}'" \
  | grep -q 1 || createdb \
    -h "$RESTORE_DB_HOST" \
    -p "$RESTORE_DB_PORT" \
    -U "$POSTGRES_USER" \
    "$RESTORE_TARGET_DB"

log "Restoring ${local_dump} into ${RESTORE_TARGET_DB}"
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  -h "$RESTORE_DB_HOST" \
  -p "$RESTORE_DB_PORT" \
  -U "$POSTGRES_USER" \
  -d "$RESTORE_TARGET_DB" \
  "$local_dump"

log 'Restore completed successfully'
