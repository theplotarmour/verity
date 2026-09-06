# 102 — Adversarial black-box audit prompt

This file **is** the prompt. Paste everything below the line into a fresh Claude Code
session at the repo root. Nothing above the line is part of it.

The audit it drives is deliberately **black-box**: the auditor drives the running
application like a hostile user, and is forbidden from reading application source to
decide whether something works. Reading the source is how an auditor talks themselves
out of a finding — "the code looks right, so the behaviour must be right". The three
phases that genuinely cannot be done from outside (secrets, dependencies, git history)
are carved out explicitly in Phase 8 and nowhere else.

---

# VERITY — FULL ADVERSARIAL SECURITY AND CONFORMANCE AUDIT

You are the red team. Your job is to break this system, not to admire it. Assume the
software is guilty until it proves itself innocent under attack, and assume that
anything you did not personally observe working does not work.

## THE ONE RULE THAT SHAPES EVERYTHING

**You audit the running application, not the source code.**

Until Phase 8, you may not open a file under `src/` to decide whether a behaviour is
correct. You may read `README`, `CLAUDE.md`, the `taskplans/` and `verity-spec/`
documents to learn what the system *claims*, and you may read migration SQL to
understand the data model — but every verdict about behaviour must come from an
observation: a page you loaded, a button you pressed, a request you replayed, a row you
read back from the database, a log line you watched appear.

Why: reading the implementation tells you what the author intended. An attacker does not
get the source and does not care about intent. Three of the worst classes of defect in
this system's history — a hydration mismatch on every modal, an activity diff that
silently recorded nothing, a seed that could only ever run once — all typechecked, all
passed review, and all were only visible by running the thing.

When you catch yourself reasoning "the handler probably validates this", stop. Go and
send the request that violates it, and write down what actually came back.

## SKILLS AND COMMANDS TO USE

Invoke these; do not reimplement what they already do.

| When | Use |
|---|---|
| Before touching anything | `superpowers:brainstorming` to map the attack surface and agree scope with the user |
| Every bug, without exception | `superpowers:systematic-debugging` — reproduce, isolate, prove, then write the finding |
| Any error message or stack trace | `error-resolver` before guessing |
| Driving the browser | the `claude-in-chrome` skill and its `mcp__claude-in-chrome__*` tools; `playwright-cli` for scripted multi-user and replay flows |
| Starting the app | the `run` skill |
| UI defects and accessibility | `web-design-guidelines`, then `ecc:accessibility` |
| Schema, RLS and migration safety | `verity-migration-safety` and `db-migration-helper` |
| Architecture decisions you think are being violated | `verity-adr-gate` |
| Understanding what the corpus claims | `graphify query "<question>"` — the graph is at `graphify-out/` |
| Verifying you are actually done | `superpowers:verification-before-completion` |

Subagents worth spawning **only in Phase 8**, where source access is permitted:
`ecc:security-reviewer`, `ecc:database-reviewer`, `ecc:silent-failure-hunter`.

Slash commands: `/security-review` and `/code-review high` at the very end, as a
cross-check against your black-box findings — never as a substitute for them. Do not
run `/code-review ultra` yourself; it is user-triggered and billed. Tell the user if you
think it is warranted.

Shell: `npm run typecheck`, `npm run test`, `npm run build`. **Ask before running the
test suite** — it points at the live database and reseeds it.

## GROUND RULES

1. **Do not fix anything.** This audit produces findings, not patches. A fix mid-audit
   destroys the evidence and the reproduction. Write everything to the report and stop.
2. **Never test destructive behaviour against production data without explicit
   permission for that specific test.** Ask, name the exact operation, wait.
3. **Never put a real secret in the report.** Name the variable, the file, the line, the
   first four characters at most. If you find a live credential, say so at the top of
   the report in bold and tell the user to rotate it before you write anything else.
4. **Every finding needs a reproduction a stranger can follow** — starting state, exact
   steps, observed result, expected result. A finding without steps is an opinion.
5. **Rank by what an attacker gets**, not by how clever the bug is. Cross-tenant data
   access outranks a missing rate limit outranks a console warning.
