# What the system correctly refused

The half of an audit that usually goes unwritten. Each of these was actually attempted or
verified against the running system or the live database, and each held.

## Tenant isolation (INV-001)

- **Runtime role cannot bypass RLS.** `current_user = verity_app`, `rolsuper = false`, `rolbypassrls = false`. Read directly from `pg_roles` through the application's own `DATABASE_URL`.
- **RLS is on and FORCED on every table that holds data.** 112 tables in `public`; `relrowsecurity` and `relforcerowsecurity` are both true on 111 of them (the exception is `_prisma_migrations`, F-022). Every one of those 111 has at least one policy — `RLS_ON_NO_POLICY` is empty.
- **131 policies, none of them `USING (true)`.** Every policy compares to `verity.current_tenant_id()` except the eight on `party`/`user`, which use `verity.party_visible(id)` / `verity.user_visible(id)` — reachability through `tenant_membership`, exactly as `CLAUDE.md` documents. Both functions were read: they join `tenant_membership` on `verity.current_tenant_id()` and are `SECURITY DEFINER` with a pinned `search_path`.
- **With no tenant scope set, every read returns nothing.** Counting rows in `tenant`, `trading_product`, `trading_customer`, `trading_invoice`, `party`, `user`, `tenant_membership`, `activity`, `domain_event`, `stored_file`, `evidence`, `plywood_shade`, `plywood_texture`, `plywood_product_detail`, `godown_rack`, `security_audit_event`, `capability_definition`, `role`, `permission` with no GUC set returned **0 for all nineteen**. Isolation fails closed.
- **Scoped to tenant A, tenant B is invisible.** Inside `set_config('verity.tenant_id', <A>, true)`: 1 tenant row visible, 0 rows for tenant B's id, 31 products (all A's), 0 of B's products. Same for parties, users, memberships, activity, events, roles and permissions.
- **The newest tables are covered.** `plywood_shade`, `plywood_texture` and `plywood_product_detail` — the ones the brief singles out as the usual gap — all carry RLS, FORCE and a tenant policy.
- **HQ is gated server-side and discloses nothing.** As `ownerA`, `ownerB`, `managerA`, `staffB` and `rolelessB`, all four `/hq*` routes redirected to `/` with no HQ content in the response body. The gate is `resolveOperator()` in the layout (`src/app/(hq)/layout.tsx:24-25`), and `requireOperator()` writes an `AuthorizationDenied` security event before throwing.
- **An operator who has switched into a client is not an operator for that request.** `resolveOperator` requires both `verity.is_platform_operator(authUser)` and `is_platform` on the *active* tenant, read under that tenant's own scope.
- **`Global` scope cannot silently take effect.** `verity.resolve_permissions` ends with `WHERE p.scope <> 'Global'`.
- **Tenant context is never taken from the request.** `resolveActor()` reads the membership cookie, then accepts it only if it appears in `verity.memberships_for_auth_user(<authenticated id>)`. `switchOrganization` re-verifies the same way.
- **`provision_identity` re-checks the tenant by hand.** It is `SECURITY DEFINER`, so it bypasses RLS — and it raises `42501` if the target organization does not belong to the current tenant. The check is there and correct.

## Immutability and the audit trail

- **28 triggers enforce append-only and posted-document immutability**, including `activity`, `domain_event`, `security_audit_event`, `evidence`, `journal_entry`, `journal_line`, `stock_ledger_entry`, `trading_ledger_entry`, `billing_invoice`, `billing_meter_reading`, `inventory_stock_movement`, `hr_leave_decision`, and `UPDATE` blocks on `trading_invoice`, its lines and notes, goods receipts and issues, payments and bill confirmations.
- **The policy set matches.** `activity`, `domain_event`, `security_audit_event`, `evidence`, `journal_entry`, `journal_line`, `inventory_stock_movement`, `hr_leave_decision`, `billing_meter_reading` and `billing_invoice` carry only `INSERT` and `SELECT` policies — there is no `UPDATE` or `DELETE` policy to reach even before the trigger fires.
- **`party` and `user` have no `INSERT` policy at all**, which is what forces every identity through `provisionIdentity()`.
- **Role composition cycles are blocked in the database** (`role_composition_no_cycle`), as is `workflow_edge` recursion, and `booking_no_overlap` is enforced by trigger rather than by application code.

