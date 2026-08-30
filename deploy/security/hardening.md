# Verity — Deployment Hardening

**Task 42.** Every rule here is enforced by `deploy/security/preflight.sh`,
`deploy/compose/docker-compose.yml`, or a test in
`src/test/deployment-package.test.ts`. A hardening document nothing enforces is
a wish list.

---

## 1. Credentials

| Rule | Enforced by |
|---|---|
| No default password in any compose file | `${VAR:?message}` — the command fails rather than starting something insecure |
| No example placeholder in a running deployment | preflight rejects any value beginning `CHANGE_ME` |
| Secrets at least 16 characters | preflight |
| The env file is mode 0600 | every script refuses otherwise |
| Generated secrets are written under `umask 077` | `install.sh` — created private, not made private afterwards |
| No secret in any committed file | `deployment-package.test.ts` scans the package |

The generated env file is **not recoverable from the deployment**. Back it up
separately, in whatever the organization already uses for secrets.

## 2. Database

*   The application connects as `verity_app` — `NOSUPERUSER NOBYPASSRLS`.
    PostgreSQL does not enforce row-level security for a role that is either,
    and `FORCE ROW LEVEL SECURITY` does not change that. A bypassing connection
    means INV-001 is unenforced while every policy still exists and every test
    still passes. `assertRlsEnforceable()` refuses to start on one.
*   `postgres` is used only by `migrate.sh` and `restore.sh`.
*   **No host port.** The database is reachable only over the compose network.
    For a psql session: `docker compose exec db psql -U postgres verity`.
*   **Session timezone pinned to UTC.** See §6.

## 3. Containers

*   `no-new-privileges:true` on every service.
*   `cap_drop: ALL`, with only the capabilities Postgres genuinely uses added
    back.
*   The application runs as a non-root user (`nextjs`, uid 1001) — from the
    Dockerfile, not from compose, so it holds however the image is run.
*   Logs bounded at 10MB x 5 files. An unbounded JSON log fills the disk, and
    the first symptom is the database refusing to write.
*   `stop_grace_period: 30s` — long enough to drain an in-flight request, short
    enough that a stuck process does not hold a deploy open.

## 4. Network exposure

Only the application publishes a port, bound to `127.0.0.1` by default. Put a
TLS-terminating reverse proxy in front of it. TLS is deliberately **not**
terminated inside the application: that would put certificate rotation on the
deployment's critical path for no security gain.

## 5. Startup and schema

Migration and bootstrap are **explicit operator steps**, never an image
entrypoint. Baking `prisma migrate deploy` into container start makes every
restart — including an autoscaler's — a potential schema change.

## 6. Time

The database session timezone is `UTC`, pinned in three places (`TZ`, `PGTZ`,
`-c timezone=UTC`) and verified by preflight against the running server.

This is not defensive tidiness. Three availability tests fail on a non-UTC
session, and they fail *quietly*: `temporal.ts` states that instants are UTC and
nothing had ever told the database. A customer installing on an IST or PST host
would get subtly wrong availability and SLA behaviour with every test in their
CI still green. It was found by running the suite on a machine that was not the
usual one.

## 7. Backup

`backup.sh` reads every dump back with `pg_restore --list` before reporting
success, and refuses a dump under 1KB. A dump nobody has ever read is not a
backup — it is a file, and the difference is discovered at the worst possible
moment.

`upgrade.sh` takes a backup first and aborts the upgrade if it fails.

## 8. What is deliberately not here

*   **No Kubernetes.** One stateless application, one database, one object
    store. Compose expresses that exactly; a Helm chart would add an
    orchestrator's failure modes to a deployment that has none of its problems.
    A customer already running Kubernetes can consume the same images.
*   **No secrets manager integration.** The env file is a file with a mode. A
    Vault or KMS integration is a real improvement and a real decision, and it
    needs an ADR rather than a default.
*   **No TLS inside the application.** See §4.
