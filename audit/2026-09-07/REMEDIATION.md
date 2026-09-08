# Audit remediation — 7 September 2026

This records code changes against the original findings. Production business records
were not modified and no production migration or deployment was performed. The original
audit files remain evidence of the pre-remediation state.

## Changes by finding

“Fixed” below means implemented in this branch, not deployed or re-audited
against the production service.

| Finding | Status | Change / remaining boundary |
| --- | --- | --- |
| F-001, F-002 | Fixed root cause | Customer exposure uses at most three set-wise reads, irrespective of customer count, including allocations and invoice notes. Lists call it once for the entire customer set. Commands no longer open a second transaction when there are no after-save hooks. Production page latency still needs a deployment smoke test. |
| F-003, F-004 | Fixed | Shared grant ceiling covers invitations, role assignments, direct permission grants, role composition, and the business-activity permission editor. A reusable role can confer only permissions the actor holds at Tenant scope. Self-role assignment is refused. |
| F-005, F-031, F-035 | Exposure closed; narrow-scope functionality limited | Command/query definitions without declared, implemented row scoping require a Tenant grant. Existing explicitly scoped handlers retain their guards. Unanchored customers, invoices and other records no longer silently admit Organization/Location grants. Direct page reads were tightened too. Adding organization anchors and scoped handlers to the remaining capabilities is still separate work. |
| F-006 | Fixed for object/list results | Declared field restrictions now apply to detail objects, arrays and nested values, before agent grounding. Same-named nested fields are conservatively removed. This does not invent field-permission declarations or infer the entity type of every nested relation. |
| F-007 | Fixed in code | Supabase server/proxy cookies use HttpOnly, secure in production, SameSite=Lax and a seven-day maximum age. A fresh nonce CSP is sent and forwarded to Next for bootstrap scripts. Inline styles remain allowed for tenant accents and charts; production scripts do not permit unsafe-eval. Session expiry in the auth provider remains a separate setting. |
| F-008 | Fixed, migration required | Atomic PostgreSQL quotas cover sign-in and per-user command/query/chat requests across replicas. Counters commit separately from business transactions and contain only hashed keys. Chat bodies/history are bounded and validated; team login/reset actions share the quota. |
| F-009 | Fixed in code | Shared server page handling renders explicit inactive-feature/access-denied states. Root and global error boundaries offer retry and a support reference. |
| F-010 | Fixed wiring | Server/edge and client instrumentation now initialize the Sentry configs. Unknown action errors and framework errors reach error metrics/telemetry. Authentication failures produce a separate structured, identifier-free operational log and counter. Actual Sentry delivery depends on deployment configuration and was not tested with a live DSN. |
| F-011 | Fixed | Any failed scheduled outcome produces HTTP 503 and an explicit failure flag. Per-tenant exceptions no longer abort later tenants. Failures are logged. |
| F-012 | Fixed | Dine-in billing refuses missing, non-numeric or invalid GST rates. An explicitly configured zero remains allowed. |
| F-013 | Fixed | Missing meter readings refuse invoice creation; an explicit zero reading remains billable at zero. |
| F-014 | Fixed | Unknown action failures return a generic message, with the underlying exception retained through observability. |
| F-015 | Mitigated | Authority mutations and the audited destructive business commands require batch/agent confirmation. Delete verbs also require confirmation. Tool responses are marked as untrusted data and the system prompt explicitly forbids following instructions in records. This is not a claim that prompt injection has been eliminated. |
| F-016 | Fixed | Removed the public anon-key signing fallback. Supported sources are private SUPABASE_JWT_SECRET, VERITY_SESSION_SECRET, or the existing private JWT_SECRET alias. Missing private signing material fails configuration validation. |
| F-017 | Fixed verification and serving | Confirmation streams and checks actual size, SHA-256 and file signatures, quarantines mismatches permanently, and stores verified bytes at a fresh key to prevent upload-URL replay. Both drivers serve attachments. S3 signs length and create-only uploads; Supabase refuses public buckets or buckets without a maximum upload size of 25 MB. Private S3 bucket policy is a deployment prerequisite. This is not antivirus scanning. |
| F-018 | Fixed at validation time | Removed unused Serwist/idb dependencies, updated vulnerable transitive dependencies, and scoped an override to deepmerge-ts 8 for @prisma/config. npm audit reports zero vulnerabilities. Prisma generation, migration replay and the application build were exercised with the resulting lockfile. |
| F-019 | Fixed at page level | Removed swallowed permission errors that impersonated empty financial datasets. If a required query is denied, the page shows an access-denied state. Independent per-panel access rendering remains a possible UX refinement. |
| F-020 | Hardened | Unknown exception message bodies and stack context are withheld from outgoing Sentry events. Existing request/body/cookie/extra scrubbing remains. |
| F-021 | Contract documented | src/server/platform/CLAUDE.md explicitly retains the existing globally shared, last-committed-write identity attributes and lifecycle. Tenant-specific labels belong in scoped profiles; tenant-local removal uses membership revocation. No tenant-specific Party copies were introduced. |
| F-022 | Fixed by migration | Runtime/PUBLIC access to _prisma_migrations is revoked. The deployment role retains migration access. |
| F-023 | Fixed | GSTR-3B separates booked and eligible ITC and marks unconfirmed purchase bills as unsubstantiated. ITC reconciliation filters out unconfirmed bills. No historical invoice or filed return was rewritten. |
| F-024 | Fixed | Every numbering call resolves the tenant timezone; financial-year rollover occurs at the tenant's April midnight. |
| F-025 | Fixed | Exposure, order details, party details/payment histories and ageing use payment allocations. A multi-invoice payment no longer disappears from those readers. |
| F-026 | Unsupported path blocked | New composition registration is refused. Existing composition registrations are prevented from generating ordinary numbered documents or GSTR-1/3B working papers. Bill of Supply and composition returns are not implemented. |
| F-027 | Arithmetic/concurrency fixed; regulatory integrations open | Odd basis-point rates split without adding a basis point. Transaction advisory locking serializes first-document creation. Aggregate conversion refuses values outside safe integer range. Reverse-charge and e-invoice/IRN workflows remain unimplemented. |
| F-028 | Fixed for command mutations, migration required | Database triggers append actual field changes under the command's actor, correlation ID and channel, including when a handler omits Activity/events. They roll back with the business write. Structured values and configuration values are withheld to avoid persisting nested secrets. Domain events remain explicit business facts rather than invented fallback events. Existing handler-authored business descriptions remain alongside the structural records. New tenant tables need the trigger in their migration. |
| F-029 | Fixed for new inputs | One shared GSTIN validator checks format, recognized state code and base-36 check digit. Historical state codes remain accepted; the government state master also includes 97/99, so the audit's simple 01–38 assertion was not adopted verbatim. |
| F-030 | Fixed | Evidence payloads pass the custom-field validator before being stored. |
| F-032 | Action-control sweep implemented | Server-resolved command eligibility now gates mutation buttons across 34 shell components, including list/detail screens, settings, stock, payments, floor and tax. Role selectors and floor drag controls respect permissions too. Static rendering tests prove denied actions are absent; registered command mappings are checked. Record-specific business rules remain server-enforced. |
| F-033 | Fixed | Audit and security streams use explicit Read grants. The shell's Audit link follows the same explicit grant, and the trading activity feed no longer uses invoice-read authority. |
| F-034 | Fixed | Roleless overview is refused before business reads. Overview/capability screens require explicit grants, and roleless shell loading omits activation data. |
| F-036 | Fixed dependency/documentation gap | Removed unused @serwist/next, serwist and idb and the nonexistent-service-worker comment. Offline service-worker support is not implemented. |
| F-037 | Fixed for execution refusals | Command/query authorization failures are recorded in a separate transaction after rollback, including scope refusals. Recording failures are themselves logged. Pre-authentication failures use the separate operational signal described above. |
| F-038 | Fixed | Offline enqueue uses conflict-safe insertion and then reads the winning row. Unrelated database failures propagate; they cannot be reported as successful duplicates. |