## Secrets

- **No secret in git history.** Every blob under 400 KB in all 397 commits (8,129 blobs) was scanned for Supabase JWTs, `gsk_`/`sb_secret_`/`re_` keys and AWS access-key ids. **Zero matches.** The only credential-shaped strings in history are placeholders in `.env.example`, `docker-compose.yml`, the CI workflow and test fixtures.
- **No `.env` file was ever committed.** `.gitignore` covers `.env*` with a single `!.env.example` exception.
- **No secret in the client bundle.** Each of `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `JWT_SECRET`, `MAINTENANCE_TOKEN`, `RESEND_API_KEY`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` and both database passwords was searched for verbatim in `.next/static` — 0 occurrences each. The nine production JS chunks served by `https://app.theverityai.xyz/sign-in` (579 KB) were downloaded and searched for `service_role`, `CRON_SECRET`, `JWT_SECRET`, `RESEND_API_KEY`, `postgresql://` — **no matches**, and no `sourceMappingURL`; requesting a `.map` returns 403.
- **`localStorage` and `sessionStorage` are empty** for all six signed-in identities.
- **`NEXT_PUBLIC_` exposes only the Supabase URL, the anon key and the Sentry DSN** — all public by design.

## Authentication and API surface

- **Signed out, all 47 routes redirect to `/sign-in` and return no content** (body length identical, 696 characters, on every one).
- **`/api/scheduled` returns 401** to an unauthenticated POST, and 503 when no secret is configured. The secret comparison is `timingSafeEqual` with a length pre-check (`src/app/api/scheduled/route.ts:50-55`), and the 401 body is deliberately identical to the missing-tenant shape.
- **`/api/metrics` requires the same secret in production** (`src/app/api/metrics/route.ts:37-47`, also `timingSafeEqual`) and carries no tenant-identifying labels.
- **`/api/agent/chat` returns 401** without a session, with no distinguishing detail.
- **Sign-in does not distinguish "no such user" from "wrong password"**, and the rate-limit refusal is worded identically so throttling cannot be used as an enumeration oracle. The attempt is counted **before** the credential check, so a correct-password probe still costs a slot.
- **Passwords do not reach the server-action log.** `signInWithPassword` takes `FormData` specifically to defeat Next.js's argument logging, and the reason is written down at `src/server/actions/platform.ts:130-138`.
- **`resetTeamPassword` re-verifies** that the target `authUserId` holds a membership in the caller's tenant before touching Supabase admin APIs.
- **Security headers are served on both localhost and production**: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security: max-age=63072000; includeSubDomains`, and `poweredByHeader: false`. (CSP is absent — F-007.)

## Query construction

- **Only two `$queryRawUnsafe` calls exist in the whole application** (`src/server/capabilities/trading/finance.ts:2713` and `:2759`), and both pass every value as a positional parameter. The single interpolated identifier is `partyColumn`, whose type is the literal union `"customer_id" | "supplier_id"` and which is supplied by the two call sites in the same file, never by a request. No `$executeRawUnsafe` exists outside the audit's own probes.
- **Every other raw query is a tagged template**, which Prisma parameterises.
- **No loose zod schema.** `passthrough()` and `catchall()` appear nowhere in `src/server`; the only `z.unknown()` uses are the two custom-field payload bags (`evidence/index.ts:60`, `location/index.ts:294`), which are validated against declared field definitions server-side.

## The agent channel (ADR-017)

- **The agent has no authority of its own.** Every tool call goes `runCommandBatch → executeCommand(actor, …)` / `executeQuery(actor, …)` with the calling human's `ActorContext`, and `buildToolManifest` filters the visible tool list through `resolve_permissions` for that actor's role before the model sees it. No service-account path, no elevated client, no separate credential. `channel` is recorded and consulted by no authorization rule. **ADR-017 holds under inspection.**
- **The provider key never leaves the server** and is not echoed in tool output or error text.

## Regulatory logic that is right

- **CGST+SGST vs IGST is derived from state codes**, never from a flag (`finance.ts:130-166`), and a `CHECK` constraint (`plywood_invoice_tax_pairing`) makes it structurally impossible for one invoice to carry both.
- **Invoice numbering is gapless, monotonic, per-series and per-financial-year**, taken under `SELECT … FOR UPDATE` inside the command's own transaction; a rolled-back command returns the number rather than burning it. (The financial year itself is computed in the wrong timezone — F-024.)
- **Issued invoices are immutable in the database**, not merely in the application, and corrections go through credit/debit notes which copy the original's rates rather than recomputing them.
- **A missing HSN degrades to the tenant's configured default rate and refuses if none is configured** — it never silently becomes zero — and period close flags missing-HSN sales invoices and zero-tax purchases as blockers.
- **`gstApplicable` cannot be flipped after goods have moved**: `editPurchaseOrder` refuses once any receipt exists, and `editSalesOrder` does not expose `taxExempt` at all after creation.
- **Money is integer paise throughout** — 42 `*Paise Int` columns, no `Float` or `Decimal` on any money field.
- **No facility for concealing taxable trade was found**, and none was built. The per-order `gstApplicable` switch is the legitimate unregistered/composition-supplier case, recorded on the document rather than hidden.

## Legacy contamination — NONE FOUND

Every forbidden identifier in `CLAUDE.md`'s list was searched for across `src/` and `prisma/`:
`factoryId`, `factory_id`, `vehicleBrandId`, `vehicleModelId`, `vehicleYear`, `seatType`,
`hasArmrest`, `headrestCount`, `ProductionBatch`, `BomMode`, `QCTemplate`, `.verity-glass`, and
the `SystemRole` enum values. **Zero matches.** No `/owner`, `/worker`, `/inspector`,
`/supervisor` or `/verity` route directory exists. No `legacy_archive/` in the active tree.

The only trace found anywhere is a comment line in `.env` reading
`# Verity HQ operators (cross-tenant admin at /verity)`, naming a route that no longer exists —
stale documentation, not code.

