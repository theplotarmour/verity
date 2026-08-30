#!/usr/bin/env bash
# Shared setup for every Verity operator script (Task 42).
#
# Sourced, never executed. Everything here exists so that seven scripts behave
# identically: same project name, same env file, same compose files, same
# failure behaviour.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_DIR="$(cd "${DEPLOY_DIR}/.." && pwd)"

ENV_FILE="${VERITY_ENV_FILE:-${DEPLOY_DIR}/config/verity.env}"
COMPOSE_DIR="${DEPLOY_DIR}/compose"
BACKUP_DIR="${VERITY_BACKUP_DIR:-${DEPLOY_DIR}/backups}"

log()  { printf '[verity] %s\n' "$*"; }
warn() { printf '[verity] WARNING: %s\n' "$*" >&2; }
die()  { printf '[verity] ERROR: %s\n' "$*" >&2; exit 1; }

require_env_file() {
  [ -f "${ENV_FILE}" ] || die "no env file at ${ENV_FILE} — run deploy/scripts/install.sh first"

  # A world-readable file holding every credential this deployment uses is a
  # finding in any review. Refuse rather than warn: the fix is one chmod.
  local mode
  mode="$(stat -f '%OLp' "${ENV_FILE}" 2>/dev/null || stat -c '%a' "${ENV_FILE}")"
  case "${mode}" in
    600|400) ;;
    *) die "${ENV_FILE} is mode ${mode}; it holds credentials. Run: chmod 600 ${ENV_FILE}" ;;
  esac
}

# Docker Compose invocation, pinned to this package's files and project name so
# an operator's shell cwd cannot change which deployment a command touches.
compose() {
  local files=(-f "${COMPOSE_DIR}/docker-compose.yml")
  if [ "${VERITY_WITH_MINIO:-0}" = "1" ]; then
    files+=(-f "${COMPOSE_DIR}/docker-compose.minio.yml")
  fi
  docker compose --project-name verity --env-file "${ENV_FILE}" "${files[@]}" "$@"
}

# Reads one value out of the env file without sourcing it. Sourcing would run
# whatever it contains, and this file is edited by hand.
env_value() {
  local key="$1"
  sed -n "s/^${key}=//p" "${ENV_FILE}" | tail -n 1
}

require_docker() {
  command -v docker >/dev/null 2>&1 || die "docker is not installed or not on PATH"
  docker version >/dev/null 2>&1 || die "the Docker daemon is not reachable — is it running?"
}