## Rollout requirements

1. Apply `20260907000000_audit_controls` and `20260908000000_shared_request_quotas` with the normal deployment role before
   rolling out the application code. It installs structural Activity triggers,
   backfills explicit audit/overview/capability Read permissions for roles already
   holding Tenant-scoped Edit on the platform role entity, and restricts migration
   metadata access. The second migration installs shared request quotas; grant the runtime role execution of `verity.consume_request_quota(text, text)` if it uses a name other than `verity_app`, while keeping direct table access revoked. Neither migration widens business grants.
2. Review existing roles: Organization/Location grants on unanchored or unscoped
   operations now fail closed. Provide explicit Tenant grants only where intended,
   through an administrator already holding that authority. Do not indiscriminately
   widen branch roles. An existing administrator with only narrow grants may need
   a separately authorized permission migration before administering shared roles.
3. Configure private signing material and verify session-cookie/CSP behavior after
   deployment. No production secret was read out, replaced or rotated in this task.
4. Smoke-test the previously failing production pages and the tax working papers
   after deployment. No live tax submission, historical correction, external
   message or provider-backed assistant turn was performed.

## Validation

Validation used a disposable PostgreSQL 17 instance bound to 127.0.0.1, with a
non-superuser, non-BYPASSRLS runtime role. The production database was not used.
The test setup now reads only an explicitly supplied `.env.test`, not application
`.env`, and rejects remote database URLs unless explicitly opted in.

