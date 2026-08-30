#!/usr/bin/env bash
# Reports whether this deployment is healthy (Task 42; probes from Task 32).
#
# Liveness and readiness are checked separately and reported separately,
# because they answer different questions: a process that is alive with a dead
# database must not look the same as one that is down.

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"
require_docker
require_env_file

BIND="$(env_value VERITY_BIND_ADDRESS)"; BIND="${BIND:-127.0.0.1}"
PORT="$(env_value VERITY_PORT)"; PORT="${PORT:-3000}"
HOST="${BIND}"
[ "${HOST}" = "0.0.0.0" ] && HOST=127.0.0.1
BASE="http://${HOST}:${PORT}"

status=0

probe() {
  local path="$1" label="$2"
  local code
  code="$(curl -s -o /tmp/verity-health.json -w '%{http_code}' --max-time 10 "${BASE}${path}" || echo 000)"
  if [ "${code}" = "200" ]; then
    log "${label}: ok (${code})"
  else
    warn "${label}: FAILED (${code})"
    [ -s /tmp/verity-health.json ] && sed -n '1,5p' /tmp/verity-health.json >&2
    status=1
  fi
}

log "checking ${BASE}"
for _ in $(seq 1 30); do
  curl -sf --max-time 5 "${BASE}/api/health" >/dev/null 2>&1 && break
  sleep 2
done

probe /api/health "liveness"
probe /api/ready  "readiness"

log "container status"
compose ps

rm -f /tmp/verity-health.json
exit "${status}"
