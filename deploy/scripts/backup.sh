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

log "backup complete and verified: ${TARGET} (${SIZE} bytes)"
printf '%s\n' "${TARGET}"
