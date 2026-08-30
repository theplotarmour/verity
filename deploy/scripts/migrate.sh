#!/usr/bin/env bash
# Applies pending database migrations (Task 42).
#
# Runs as the privileged role through DIRECT_URL — migrations create tables and
# policies, which the NOBYPASSRLS runtime role deliberately cannot do. The
# running application never uses this connection.
#
# `prisma migrate deploy` applies only migrations that exist in the repository
# and never generates one, so this cannot invent a schema change on a customer's
# database.

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"
require_docker
require_env_file

log "waiting for the database to accept connections"
for _ in $(seq 1 60); do
  if compose exec -T db pg_isready -U postgres -d "$(env_value POSTGRES_DB || echo verity)" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

log "applying migrations"
compose run --rm --entrypoint "" web npx prisma migrate deploy

log "migrations applied"
