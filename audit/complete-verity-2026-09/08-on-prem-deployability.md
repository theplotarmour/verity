# On-Premises Deployability

## Profile verdicts

| Profile | Verdict | Blocking conditions |
|---|---|---|
| Single Linux host + local PostgreSQL + Supabase cloud auth/storage | **NOT READY** | privileged `DIRECT_URL` in web; no on-prem scheduler; restore false-success; CI red; clean installation not run in Docker |
| Single Linux host + local PostgreSQL + customer OIDC + MinIO/S3 | **NOT READY** | browser OIDC flow and provider-neutral user lifecycle absent; common blockers above |
| Single Linux host + local PostgreSQL + bearer-only machine OIDC | **WITH CONTROLLED CONDITIONS** for API-only experimentation, not the documented browser product | caller must mint/provide tokens; no interactive UX; still not production due common blockers |
| Fully air-gapped appliance | **PROFILE NOT SUPPORTED** | no bundled IdP/offline user lifecycle; no disconnected artifact/update process; no full lab proof |
| Kubernetes/HA/multi-node | **PROFILE NOT SUPPORTED** | no manifests, ingress policy, secret store, rolling migration/rollback, replica/scheduler leader strategy, or HA test |

## Build and artifact portability

| Check | Result |
|---|---|
| Multi-stage Dockerfile | PASS statically |
| Non-root runtime user | PASS (`USER nextjs`) |
| Standalone Next output | PASS; clean build emitted standalone artifact |
| Clean detached `npm ci` | PASS |
| Clean Next 16.3.3 build | PASS with one Edge import warning |
| Container image build/run | UNTESTED; Docker unavailable |
| Immutable base/service images | FAIL; tags are not digest-pinned, MinIO uses `latest` |
| Release artifact provenance/SBOM/signing | NOT FOUND |

## Installation and bootstrap

The package contains Compose, environment template, DB role init, migrate/bootstrap/health scripts, and installation documentation. Important blockers:

- `install.sh` copies an environment template with blank required Supabase fields, then calls preflight before the documented operator edit. First-run automation cannot complete as described.
- The web service is given both runtime and migration URLs. This breaks least privilege.
- No current fresh-cluster migration/bootstrap/seed/restart was run.
- The local runtime configuration uses different environment-name generations (`S3_*` versus `VERITY_S3_*`), showing real operator drift.

## Provider substitution

| Dependency | Current adapters | On-prem assessment |
|---|---|---|
| PostgreSQL | standard connection URLs; local Compose DB | strong path, but migration credential leaks into web |
| Authentication | Supabase and OIDC token verifier | OIDC browser/session bootstrap and identity admin missing; not a complete substitute |
| File storage | Supabase, S3-compatible, optional none | MinIO overlay exists; live test unavailable |
| Notifications | in-app substrate | no external dispatcher; acceptable only where in-app-only is declared |
| AI | OpenAI-compatible HTTP config | optional at boot; some client AI behavior unavailable without supported tool-calling model |
| Email/password lifecycle | Supabase admin APIs | not provider-neutral |
| Scheduler | Vercel Cron + GitHub Actions | no local service/systemd/cron binding in package |

## Runtime topology and resilience

- Compose binds the app to `127.0.0.1` by default and does not publish PostgreSQL, a good reverse-proxy posture.
- Services drop Linux capabilities and set `no-new-privileges`; app runs non-root.
- No resource limits/reservations, read-only root filesystem, seccomp/AppArmor profile, or network-policy segmentation is declared.
- PostgreSQL has a volume and health check; MinIO has a volume/health check. No database replication, PITR/WAL archival, object replication, or quorum story exists.
- The scheduler route is idempotency-oriented, but no local scheduler/leader service exists. Multi-replica scheduling behavior is therefore unproven.
- Metrics are per-process and reset on restart; multi-replica aggregation requires an external collector.

## Upgrade and rollback

- `upgrade.sh` takes a backup, builds, migrates, and restarts. It is an operator script, not a versioned immutable release mechanism.
- Migration rollback is restore-based; Prisma has no down migration path.
- Image tags and source checkout are not cryptographically pinned in the deployment workflow.
- The restore mechanism used by the script is unsafe/contradictory; therefore the upgrade rollback story is not trustworthy until VCA-004 closes.
- Capability version/pinned upgrade semantics do not exist independently of whole-application deployment.

## Deployment hardening summary

Positive: localhost bind, non-root app, capability drop, no-new-privileges, bounded logs, strong generated secrets, env-file permission checks, runtime DB role, health checks.

Negative: privileged URL in web, floating images, missing scheduler, no full offline identity path, incomplete restore, no orchestrator/HA profile, no current container acceptance.