## Capability dependency (ADR-018)

`plywood` declares `trading` as a dependency and the constraint is enforced **in the database**,
not in application code: `tenant_activation_requires_dependencies` fires `BEFORE INSERT OR UPDATE`
on `tenant_activation`, and `tenant_activation_protect_dependants` fires `BEFORE DELETE OR UPDATE`
to stop a dependency being deactivated out from under a dependant. Activating `plywood` without
`trading` cannot be done by any caller, including one that bypasses the application entirely.

## Input validation that is correct

- **HSN** is validated as 4, 6 or 8 digits by a single shared validator (`trading/keys.ts:34-39`), used by both the plywood and the trading capability.
- **Discounts** are capped: `discountBps: z.number().int().min(0).max(10_000)` at all four call sites.
- **Quantities** are `z.number().int().positive()` throughout orders, receipts, issues and stock movements — no zero, no negative, no float.
- **Money** is integer paise in the schema and in every input.
- **The state code is never asked for separately** — it is derived from the GSTIN's first two characters, with the reasoning written down: a separate field "creates a field that can disagree with the number it came from — a disagreement that decides CGST+SGST against IGST on every invoice the business ever raises."
- **Server-side revalidation of custom fields** is present *where it is used*: `validateCustomFields` (`src/server/platform/entity.ts:104`) compiles the declared field definitions and refuses input that does not match, and `verity.location.set_custom_fields` calls it. It has **only that one caller** — the evidence capability's `payload: z.record(z.string(), z.unknown())` (`evidence/index.ts:60`) is stored unvalidated. Recorded as F-030 rather than as a pass.

## Two attempts that failed structurally

- **Attaching a new identity to somebody else's existing auth account.** `invitePerson` accepts a
  client-supplied `authUserId` (`administration.ts:227`), which looks like a way to mint a Party
  bound to another person's Supabase account and so grant them an unsolicited membership in your
  tenant. It cannot work: `User.authUserId` is `@unique` globally (`prisma/schema.prisma:262`), so
  `verity.provision_identity`'s insert fails. The refusal is a database constraint, not an
  application check — which is the right place for it. (The resulting error text reaches the
  client raw, which is F-014.)
