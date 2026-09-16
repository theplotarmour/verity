# Untested and Blocked Evidence

## Mandatory tests not completed

| Track | Status | Concrete blocker | What would unblock it |
|---|---|---|---|
| Full 72-file Vitest suite | UNTESTED | only configured DB is remote/shared; guard correctly refuses it | disposable localhost PostgreSQL with migration/runtime roles |
| Cross-tenant CRUD/RLS suite | UNTESTED | same | isolated DB seeded with at least two tenants |
| Playwright 5-spec suite | UNTESTED | shared data and no isolated seeded app | isolated DB + test auth + local app |
| Current migration from empty cluster | UNTESTED | Docker and psql unavailable | disposable Linux/Docker lab |
| Enterprise Compose build/up | UNTESTED | Docker unavailable | supported Docker Engine/Compose host |
| MinIO upload/read/quarantine/delete | UNTESTED | Docker/object store unavailable | isolated Compose MinIO profile |
| OIDC browser login | BLOCKED BY IMPLEMENTATION | no authorization-code/callback flow | implement flow plus test IdP |
| On-prem scheduled cadences | BLOCKED BY IMPLEMENTATION | no scheduler service/binding | supported local scheduler |
| Capability activate/suspend direct-route matrix | UNTESTED but static defect confirmed | would mutate shared tenant | isolated client fixture |
| Backup/restore/failure injection | UNTESTED | destructive and no isolated lab | disposable source/target DB and object store |
| Upgrade/rollback | UNTESTED | depends on trusted restore and versioned artifact | close VCA-004 and prepare lab |
| HA/multi-replica | PROFILE ABSENT | no topology/manifests | defined supported profile |
| Air-gapped install/update | PROFILE ABSENT | no IdP/package/update bundle | explicit offline product design |
| Performance/load baseline | UNTESTED | no SLO/load profile or lab | accepted metrics and representative dataset |
| Penetration/DAST | UNTESTED | no authorized isolated target | disposable deployed environment and rules of engagement |

## Evidence that must not be substituted

- The successful clean build does not substitute for tests, migrations, or runtime security.
- Live RLS catalog state does not substitute for a fresh-cluster migration or hostile two-tenant query suite.
- Historical task-plan results do not substitute for this commit's gates.
- The sign-in screenshot does not prove authenticated client workflows.
- Compose source review does not prove container boot, persistence, recovery, or offline operation.
- A 200 `/api/ready` does not prove authentication, storage, scheduled work, business data, or restore completeness.

## Safe next audit environment

Use a disposable Linux VM with Docker Compose, no route to customer databases, local PostgreSQL, MinIO, a test OIDC provider and/or disposable Supabase project, synthetic tenants, and explicit outbound network capture. Bind the exact Git SHA and dependency/image digests to every result. Do not use `VERITY_TEST_ALLOW_REMOTE_DATABASE=1` against the currently configured endpoint.