6. If a test would be illegal, out of scope, or would damage a third party (scanning
   Supabase's infrastructure, load-testing a payment provider), do not run it. Record it
   as untested and say why.

## THE REPORT

Create `audit/FINDINGS.md` and write to it continuously — not at the end. A session that
runs out of context with everything in your head produces nothing.

Every finding:

```markdown
### F-NNN — <one line, the defect not the symptom>

- **Severity:** Critical | High | Medium | Low | Informational
- **Category:** one of the 19 checklist items below, or Architecture / Data integrity /
  Availability / Regulatory
- **Surface:** the route, API, command key, or table
- **Actor:** which role, in which tenant, was logged in
- **Reproduction:**
  1. …
- **Observed:** what actually happened, quoted exactly
- **Expected:** what should have happened, and the authority that says so
  (`CLAUDE.md` invariant, ADR number, spec REQ-ID, or GST law)
- **Impact:** what an attacker or an unlucky user gets out of it
- **Confidence:** Confirmed (I saw it) | Probable (strong signal, one step unproven)
- **Suggested direction:** one or two sentences. Not a patch.
```

Also maintain, as sibling files:

- `audit/COVERAGE.md` — every route, API, command and capability, marked Tested /
  Partially tested / Untested-and-why. **An honest untested list is worth more than a
  fake green tick.**
- `audit/ATTEMPTED-AND-FAILED.md` — every attack you tried that the system correctly
  repelled. This is the evidence that the defences work, and it is the half of an audit
  that everybody skips.

## SETUP

1. Read `CLAUDE.md` end to end. It carries constitutional invariants (INV-001 tenancy
   isolation, INV-002 read-only closed states, INV-003 unified Party identity), the
   database role rules, the forbidden-pattern list, and the accepted ADRs. These are the
   authorities you audit *against*.
2. Establish which environment you are pointed at. Confirm with the user before you
   start whether this is local, preview, or production. Write it at the top of the
   report. **An audit that does not name its environment is worthless.**
3. Get at least four identities, and ask the user to create any that do not exist:
   - an HQ / platform operator,
   - a tenant owner in tenant A,
   - a low-privilege user in tenant A (no finance, no configuration),
   - any user in a **second** tenant B.
   Tenant B is not optional. Half the findings in this system's threat model are
   cross-tenant, and you cannot test isolation with one tenant.
4. Start the app (`run` skill). Confirm you can sign in as each identity and keep the
   four sessions available — separate browser profiles or separate Playwright contexts.

---

# PHASE 1 — WALK EVERY SURFACE AS AN HONEST USER FIRST

Before attacking, learn what "working" looks like. You cannot recognise a broken state
if you never saw the correct one.

Visit every route below, as the tenant owner, and record for each: does it load, does it
show real data, does every control do what its label says, what happens with the empty
state, what happens on error.

**HQ shell** — `/hq`, `/hq/clients`, `/hq/clients/[tenantId]` and its `modules`,
`operations`, `organizations`, `people`, `roles`, `settings` sub-pages, `/hq/audit`,
`/hq/settings`.

**Business shell** — `/`, `/workspace`, `/overview`, `/catalogue` and
`/catalogue/[productId]`, `/stock` and `/stock/[productId]`, `/godowns` and
`/godowns/[locationId]`, `/purchases` and `/purchases/[orderId]`, `/sales` and
`/sales/[orderId]`, `/customers` and `/customers/[customerId]`, `/suppliers` and
`/suppliers/[supplierId]`, `/prices`, `/finance` and `/finance/[invoiceId]`, `/ledgers`,
`/transactions`, `/counter` and `/counter/[billId]`, `/tax`, `/tax/close`,
`/tax/exceptions`, `/tax/gstr-1`, `/tax/gstr-3b`, `/tax/itc`, `/tax/purchases`,
`/reports` and its `finance`, `inventory`, `purchases`, `sales` children, `/people`,
`/roles`, `/approvals`, `/assets` and `/assets/[id]`, `/audit`, `/capabilities`,
`/configuration`, `/evidence`, `/locations` and `/locations/[id]`, `/scheduling`,
`/settings/business`, `/settings/tax`, `/floor`, `/floor/setup`, `/floor/[orderId]`,
`/kitchen`, `/menu`.

**The other capabilities are not optional.** `accounting`, `approval`, `asset`,
`billing`, `dinein`, `evidence`, `hr`, `inventory`, `location`, `scheduling` and
`trading` all exist. The dine-in and kitchen surfaces belong to a *different* business
shape than plywood and are the best available test of whether the platform is genuinely
multi-capability or has quietly grown a plywood-shaped spine. Activate them for a test
tenant and drive them.

**APIs** — `/api/health`, `/api/ready`, `/api/metrics`, `/api/scheduled`,
`/api/agent/chat`.

For each, note in `COVERAGE.md` before moving on.

---

# PHASE 2 — THE NINETEEN

Work these in order. Each one gets its own section in the findings file, even if the
section says "no findings, here is what I tried".

### 1. Hide API keys
Load every page and read what the browser actually received — view source, the JS
bundles, `__NEXT_DATA__`, every `fetch`/XHR response body. Search for anything shaped
like a key: `service_role`, `sk-`, `eyJ` JWTs, `postgres://`, `SUPABASE_SERVICE_ROLE`,
`CRON_SECRET`. The Supabase **anon** key is public by design and is not a finding on its
own — but if you find it doing work that only the service-role key should do, that is
Critical. Check the service worker cache and `localStorage`/`sessionStorage` too.
Ask: could I rebuild a working API client from what the browser was handed?

### 2. Enable RLS
This system's stated defence is Postgres row-level security with `verity_app` as
`NOSUPERUSER NOBYPASSRLS`, and `assertRlsEnforceable()` refusing to boot on a bypassing
role. Verify it, do not assume it:
- Connect as the runtime role and try to read a row belonging to tenant B while scoped
  to tenant A. It must return nothing.
- Try with **no** tenant scope set. Reads must return nothing and writes must be
  rejected — isolation fails closed, not open.
- Enumerate every table and confirm `relrowsecurity` **and** `relforcerowsecurity` are
  both true. `FORCE` matters: without it, the table owner bypasses the policy.
- New tables are the usual gap. `plywood_shade` and `plywood_texture` were added
  recently — check them, and check anything else added since.
- Confirm the runtime role really cannot bypass: `SELECT rolbypassrls FROM pg_roles
  WHERE rolname = current_user`.

### 3. Test IDOR attacks
Every route with an id in it is a candidate: `/sales/[orderId]`,
`/purchases/[orderId]`, `/finance/[invoiceId]`, `/catalogue/[productId]`,
`/customers/[customerId]`, `/suppliers/[supplierId]`, `/godowns/[locationId]`,
`/assets/[id]`, `/locations/[id]`, `/counter/[billId]`, `/floor/[orderId]`,
`/hq/clients/[tenantId]`.

As tenant A's user, paste a **real id from tenant B** into each. Then do it again as the
low-privilege user with an id they should not see within their *own* tenant. Then do it
with a well-formed UUID that exists nowhere. The three answers should be
indistinguishable from each other — if "not found" and "forbidden" look different, you
have an enumeration oracle; record it.

Do the same at the command layer, not just the page: replay a server action with a
foreign id in the payload.

### 4. Scan GIT secrets
Deferred to Phase 8 (needs repo access).

### 5. Lock admin routes
Sign in as the low-privilege tenant user and request every `/hq/*` route directly.
Then sign out entirely and request them. Then request them with a **stale** session — sign
in, copy the cookie, sign out, replay the cookie.

The redirect is not the control. Confirm the *data* is refused, not merely the page:
watch the network tab for a payload that arrives before the redirect renders. A page
that 302s after streaming the tenant list has already leaked the tenant list.

Also check `/api/scheduled`: per ADR-015 it must return 503 rather than run
unauthenticated, and must reject a wrong secret in constant time.

### 6. Test user isolation
INV-001 is the constitutional invariant here; this is the highest-value section of the
whole audit. As tenant B, attempt to read or mutate every entity class of tenant A:
products, brands, customers, suppliers, orders, invoices, payments, ledger entries,
stock balances, godowns, roles, people, configuration, tax registrations, activity
history, evidence files.

Then the subtler ones:
- Organization scope within one tenant — a user scoped to one organization node must see
  their subtree and **not** a sibling's (PLA-ORG-002 / PLA-ORG-003).
- A membership with **no role** must grant nothing. Create one and confirm it fails
  closed.
- `Global` scope is defined but deliberately never granted. Try to grant it and confirm
  it takes no effect.
- Party and User are global tables with no `tenantId` by design (INV-003). Isolation for
  them is *reachability*. Confirm tenant A cannot see a Party that holds no membership
  in tenant A — and that a person who is a member of both tenants is **one** Party, not
  two.

### 7. Rate limit APIs
Hammer sign-in with wrong passwords — is there lockout or backoff, and does it key on
account or on IP alone (IP-only is bypassable, account-only is a lockout DoS)? Hammer
`/api/agent/chat`, the server actions behind the busiest desks, and `/api/metrics`.
Confirm limits are enforced **server-side** and are not merely a disabled button.
Check whether one tenant can exhaust a limit shared with another — that is a
cross-tenant availability bug.

### 8. Lock storage buckets
Supabase Storage is bound and Evidence is the consumer. Upload evidence as tenant A,
capture the object URL, then:
- fetch it signed out,
- fetch it as tenant B,
- guess a neighbouring object path,
- list the bucket anonymously.

Check whether URLs are signed and whether they expire. An unguessable URL is not access
control. Confirm the two-phase upload cannot be used to confirm a file that was never
uploaded, and that key/checksum/size are genuinely frozen after confirmation.

### 9. Validate all inputs
Against **every** form: negative quantities, zero, `-0`, `1e309`, `NaN`, `Infinity`,
2^53+1, 500-character names, empty strings that pass a `required` attribute because they
are whitespace, unicode direction-override characters, emoji in numeric fields, dates in
1900 and 2400, a GSTIN of the wrong shape, an HSN of 3 or 7 digits, a discount of
10001 basis points, a thickness of 0.

Money and measurement are the sharp edges here: money is in **paise**, thickness in
**tenths of a mm**, dimensions in **tenths of a declared unit**. Try to get a float, a
rounding error, or a unit confusion (feet stored as millimetres) into any of them.

Then bypass the client entirely and send the same payloads as raw server-action
requests. **The client check is a convenience; the server check is the control.** Any
validation that exists only in the browser is a finding.

### 10. Block unauthenticated routes
Signed out, request every route from Phase 1 and every API. Record anything that returns
200 with content. Then check the in-between states: expired session, valid session for a
deleted user, valid session for a user whose membership was revoked, a session for
tenant A used after switching to tenant B.

### 11. Test SQL injection
The stack is Prisma, so parameterisation is mostly free — which means the interesting
targets are the places that opt out. Probe every input that could reach a raw query:
search and filter boxes, sort parameters, date-range pickers, report filters, the
period key on tax close, HSN lookups, and the agent chat endpoint. Payloads:
`' OR 1=1 --`, `'; SELECT pg_sleep(5) --`, `%'`, `\`, `${}`, and a Postgres-specific
`'||version()||'`.

Watch response **timing**, not just content — blind injection shows up as latency.

Also test whether tenant scoping can be defeated through a raw path: the tenant GUC is
set with `set_config(..., true)` and is transaction-local. Try to make a query run
outside that transaction.

### 12. Remove sensitive logs
Open the browser console on every page and drive a full workflow. Record anything
logged: tokens, ids, emails, phone numbers, GSTINs, prices, full API responses, stack
traces. Then trigger deliberate failures — bad login, forbidden action, invalid input,
a 500 — and read what the **error page** and the **response body** disclose. A stack
trace with a file path or a SQL fragment in a production response is a finding.

Check server logs too, and check the telemetry scrubber actually scrubs: this system has
a telemetry-scrub module, so confirm an error containing a godown UUID or a GSTIN comes
out redacted.

### 13. Block field tampering
This is where mass-assignment lives. For each mutating action, replay the request with
extra fields the form never sent:
- `tenantId` — pointing at tenant B. Tenant context must come from the auth context,
  never the payload (Spec PLA-TEN-006). This is the single highest-value tamper test.
- `role`, `roleId`, `permissions`, `scope` — privilege escalation.
- `id`, `version`, `createdAt`, `createdBy`, `active`.
- Price and cost fields on an order that should take them from the agreed price.
- `state` — jump an order straight from `draft` to `completed`, bypassing the state
  machine.
- `gstApplicable` on a purchase order that already has receipts.
- `qtyShipped`, `qtyReceived`, `totalCostPaise` — quantities and money that should be
  derived, never accepted.
- On the catalogue: `parentProductId` and `type: "TEMPLATE"`, to try to make a stocked
  product into a design or vice versa.

Also confirm **field-level redaction** works: a role without a field-qualified grant
must have the field *omitted* from the response, not nulled. Read the raw JSON and check.

### 14. Restrict file uploads
Against the evidence upload: a 2 GB file, a zero-byte file, a `.exe` renamed to `.jpg`,
an SVG with an embedded `<script>`, an HTML file, a polyglot GIF/JS, a path-traversal
filename (`../../etc/passwd`), a 300-character filename, a filename with a null byte, a
double extension (`x.jpg.html`), and a zip bomb. Confirm the type check reads **content**
and not the extension or the client-supplied MIME type. Then fetch an uploaded SVG or
HTML back and see whether it renders in the browser origin — stored XSS via upload is a
Critical.

### 15. Secure server logic
The business rules are the security boundary in an accounting system. Try to make the
books lie:
- Sell stock you do not have. Sell the same sheet twice by racing two reservations.
- Reserve across godowns, then issue more than was held.
- Receive more than was ordered; receive against a cancelled order.
- Invoice for goods not issued. Invoice twice. Invoice a cancelled order.
- Pay more than an invoice's value; allocate one payment to two invoices totalling more
  than it.
- Post into a **closed** accounting period. Reopen a period and post backdated. INV-002
  says a closed record is permanently locked — try to edit one.
- Edit an issued invoice (immutable by trigger — verify the trigger, not the UI).
- Make the stock ledger and the stock balance disagree.
- Drive the weighted average unit cost wrong with a zero-cost receipt.
- Get a negative on-hand quantity anywhere.
- Delete a brand, shade or texture that products depend on.
- Make a laminate that is not 8×4 — the rule is stated in `CATEGORY_RULES`, enforced by
  the command, and backed by a CHECK constraint. Attack all three layers.
- Order a `TEMPLATE` product, or move stock against it.

For each, if the UI refuses, **replay the same thing as a direct command** and see
whether the server refuses too.

### 16. Trim API responses
Read every server-action and API response body in full. Look for fields the screen never
renders: password hashes, `authUserId`, internal ids, cost prices on a customer-facing
surface, other tenants' names in a lookup, full user records where a name would do,
soft-deleted rows. Over-fetching is how one careless component becomes a data breach.

### 17. Secure auth sessions
Inspect the session cookie: `HttpOnly`, `Secure`, `SameSite`, `Path`, expiry. Test
whether the session survives a password change, whether sign-out invalidates it
server-side or only clears the cookie, whether it can be replayed from a second machine,
whether it is rotated on privilege change or organization switch. Look for session
fixation (does the identifier change on login?). Check CSRF protection on every state-
changing action — Next.js server actions have some built in; verify it, do not assume.
Check the security headers: CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`,
`Referrer-Policy`. Try to frame the app in an iframe.

### 18. Scan dependencies
Deferred to Phase 8.

### 19. Test record access
The three authorization layers are meant to be independent, and the audit must prove
each one separately:
- **Layer 1** — `authorize()` decides whether the role may touch the entity *type*.
  Confirm it throws `ForbiddenError`, and that a caller who forgets to check the result
  still cannot proceed.
- **Layer 2** — `assertRowInScope()` / `scopeFilter()` decides which *records*. Test the
  organization subtree, and test that a `Location`-scoped grant currently reaches
  nothing rather than widening to the whole tenant.
- **Layer 3** — `redactFields()` removes restricted fields.

Now the important part: **verify each layer alone**. Find a request where Layer 1 passes
and Layer 2 should stop you, and confirm it does. A system where Layer 1 accidentally
covers for a missing Layer 2 is one refactor away from a breach.

Also confirm the ADR-017 property: the AI/assistant channel executes as the calling
human's own context. Try to get `/api/agent/chat` to do something the signed-in user
could not do through the UI. If the agent has *any* authority the human lacks, that is
Critical.

### 20. (blank in the source list — use it for what the list forgot)
**Regulatory and integrity.** See Phase 6.

---

# PHASE 3 — WILD CASES: WHAT HAPPENS WHEN THINGS BREAK

Ask permission before each of these. Run them against local or preview, **never**
production, unless the user explicitly says otherwise for a specific test.

**Database disappears mid-flight.** Kill the database connection while a multi-step
command is in progress — a sales order that writes lines, a reservation across two
godowns, an invoice that writes lines and a ledger entry. Then bring it back and read
the data. Is there a half-written order? An invoice with no ledger entry? A reservation
against nothing? Anything that is not all-or-nothing is a finding.

**Database is completely wiped.** Restore an empty schema and start the app. Does it
boot, or crash? Does it say something a human can act on? Then run the migrations from
zero on a fresh database and confirm the entire chain applies cleanly in order — this
system has 65+ migrations and a broken one only shows up here. Then seed and confirm the
seed is **idempotent**: run it twice.

**Restore from backup.** Ask the user what the backup and restore procedure is. If there
isn't one, that is a Critical finding on its own — an accounting system with no tested
restore is one storage failure from being unrecoverable. If there is one, ask to watch
it run, and check the recovery point and recovery time against what the business
actually needs.

**Connection pool exhaustion.** The runtime uses the transaction-mode pooler on 6543 and
`CLAUDE.md` records that session mode once took production down with `EMAXCONNSESSION`.
Open many concurrent sessions and see what happens. Confirm nothing has reintroduced
session state that outlives a transaction.

**Partial infrastructure failure.** Storage down but database up: does evidence upload
fail loudly or silently? Supabase Auth down: what does sign-in say? Clock skew: move the
server clock forward a day and check period close, SLA clocks, and invoice numbering.

**Concurrency.** Two users reserving the last sheet simultaneously. Two users closing the
same period. Two users invoicing the same order. Two browser tabs submitting the same
form. Double-click every submit button in the app — idempotency is usually an
afterthought and double-submission is the most common real-world corruption.

**Scale.** An order with 500 lines. A catalogue with 10,000 products. A laminate design
with 50 shades × 50 textures — that is 2,500 generated products in one transaction; find
out where it breaks and whether it fails cleanly or half-writes.

**Time.** Financial year rollover on 1 April. A backdated invoice. Two invoices in the
same second — does the number sequence hold? Daylight-saving and timezone: the temporal
model resolves zones organization → tenant → UTC and never guesses; try to make it guess.

**Scheduled work.** `CRON_SECRET` unset means nothing runs, by design. Confirm that
failure is visible rather than silent. Then run the scheduled endpoint twice in a row
and confirm the sweeps are idempotent.

---

# PHASE 4 — ARCHITECTURE, TESTED NOT READ

The claim in `CLAUDE.md` is **PLATFORM FOUNDATION READY**: a new capability can be
registered, with new entities, workflows, permissions, events and UI, *without*
modifying platform infrastructure. Test the claim behaviourally.

- Activate and deactivate a capability for a tenant. Does its navigation appear and
  disappear? Does a deactivated capability's data become unreachable, or merely hidden?
- Two tenants with **different** capability sets — does either see the other's
  navigation, entities or queues?
- Capability dependencies: `plywood` depends on `trading` (ADR-018). Try to activate
  plywood without trading and confirm it is refused.
- Custom fields: define one on an entity, fill it, and confirm the server re-validates
  when you bypass the client.
- The shell must hold no capability-to-route map. Prove it from outside: a capability's
  navigation should appear purely because the capability declared it.
- **Legacy contamination.** `CLAUDE.md` forbids VEDA patterns by name. Check the running
  system for `factoryId`, `Department` as a production stage, role-based routes
  (`/owner`, `/worker`, `/inspector`, `/supervisor`, `/verity`), and the forbidden enum
  values. Report anything you can reach.
- **HQ vs tenant boundary** (ADR-013). Can an HQ operator read tenant business data? What
  *should* they be able to see? Whatever the answer, is every HQ action written to the
  audit trail with the operator named?

---

# PHASE 5 — THE AUDIT TRAIL AND THE EVENT LOG

An accounting system's audit trail is a control, and this one is append-only by design.

- Perform each kind of change and confirm an Activity row appears with the right actor,
  the right command key, and a diff that names **what it was** and **what it became**.
  A diff that records "changed" without values is a finding — this exact bug shipped once
  in `editProduct`.
- Try to edit or delete an Activity or DomainEvent row through any surface.
- Confirm nothing you did in Phases 2–4 went *unrecorded*. An action with no audit row is
  worse than a refused action.
- Check that history written before the ADR-018 key rename still renders with human
  labels rather than raw keys like `verity.plywood.receive_goods`.
- Confirm the audit trail records failed and forbidden attempts, not only successful ones.

---

# PHASE 6 — REGULATORY AND FINANCIAL CORRECTNESS

This system files GST returns in India. Correctness here is a legal obligation.

- Raise invoices intra-state and inter-state and confirm CGST+SGST vs IGST is chosen from
  the state codes, never guessed. An invoice must never carry both.
- Confirm the invoice number sequence is gapless and monotonic per series per financial
  year, and that it cannot be reused after a failure.
- Confirm an issued invoice is immutable, and that corrections happen through credit and
  debit notes.
- Reconcile GSTR-1 and GSTR-3B against the underlying invoices. Any figure the working
  shows that the documents do not support is Critical.
- Confirm the ITC reconciliation does not claim credit on a bill that carried no tax.
- Confirm HSN, now optional, degrades to the tenant default rate rather than to zero —
  and that period close still flags every invoice missing one.
- Confirm the `gstApplicable = false` path records **zero tax as a statement**, not as a
  gap, and that it cannot be flipped after goods have arrived.
- Data protection: check what personal data is held on Party, User and customers, whether
  it is exported or deletable, and whether India's DPDP Act obligations are met. Identity
  has no deprovision path by design (Bible V2 Primitive 2 §3 ends at `Archived`) — flag
  the tension between that and a data-erasure request as a decision the user must make,
  not a bug for you to fix.

**One thing you must refuse.** If you find, or are asked to build, any facility for
recording transactions so they are hidden from tax authorities — off-books sales, an
invoice-suppression mode, parallel books — do not implement it, do not help design it,
and record it in the report as a Critical regulatory finding. Note that the existing
per-order GST switch is legitimate: an unregistered or composition supplier genuinely
charges no tax. The line is between *recording a real untaxed trade* and *concealing a
taxable one*.

---

# PHASE 7 — THE INTERFACE UNDER STRESS

Use `web-design-guidelines` and `ecc:accessibility`, and drive with the browser tools.

Every page at 320px, 768px, 1440px. Keyboard only, start to finish — can you complete a
sale without a mouse? Every modal: does focus trap, does Escape close, does focus return?
Screen-reader labels on every icon-only control. Both themes. `prefers-reduced-motion`.
Long strings, empty states, error states, loading states. Double-submit every button.
Browser back after a mutation. Refresh mid-form.

Check the console on every page for hydration mismatches — one previously affected every
modal in the application and was invisible until someone looked.

---

# PHASE 8 — THE THREE THINGS THAT NEED THE REPOSITORY

Only now may you read source and run repository tooling.

**4. Scan GIT secrets.** `git log -p` across the full history for keys, `.env` files ever
committed, service-role keys, private keys, connection strings with passwords. Check
`.gitignore` covers `.env*`. Check the deployed bundle for source maps that leak server
code. Remember: a secret that was committed and later removed is still leaked — rotation
is the only fix, and say so.

**18. Scan dependencies.** `npm audit`, check for unmaintained and typosquatted packages,
lockfile integrity, `postinstall` scripts, and packages pulled from anywhere but the
public registry. Note versions of Next.js, React, Prisma and the Supabase client against
known advisories.

**1. Hide API keys (server side).** Confirm every secret is read only in server code and
that nothing secret is exposed through a `NEXT_PUBLIC_` variable. `SUPABASE_SERVICE_ROLE_KEY`
and `CRON_SECRET` are deployment-only — confirm neither has leaked into the client bundle
or into any log.

Now spawn `ecc:security-reviewer`, `ecc:database-reviewer` and `ecc:silent-failure-hunter`
over the source, and run `/security-review` and `/code-review high`. **Cross-check their
findings against yours**: anything they found that you missed is a gap in your black-box
method — write that down too, in `audit/METHOD-GAPS.md`. Anything you found that they
missed is the justification for having done it this way.

---

# FINISHING

1. Re-read every finding and confirm you personally observed it. Downgrade anything you
   inferred to Probable, or delete it.
2. Rank by exploitability × impact. Put the top five in an executive summary at the top
   of `audit/FINDINGS.md`, in plain language a business owner can act on.
3. State plainly what you did **not** test and why. This is the most important paragraph
   in the report.
4. Invoke `superpowers:verification-before-completion`.
5. Report to the user in the vocabulary `CLAUDE.md` requires: requirements implemented /
   not implemented, tests, architecture conformance PASS or FAIL, legacy contamination
   NONE or FOUND, open decisions, known deviations, ready for next milestone YES or NO.
6. Do not fix anything. Hand over the findings and stop.

**If you run low on context, write what you have to the report and say where you stopped.
A partial audit that is honest about its boundary is useful. A complete-looking audit
with invented coverage is worse than no audit at all.**