- All 66 migrations replayed on an empty local database. The final audit function
  and populated-tenant permission backfill were also exercised directly.
- Production build, TypeScript check and ESLint on changed TypeScript/TSX passed.
- Impeccable's mechanical check of changed UI files returned no findings.
- **166 tests passed across 13 focused suites.** These cover command authorization, role ceilings and composition,
  scoped denial, nested field redaction, actual activity values, rollback,
  secret-value withholding, private cookies/CSP, GSTIN/FY, provisional ITC,
  payment exposure, zero/missing readings, file limits, scheduled failures,
  tool manifests, and concurrent numbering/offline enqueue.
- No authenticated browser sweep or full accessibility/viewport audit was run.
  The audit's production-data load and live-cookie claims still need post-deploy
  validation; build/static checks alone do not establish those observations.

## Sources used to resolve regulatory details

- [Government state-code master](https://docs.ewaybillgst.gov.in/apidocs/state-code.html)
- [CBIC composition rules](https://cbic-gst.gov.in/composition-rules.html)

These code changes validate documents and refuse unsupported workflows; they do
not assert that the application implements every condition for GST eligibility
or every required return/integration.

## Follow-up closure work — 8 September

The full regression suite was run beyond the original focused audit tests. Fixtures
were updated for validated GSTIN check digits, permission ceilings, automatic
invoicing on dispatch/receipt, structural audit records, and the existing advisory
credit-limit policy. A scoped plywood stock wrapper now inherits its underlying
handler's scope declaration. CI supplies private dummy signing material and retains
quota-table privilege restrictions after bulk grants. Quota windows reset between
tests only, using the isolated database admin connection.

Remaining product capabilities are explicitly **not complete**: composition filing,
reverse-charge reporting, and e-invoice/IRN registration. The tax UI now states those
boundaries and refuses composition registration. Production migration, authenticated
browser re-audit, real storage-provider delivery, and live Sentry delivery still
require deployment verification. GitHub publication does not establish those checks.

## Final validation after integrating GitHub main

- Full suite: **874 passed, 4 skipped across 64 suites**. The four skips are
  explicitly opt-in live storage checks. Four additional bucket-policy and quota
  privilege checks then passed (878 distinct passing tests in total).
- Production build and TypeScript check passed on the combined patch. Full ESLint
  completed with no errors and one existing TanStack `incompatible-library` warning.
- `npm audit --omit=optional --audit-level=low`: zero vulnerabilities.
- The upstream assistant preview flow keeps the audit's quota and body limits;
  preview batches are capped at 50 and six route tests cover refusal and success.
- All 66 original migrations replayed locally; the 67th shared-quota migration
  applied successfully to that isolated database.
- Prisma's implicit `.env` loading caused earlier live-storage fixtures to contact
  the configured provider. Three temporary `lr-scan.txt` artifacts were identified
  by exact fixture contents and creation times, then removed. Live Supabase tests
  now require `VERITY_TEST_STORAGE=1`; their cleanup covers the sealed key too.
  The new private-bucket/25 MB policy check refused the existing bucket settings.
  No bucket settings were changed. Validate the configured provider after rollout.

GitHub replay applied all 67 migrations successfully. Its role-safety assertion
needed a correction: PostgreSQL concatenates booleans as `false`, not `f`; the
assertion now matches the actual non-superuser/non-BYPASSRLS output.
