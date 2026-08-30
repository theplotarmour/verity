#!/bin/sh
# Runs once, automatically, the first time the `db` container initializes an
# empty data volume — the official postgres image's own convention for
# /docker-entrypoint-initdb.d/*.sh. Creates the runtime role the application
# actually connects as.
#
# MUST be NOSUPERUSER NOBYPASSRLS. PostgreSQL does not enforce row-level
# security for a role that is either, and Supabase's own default `postgres`
# role has rolbypassrls = true — the exact failure mode
# assertRlsEnforceable() (src/server/platform/tenancy.ts) exists to refuse.
# A local Postgres image has no equivalent safeguard of its own; this script
# is what makes the container's `postgres` role behave the same way
# production's Supabase project already does: privileged for migrations
# only, never for application traffic.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  DO \$\$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'verity_app') THEN
      CREATE ROLE verity_app LOGIN PASSWORD '${VERITY_APP_PASSWORD}' NOSUPERUSER NOBYPASSRLS;
    END IF;
  END
  \$\$;
EOSQL
