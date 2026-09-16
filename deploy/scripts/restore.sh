#!/usr/bin/env bash
# Fail-closed full logical restore for the supported PostgreSQL 16 profile.
# The target database is recreated empty; the dump is the schema+data authority.

set -Eeuo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"
require_docker
require_env_file

DUMP="${1:-}"
[ -n "${DUMP}" ] || die "usage: restore.sh <dump-file>"
[ -f "${DUMP}" ] || die "no such dump file: ${DUMP}"
MANIFEST="${DUMP}.manifest"
[ -f "${MANIFEST}" ] || die "missing backup manifest: ${MANIFEST}"
DB="$(env_value POSTGRES_DB)"; DB="${DB:-verity}"

[ "${VERITY_RESTORE_CONFIRM:-}" = "yes" ] || \
  die "this DROPS the ${DB} database. Re-run with VERITY_RESTORE_CONFIRM=yes."

manifest_value() { sed -n "s/^$1=//p" "${MANIFEST}" | head -n 1; }
[ "$(manifest_value format)" = "verity-full-logical-v1" ] || die "unsupported backup format"
[ "$(manifest_value postgres_major)" = "16" ] || die "backup is not certified for PostgreSQL 16"
EXPECTED_SHA="$(manifest_value database_sha256)"
[ -n "${EXPECTED_SHA}" ] || die "backup manifest has no database checksum"
ACTUAL_SHA="$(sha256sum "${DUMP}" | awk '{print $1}')"
[ "${ACTUAL_SHA}" = "${EXPECTED_SHA}" ] || die "database backup checksum mismatch"

log "verifying archive readability before changing the target"
compose exec -T db sh -c 'cat > /tmp/restore-verify.dump && pg_restore --list /tmp/restore-verify.dump >/dev/null && rm -f /tmp/restore-verify.dump' < "${DUMP}"

log "stopping web and scheduler; failure leaves both stopped"
compose stop web scheduler >/dev/null 2>&1 || true

restore_failed() {
  warn "restore failed; web and scheduler remain stopped and the target remains quarantined"
}
trap restore_failed ERR

log "recreating empty ${DB}"
compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS \"${DB}\" WITH (FORCE);" \
  -c "CREATE DATABASE \"${DB}\";"

log "restoring schema and data with immediate error termination"
compose exec -T db pg_restore -U postgres -d "${DB}" \
  --exit-on-error --no-owner < "${DUMP}"

# The backup may have recorded `normal`; recovery owns the release decision,
# so overwrite it before any application process can start.
compose exec -T db psql -U postgres -d "${DB}" -v ON_ERROR_STOP=1 -c \
  "UPDATE public.deployment_state SET status='quarantined', details='{\"reason\":\"restore_verification\"}'::jsonb, updated_at=now() WHERE key='restore';"

log "verifying migration, constraints, role, RLS, policies, and timezone"
compose exec -T db psql -U postgres -d "${DB}" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE
  role_ok boolean;
  invalid_constraints integer;
  rls_tables integer;
  policy_count integer;
  failed_migrations integer;
  runtime_can_read boolean;
BEGIN
  SELECT NOT rolsuper AND NOT rolbypassrls INTO role_ok FROM pg_roles WHERE rolname = 'verity_app';
  IF role_ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'verity_app is missing or can bypass RLS'; END IF;
  SELECT has_table_privilege('verity_app', 'public.tenant', 'SELECT') INTO runtime_can_read;
  IF runtime_can_read IS DISTINCT FROM true THEN RAISE EXCEPTION 'verity_app runtime grants were not restored'; END IF;

  SELECT count(*) INTO invalid_constraints FROM pg_constraint WHERE NOT convalidated;
  IF invalid_constraints <> 0 THEN RAISE EXCEPTION '% constraints are not validated', invalid_constraints; END IF;

  SELECT count(*) INTO rls_tables FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity;
  SELECT count(*) INTO policy_count FROM pg_policies WHERE schemaname='public';
  IF rls_tables = 0 OR policy_count = 0 THEN RAISE EXCEPTION 'RLS policies are absent'; END IF;

  SELECT count(*) INTO failed_migrations FROM public._prisma_migrations
    WHERE finished_at IS NULL AND rolled_back_at IS NULL;
  IF failed_migrations <> 0 THEN RAISE EXCEPTION '% migrations are incomplete', failed_migrations; END IF;

  IF current_setting('TimeZone') <> 'UTC' THEN RAISE EXCEPTION 'database timezone is not UTC'; END IF;
END $$;
SQL

EXPECTED_TENANTS="$(manifest_value tenant_count)"
ACTUAL_TENANTS="$(compose exec -T db psql -U postgres -d "${DB}" -v ON_ERROR_STOP=1 -tAc 'SELECT count(*) FROM public.tenant' | tr -d '[:space:]')"
[ "${ACTUAL_TENANTS}" = "${EXPECTED_TENANTS}" ] || die "tenant count mismatch after restore"

log "database verification passed; releasing quarantine and restarting services"
compose exec -T db psql -U postgres -d "${DB}" -v ON_ERROR_STOP=1 -c \
  "UPDATE public.deployment_state SET status='normal', details='{}'::jsonb, updated_at=now() WHERE key='restore';"
trap - ERR
compose up -d web scheduler
"${SCRIPT_DIR}/health.sh"
log "restore complete and verified"
