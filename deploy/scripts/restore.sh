#!/usr/bin/env bash
# Restores a backup (Task 42; procedure and its three known hazards from Task 33).
#
#   ./deploy/scripts/restore.sh deploy/backups/verity-20260830T120000Z.dump
#
# DESTRUCTIVE. It drops and recreates the database. It requires an explicit
# confirmation and refuses to run against a deployment whose web container is
# still up, because restoring under a live application produces a half-restored
# database and a very confusing incident.

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"
require_docker
require_env_file

DUMP="${1:-}"
[ -n "${DUMP}" ] || die "usage: restore.sh <dump-file>"
[ -f "${DUMP}" ] || die "no such dump file: ${DUMP}"

DB="$(env_value POSTGRES_DB)"; DB="${DB:-verity}"

if [ "${VERITY_RESTORE_CONFIRM:-}" != "yes" ]; then
  die "this DROPS the ${DB} database. Re-run with VERITY_RESTORE_CONFIRM=yes to proceed."
fi

log "stopping the application so nothing writes during the restore"
compose stop web || true

log "recreating ${DB}"
compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS \"${DB}\" WITH (FORCE);" \
  -c "CREATE DATABASE \"${DB}\";"

log "restoring"
# --no-owner: the dump names roles from the source deployment, which may not
# exist here. Ownership is re-established by the grants the migrations carry.
compose exec -T db pg_restore -U postgres -d "${DB}" --no-owner --clean --if-exists < "${DUMP}" \
  || warn "pg_restore reported errors — review them before trusting this restore"

log "restarting the application"
compose up -d web
"${SCRIPT_DIR}/health.sh"
log "restore complete"
