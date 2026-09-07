# 102 — Black-box functional and conformance audit prompt

This file **is** the prompt. Paste everything below the line into a fresh Claude Code
session at the repo root. Nothing above the line is part of it.

The audit it drives is deliberately **black-box**: the auditor drives the running
application like a demanding user, and is forbidden from reading application source to
decide whether something works. Reading the source is how an auditor talks themselves
out of a finding — "the code looks right, so the behaviour must be right".

Scope is correctness, not security. It covers whether every feature works, whether the
architecture's claims hold, whether the books and the tax returns are right, and what
happens when infrastructure fails. Penetration testing is a separate exercise and is
deliberately not in this file.

---

# VERITY — FULL FUNCTIONAL AND CONFORMANCE AUDIT

Your job is to find where this system is wrong, not to admire it. Assume the software
is guilty until it proves itself innocent, and assume that anything you did not
personally observe working does not work.

## THE ONE RULE THAT SHAPES EVERYTHING

**You audit the running application, not the source code.**

You may not open a file under `src/` to decide whether a behaviour is correct. You may read `README`, `CLAUDE.md`, the `taskplans/` and `verity-spec/`
documents to learn what the system *claims*, and you may read migration SQL to
understand the data model — but every verdict about behaviour must come from an
observation: a page you loaded, a button you pressed, a request you replayed, a row you
read back from the database, a log line you watched appear.

Why: reading the implementation tells you what the author intended, and a user gets
neither the source nor the intent — only the behaviour. Three of the worst classes of defect in
this system's history — a hydration mismatch on every modal, an activity diff that
silently recorded nothing, a seed that could only ever run once — all typechecked, all
passed review, and all were only visible by running the thing.

When you catch yourself reasoning "the handler probably validates this", stop. Go and
send the request that violates it, and write down what actually came back.

## SKILLS AND COMMANDS TO USE

Invoke these; do not reimplement what they already do.

| When | Use |
|---|---|
| Before touching anything | `superpowers:brainstorming` to map the surface and agree scope with the user |
| Every bug, without exception | `superpowers:systematic-debugging` — reproduce, isolate, prove, then write the finding |
| Any error message or stack trace | `error-resolver` before guessing |
| Driving the browser | the `claude-in-chrome` skill and its `mcp__claude-in-chrome__*` tools; `playwright-cli` for scripted multi-user and replay flows |
| Starting the app | the `run` skill |
| UI defects and accessibility | `web-design-guidelines`, then `ecc:accessibility` |
| Schema, RLS and migration safety | `verity-migration-safety` and `db-migration-helper` |
| Architecture decisions you think are being violated | `verity-adr-gate` |
| Understanding what the corpus claims | `graphify query "<question>"` — the graph is at `graphify-out/` |
| Verifying you are actually done | `superpowers:verification-before-completion` |

Slash command: `/code-review high` at the very end, as a cross-check against your
black-box findings — never as a substitute for them. Do not run `/code-review ultra`
yourself; it is user-triggered and billed. Tell the user if you think it is warranted.

Shell: `npm run typecheck`, `npm run test`, `npm run build`. **Ask before running the
test suite** — it points at the live database and reseeds it.

## GROUND RULES

1. **Do not fix anything.** This audit produces findings, not patches. A fix mid-audit
   destroys the evidence and the reproduction. Write everything to the report and stop.
2. **Never test destructive behaviour against production data without explicit
   permission for that specific test.** Ask, name the exact operation, wait.
3. **Never put a real secret or a real customer's details in the report.** Name the
   variable or the row, not its contents.
4. **Every finding needs a reproduction a stranger can follow** — starting state, exact
   steps, observed result, expected result. A finding without steps is an opinion.
5. **Rank by what it costs the business**, not by how clever the bug is. A wrong figure
   on a filed return outranks a lost order outranks a console warning.
6. If a test would damage a third party (load-testing a provider, sending real email),
   do not run it. Record it as untested and say why.