- **`Global`-scoped grants.** A `Global` permission row can be created, but
  `verity.resolve_permissions` ends with `WHERE p.scope <> 'Global'`, so it resolves to nothing.
  `CLAUDE.md` records this as deliberate: the row can exist without silently taking effect.

## Response shape

`listPeople` and the other administration reads return `email`, display name, organization and
role — and never `authUserId`. The only occurrences of `authUserId` outside the identity
primitive are in the operator context and the invite input. No query was found returning a full
user record where a display name would do.

## Business rules enforced in the command, not in the screen

Each of these was traced to the line that refuses:

| Rule | Where it refuses |
|---|---|
| Moving out more stock than a godown holds | `trading/stock.ts:136-141` — `SELECT … FOR UPDATE` on the stock row, then a refusal naming the actual quantity, **and** a database `CHECK` constraint behind it |
| Inward movement with no unit cost | `trading/stock.ts:132-135` |
| Transferring between the same two godowns | `trading/stock.ts:358-362` |
| Ordering or moving a `TEMPLATE` product | `trading/orders.ts:795-805` — checked by name so the refusal says which product and why |
| Invoicing the same order twice | `trading/finance.ts:269`, `:598` |
| Posting into a closed period | `assertPeriodOpen` at `finance.ts:338, 636, 1006, 1353, 3362` — five call sites, every document-raising path |
| Flipping `gstApplicable` after goods have been received | `orders.ts:1171-1184` |
| Editing an issued invoice | database trigger `plywood_posted_document_immutable`, not application code |
| Removing your own membership | `administration.ts:350-355` |
| Activating a capability without its dependency | database trigger `tenant_activation_requires_dependencies` |
| Role-composition cycles | database trigger `role_composition_no_cycle` |

The pattern is consistent and it is the right one: the guard is in the command, the backstop is
in the database, and the message names the thing that is wrong.

## The HQ / tenant boundary (ADR-013)

- **The three cross-tenant projections carry metadata only.** `clientDirectory` returns tenant
  name, timezone, member and organization counts; `platformActivity` returns per-tenant activity
  and security-event **counts**; `platformAudit` returns audit rows with the entity key, the
  command key and the **name** of the field that changed — never its value, and never a payload
  body. All three go through named `SECURITY DEFINER` functions keyed on the operator's own auth
  user id, so the cross-tenant read is a reviewable, grantable, revokable object rather than an
  incidental consequence of the runtime role's reach.
- **An operator entering a client is recorded in the client's own audit trail** — a
  `PermissionEscalated` security event with `reason: "operator_entered_client"`, written inside
  the client's tenant scope. The reason is stated in the code: "a privileged action a client
  cannot see is one they cannot question."
- **The operator role inside a client is deliberately narrow** — identity, organization and role
  administration, not a blanket grant over the client's business entities.
- **The platform tenant cannot be entered as a client**, in either `enterClient` or
  `operatorActorFor`.
- **A tenant user reaching an HQ route is recorded**, not merely refused: `requireOperator`
  writes an `AuthorizationDenied` event in the actor's own tenant before throwing.

## Audit-row quality, where rows exist

- **Every Activity row names an actor.** 0 of tenant A's 73 rows has a null `actor_user_id`.
- **Every one names a field and at least one value.** 0 rows have a null `field_changed`; 0 have
  both `old_value` and `new_value` null. The diff is human — `"Close accounting periods":
  "not allowed" → "allowed"` — not a bare "changed".
- **History written before the ADR-018 rename still renders with human labels.** 36 of the 73
  rows carry pre-rename keys (`verity.plywood.set_role_activity`, `.approve_credit`,
  `.set_credit_limit`, `.cancel_purchase_order`). `COMMAND_LABEL`
  (`src/components/ui/business/vocabulary.ts:199-202`) carries entries for **both** the
  `verity.plywood.*` and the `verity.trading.*` spelling of every renamed command, so old rows
  render as sentences rather than as raw keys. This is the Phase 4 check the brief asks for, and
  it passes.
- **Activity is written inside the mutation's own transaction** (`audit.ts:112-117`), so a rolled
  back command cannot leave an audit row behind and a committed one cannot lose it.

