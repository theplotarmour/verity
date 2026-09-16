# Prioritized Remediation and Certification Roadmap

No remediation was implemented during this audit.

## Gate 0 — Contain immediate exposure

1. Do not deploy any artifact built from the current stale `node_modules`; reinstall from lock and verify Next 16.3.3+.
2. Do not expose the current localhost 16.2.10 runtime.
3. Remove `DIRECT_URL` from the web service design before any on-prem launch and plan credential rotation for any environment that used it.
4. Label OIDC as bearer-verification-only and on-prem profiles as not production-ready until interactive identity is implemented.
5. Do not rely on `restore.sh` for a production recovery.

Exit gate: containment is documented, deployed artifacts/credentials inventoried, and no web runtime holds migration superuser credentials.

## Gate 1 — Restore a trustworthy release signal

1. Fix duplicate CI environment keys without weakening the private session-secret requirement.
2. Repair config and GSTIN fixtures; keep validators fail-closed.
3. Make lint scope ignore local nested worktrees/mockups while preserving clean-tree lint.
4. Run clean `npm ci`, exact version assertion, Prisma generation, typecheck, lint, full tests, build.
5. Add dependency policy for patched Vitest 4.1.11+ and critical production packages.

Exit gate: required GitHub job is green on the exact commit and cannot be skipped.

## Gate 2 — Close security boundary defects

1. Enforce active capability at route/layout level and inventory every direct data read.
2. Add absent/active/suspended/dependency-missing tests for every route/action/API.
3. Narrow `next/image` remote host to the configured storage project and verify malicious AVIF/remote URLs are rejected.
4. Review SECURITY DEFINER functions; revoke PUBLIC execute and grant per role/function.
5. Normalize expected unauthenticated navigation logging.

Exit gate: no P0/P1 security findings; hostile two-tenant, role/scope/redaction, session, upload, agent and endpoint tests pass.

## Gate 3 — Produce one supportable on-prem profile

Recommended first profile: single Linux host, reverse proxy/TLS, local PostgreSQL, MinIO, and one explicitly supported identity option.

1. Decide and implement either complete OIDC browser/provider-neutral lifecycle or explicitly supported hybrid Supabase auth.
2. Add local scheduler with monitoring and overlap control.
3. Split init/configure/install so preflight runs after a complete profile is configured.
4. Pin all images by digest and publish SBOM/signature/provenance.
5. Add profile-aware readiness for schema and required dependencies.
6. Add resource bounds, secrets handling, log/metric collection, rotation and support runbooks.

Exit gate: non-expert operator installs from empty VM, completes login and a representative workflow, reboots, upgrades, and observes all cadences.

## Gate 4 — Make recovery real

1. Choose one backup contract; reconcile or retire the contradictory runbook/script.
2. Fail closed on every restore error.
3. Pair DB and object-store backups; separately protect/rotate secrets and IdP config.
4. Verify migrations, counts, relationships, RLS, grants, functions, triggers, files, auth mapping and scheduled work after restore.
5. Set and measure RPO/RTO; add off-host encrypted retention and periodic restore drills.

Exit gate: blind destroy-and-restore rehearsal succeeds; injected failure is detected before traffic; rollback is proven.

## Gate 5 — Decide the modular product promise

If Verity is sold as controlled, developer-led client delivery, document that scope and certify the named client capability bundles. If it is sold as a complete modular platform:

1. Implement Industry Pack manifest/preview/apply/version/rollback.
2. Implement enforceable capability compatibility and tenant upgrade lifecycle.
3. Implement the constrained extension package/hook/UI contribution boundary.
4. Add generic dashboard and document/checklist template contracts.
5. Expand custom-field/dynamic-form coverage and versioned configuration schemas.
6. Certify each of the 20 capabilities against all 31 implementation and 8 reusability requirements, including performance baselines.

Exit gate: empty tenant can be built, configured, upgraded and rolled back through supported control-plane operations with zero direct SQL/core edits, and suspended capabilities are inaccessible on every plane.

## Certification order

1. CI/release reproducibility.
2. Least-privilege runtime and active-module security.
3. One complete identity/storage/scheduler on-prem profile.
4. Backup/restore and upgrade rollback.
5. Tenant isolation and authenticated browser/API end-to-end proof.
6. Client capability completion dossiers.
7. Pack/version/extension modular-platform certification.
8. Optional HA and air-gapped profiles only after their topology is explicitly designed.