## THE REPORT

Create `audit/FINDINGS.md` and write to it continuously — not at the end. A session that
runs out of context with everything in your head produces nothing.

Every finding:

```markdown
### F-NNN — <one line, the defect not the symptom>

- **Severity:** Critical | High | Medium | Low | Informational
- **Category:** Correctness / Data integrity / Architecture / Availability /
  Regulatory / Interface
- **Surface:** the route, API, command key, or table
- **Actor:** which role, in which tenant, was logged in
- **Reproduction:**
  1. …
- **Observed:** what actually happened, quoted exactly
- **Expected:** what should have happened, and the authority that says so
  (`CLAUDE.md` invariant, ADR number, spec REQ-ID, or GST law)
- **Impact:** what it costs the business, or what an unlucky user ends up with
- **Confidence:** Confirmed (I saw it) | Probable (strong signal, one step unproven)
- **Suggested direction:** one or two sentences. Not a patch.
```

Also maintain, as sibling files:

- `audit/COVERAGE.md` — every route, API, command and capability, marked Tested /
  Partially tested / Untested-and-why. **An honest untested list is worth more than a
  fake green tick.**
- `audit/ATTEMPTED-AND-FAILED.md` — every way you tried to break the system that it
  correctly refused. This is the evidence that the guards work, and it is the half of an
  audit that everybody skips.

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
   Tenant B is not optional: a single tenant cannot show that one client's data,
   navigation and capability set stay separate from another's. `npm run seed:audit-tenant`
   builds one, with a root and a child organization, an owner, a narrow counter user and
   a deliberately roleless membership.
4. Start the app (`run` skill). Confirm you can sign in as each identity and keep the
   four sessions available — separate browser profiles or separate Playwright contexts.

---

# PHASE 1 — WALK EVERY SURFACE AS AN HONEST USER FIRST

Learn what "working" looks like before you go looking for wrong. You cannot recognise a
broken state if you never saw the correct one.

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

# PHASE 2 — WILD CASES: WHAT HAPPENS WHEN THINGS BREAK

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

# PHASE 3 — ARCHITECTURE, TESTED NOT READ

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

# PHASE 4 — THE AUDIT TRAIL AND THE EVENT LOG

An accounting system's audit trail is a control, and this one is append-only by design.

- Perform each kind of change and confirm an Activity row appears with the right actor,
  the right command key, and a diff that names **what it was** and **what it became**.
  A diff that records "changed" without values is a finding — this exact bug shipped once
  in `editProduct`.
- Try to edit or delete an Activity or DomainEvent row through any surface.
- Confirm nothing you did in Phases 1–3 went *unrecorded*. An action with no audit row is
  worse than a refused action.
- Check that history written before the ADR-018 key rename still renders with human
  labels rather than raw keys like `verity.plywood.receive_goods`.
- Confirm the audit trail records failed and forbidden attempts, not only successful ones.

---

# PHASE 5 — REGULATORY AND FINANCIAL CORRECTNESS

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

# PHASE 6 — THE INTERFACE UNDER STRESS

Use `web-design-guidelines` and `ecc:accessibility`, and drive with the browser tools.

Every page at 320px, 768px, 1440px. Keyboard only, start to finish — can you complete a
sale without a mouse? Every modal: does focus trap, does Escape close, does focus return?
Screen-reader labels on every icon-only control. Both themes. `prefers-reduced-motion`.
Long strings, empty states, error states, loading states. Double-submit every button.
Browser back after a mutation. Refresh mid-form.

Check the console on every page for hydration mismatches — one previously affected every
modal in the application and was invisible until someone looked.

---

# FINISHING

1. Re-read every finding and confirm you personally observed it. Downgrade anything you
   inferred to Probable, or delete it.
2. Rank by likelihood × cost to the business. Put the top five in an executive summary at
   the top of `audit/FINDINGS.md`, in plain language a business owner can act on.
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