## The substrate claims in `CLAUDE.md`, checked

- **Temporal.** A timezone is validated on write against Postgres's own tz database
  (`verity.is_valid_timezone`, called from `temporal.ts:33-35`), not against a hand-kept list —
  so an unrecognised zone is refused rather than silently degrading to UTC. Instants are UTC.
  (The one place a zone is *not* consulted is `financialYearOf` — F-024.)
- **Notifications.** A suppressed notification is **recorded**, not dropped: the row is written
  with `status: "Suppressed"` (`notification.ts:100-114`) and counted separately in the return
  value. Templates substitute literally.
- **SLA.** Clock transitions derive from `StateCategory`, never from a state key or label
  (ADR-009).
- **Capability contributions.** The shell holds no capability-to-route map; navigation is
  declared by the capability. Verified by the observed behaviour of six identities across three
  different capability sets — each sees a different navigation, from the same shell code.
- **Files.** The two-phase upload freezes key, checksum and size at confirmation by database
  trigger (`stored_file_immutable_once_stored`), not by application code.

## Page-level authorization, where it exists

Eight of the sixteen pages that read the database directly gate correctly with
`hasPermission(tx, actor.roleId, verb, entity)` — which resolves through the same
`verity.resolve_permissions` Layer 1 uses (`authorization.ts:66-80`) — and render a real refusal
state rather than an empty one:

> *"You do not have access to this. Your current role does not permit reading locations.
> Switching organization in the header may change what you can see."*

Observed as the roleless identity on `/audit`, `/locations` and `/godowns`. `/locations` gates on
the Layer 2 scope resolving to an empty organization set, which is the fail-closed answer.

The pattern exists, is well worded, and is applied on most pages — which is what makes its
absence on `/` and `/capabilities` (F-034), and its ad-hoc replacement on `/audit` (F-033), a
defect rather than a design.

Note that `hasPermission` returns a boolean where `authorize()` throws, so a caller that forgets
to branch permits the action. Every current caller branches correctly; the risk is structural,
not present.

## Reaching another tenant's records by id — refused, and indistinguishably so

Every id-bearing route was loaded three times as the tenant A owner: with **tenant B's real
record id**, with a **nonexistent UUID**, and with the actor's **own** id. Run fresh against
commit `363f098`.

| Route | foreign tenant's real id | nonexistent uuid | own id |
|---|---|---|---|
| `/catalogue/[productId]` | 200, 502 chars | 200, 502 chars | 200, 1,323 chars |
| `/stock/[productId]` | 200, 502 | 200, 502 | 200, 782 |
| `/customers/[customerId]` | 200, 502 | 200, 502 | 200, 1,072 |
| `/suppliers/[supplierId]` | 200, 502 | 200, 502 | 200, 961 |
| `/sales/[orderId]` | 200, 502 | 200, 502 | 200, 1,138 |
| `/purchases/[orderId]` | 200, 502 | 200, 502 | 200, 1,056 |
| `/finance/[invoiceId]` | 200, 502 | 200, 502 | 200, 1,302 |
| `/godowns/[locationId]` | 200, 502 | 200, 502 | 200, 3,809 |
| `/locations/[id]` | 200, 502 | 200, 502 | 200, 1,059 |
| `/counter/[billId]` | 200, 92 | 200, 92 | 200, 92 |
| `/floor/[orderId]` | 200, 93 | 200, 93 | 200, 93 |
| `/hq/clients/[tenantId]` | redirect to `/overview` | redirect to `/overview` | redirect to `/overview` |

**Two properties hold at once.** Nothing from the other tenant is disclosed — RLS refuses the row
before any handler sees it. And the foreign-id response is **byte-identical** to the
nonexistent-id response on every route, so the difference the brief asks about — whether "not
found" and "forbidden" are distinguishable — does not exist here. An outsider cannot use these
routes to learn which ids are real. The same probe run in the reverse direction (tenant B's owner
against tenant A's ids) gives the same result.

This is the strongest evidence in the audit that INV-001 holds where it matters most: at the
point a real id is presented by a real, authenticated user of another tenant.
