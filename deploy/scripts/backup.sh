#!/usr/bin/env bash
# Takes a verified backup (Task 42; procedure from Task 33).
#
# Writes a custom-format dump, then immediately reads it back with
# `pg_restore --list`. A dump nobody has ever read is not a backup — it is a
# file, and the difference is discovered at the worst possible moment.

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"
require_docker
require_env_file

mkdir -p "${BACKUP_DIR}"
DB="$(env_value POSTGRES_DB)"; DB="${DB:-verity}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TARGET="${BACKUP_DIR}/verity-${STAMP}.dump"
MANIFEST="${TARGET}.manifest"

log "dumping ${DB} to ${TARGET}"
# -Fc: custom format, so a restore can be selective and parallel. Written to a
# temporary name and moved on success, so an interrupted run never leaves a
# truncated file that looks like a backup.
compose exec -T db pg_dump -U postgres -d "${DB}" -Fc > "${TARGET}.partial"
mv "${TARGET}.partial" "${TARGET}"
chmod 600 "${TARGET}"

# Verified INSIDE the container, always.
#
# Found in Task 43: the host's pg_restore is whatever the operator happens to
# have installed, and an older one cannot read a newer server's archive —
# `unsupported version (1.15) in file header` from a v14 client against a v16
# dump. That failure says nothing about the backup and everything about the
# host, and it would have taught an operator to distrust a good backup. The
# container's client is the server's own version by construction.
log "verifying the dump is readable"
compose exec -T db sh -c 'cat > /tmp/verify.dump && pg_restore --list /tmp/verify.dump >/dev/null && rm -f /tmp/verify.dump' < "${TARGET}"

SIZE="$(wc -c < "${TARGET}" | tr -d ' ')"
[ "${SIZE}" -gt 1024 ] || die "backup is only ${SIZE} bytes — refusing to report success"

SHA256="$(sha256sum "${TARGET}" | awk '{print $1}')"
MIGRATIONS="$(compose exec -T db psql -U postgres -d "${DB}" -v ON_ERROR_STOP=1 -tAc \
  'SELECT count(*) FROM public._prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL' | tr -d '[:space:]')"
TENANTS="$(compose exec -T db psql -U postgres -d "${DB}" -v ON_ERROR_STOP=1 -tAc \
  'SELECT count(*) FROM public.tenant' | tr -d '[:space:]')"
COMMIT="$(env_value VERITY_COMMIT)"; COMMIT="${COMMIT:-unknown}"
VERSION="$(env_value VERITY_VERSION)"; VERSION="${VERSION:-unknown}"

# Values above are generated identifiers/numbers, not free-form data. The
# manifest deliberately contains no environment file or live credential.
( umask 077; printf '%s\n' \
  "format=verity-full-logical-v1" \
  "created_at=${STAMP}" \
  "postgres_major=16" \
  "artifact_version=${VERSION}" \
  "source_commit=${COMMIT}" \
  "database_file=$(basename "${TARGET}")" \
  "database_sha256=${SHA256}" \
  "database_bytes=${SIZE}" \
  "migration_count=${MIGRATIONS}" \
  "tenant_count=${TENANTS}" \
  "object_store_status=not_included" \
  "encryption_status=operator_managed" > "${MANIFEST}" )

warn "object-store bytes are not yet included; pair this database artifact with a provider snapshot before treating it as a complete recovery set"

log "backup complete and verified: ${TARGET} (${SIZE} bytes; manifest ${MANIFEST})"
printf '%s\n' "${TARGET}"
