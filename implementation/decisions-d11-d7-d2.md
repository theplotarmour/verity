# Decision audit — D11, D7, D2

**Date:** 2026-08-28
**Status:** **RESOLVED 2026-08-28.** The product owner chose Option A on all three.

| | Decision | Outcome |
|---|---|---|
| **D11** | Option A — DEC-001 governs core only | **ADR-014** accepted; `/kitchen` built inside the capability, boundary enforced by conformance tests |
| **D7** | Option A — leave it | No ADR, no code. Personal sign-in stands; revisit after real service friction |
| **D2** | Option A — host cron to an authenticated route | **ADR-015** accepted; `POST /api/scheduled` bound, sweep declared as a `frequent` cadence |

The audit below is left as written, because the options that were not taken are
the reason the one that was taken is defensible.
**Requirement source:** `KentsRestaurant.md` §17. All three are Kent's-driven; none is speculative.
**Why now:** Kent's dine-in reached 330/330 tests with an empty `src/server/platform/` diff. What
remains cannot be built without answering these three, and guessing any of them would put a
decision in the code that nobody made.

Each section follows the PLATFORM-FREEZE escalation format: requirement, contract attempted, why
composition falls short, options with their real costs, security and tenancy impact, whether an ADR
is required, and what was rejected.

---

## D11 — The kitchen screen

### Requirement

Kent's requirement #2, verbatim: *"Kitchen cook tab/phone — view incoming orders and what to cook."*
Without it a cook has no screen, and Kent's cannot run a service. This is the one blocker that stops
the client from operating.

### Existing contract, attempted

Everything the screen needs is already built and tested:

- `verity.dinein.order_line` states, seeded with honest categories
- `verity.dinein.advance_order_line`, exercised in the passing suite
- `verity.dinein.kitchen_queue` — a registered query returning tickets with SLA urgency
- `urgencyFor()` from the SLA substrate, computing the badge

**Nothing technical is missing.** A page rendering `kitchen_queue` and calling `advance_order_line`
is roughly eighty lines and needs no new contract.

### Why it is blocked anyway

Bible V6 **DEC-001 `[FACT, ACCEPTED]`**:

> The kitchen display system (KDS) and cooking queue tracking are permanently excluded from the
> Verity core product scope.
>
> **Rationale:** Verity is optimized for service-driven organizations. Food preparation tracking
> requires micro-level inventory recipes and highly specific KDS bump timers that do not generalize
> into other service operations.

The rationale is about **generalisation** — recipes and bump timers that do not transfer to other
service operations. The decision's text says **core product scope**. Whether a purpose-built screen
inside one client's capability falls inside that exclusion is genuinely ambiguous, and this codebase
does not resolve ambiguity in an authority by inference. Classification: **conflicting
specification / missing ADR**.

### Options

| | Option | What it means | Cost |
|---|---|---|---|
| **A** | **DEC-001 governs core only.** Ratify that a capability-private kitchen screen is permitted. Build `/kitchen` inside `verity.capability.dinein`, consuming only public contracts | Kent's runs a service. Precedent: capabilities may build domain screens that core excludes | The exclusion becomes narrower in practice than a first reading suggests. Needs the ADR to say so explicitly, or the next reader re-litigates it |
| **B** | **DEC-001 governs any Verity surface.** No kitchen screen. Cooks work from printed tickets or a third-party KDS; Verity records line states through some other path | DEC-001 stands unqualified | Kent's requirement #2 is refused. The client either does not adopt, or runs a parallel system whose state Verity cannot see — which is worse for the audit trail than either alternative |
| **C** | **Amend DEC-001.** Rewrite the register entry to permit kitchen surfaces generally | Honest if the intent has actually changed | The Bible is not editable: AMD-001 was a one-time authorised edit and is spent. This needs a fresh owner instruction, and it makes a product-scope decision on one client's behalf |

### Security and tenancy impact

**None** for any option. The screen reads a tenant-scoped query and calls a permission-gated
command; no new entity, no new grant, no cross-tenant path.

### ADR required

**Yes.** D11 is recorded as a missing ADR. `KentsRestaurant.md` §2.2 has draft text for Option A.

### Rejected without being offered

A generic "queue board" platform primitive — that is precisely the generalisation DEC-001's
rationale rejects, and it would turn one client's requirement into an abstraction nobody asked for.

### Recommendation

**Option A**, on the evidence: DEC-001's rationale is about generalisation, and a screen that cannot
be reused by another capability generalises nothing. Recording it as narrow is also what makes the
exclusion enforceable — an unqualified reading would be quietly violated the first time any client
needs a queue view, whereas a stated boundary can be checked.

---

## D7 — Shared-tablet staff switching

### Requirement

Not in Kent's numbered list. It arrives from §5.1: restaurants share tablets, and the current
answer is that each person signs in with their own Supabase password on a device passed between
them mid-service.

### Existing contract, attempted

Supabase Auth plus `TenantMembership`, exactly as built. It works — it is simply slow at a pass
where a waiter has both hands full.

### Why it is blocked

Every faster alternative weakens authentication, and this codebase does not weaken an authentication
boundary by inference. A PIN over a shared session means the session no longer identifies the
person, and `Activity.actorUserId` — which is how "who discounted table 9" is answered — becomes a
claim the device makes rather than one the auth layer proves.

### Options

| | Option | What it means | Cost |
|---|---|---|---|
| **A** | **Leave it.** Per-person sign-in, no change | Nothing weakens. Zero work | Slow at the pass. Real friction the client will feel nightly, and the likely workaround is one shared login for everyone — which is worse than any designed alternative |
| **B** | **PIN over a device session.** The device authenticates once; a per-staff PIN selects the acting person for each action | Fast. Matches how restaurants actually work | The device holds the credential. A PIN is a weak secret, and its compromise is limited only by what that person may do. Needs: PIN storage rules, attempt limiting, session lifetime, what a PIN may NOT authorise (discounts? voids?), and how audit records "device X, person Y" |
| **C** | **Short-lived personal sessions with fast re-auth.** Each person still authenticates, but the flow is optimised — remembered accounts, short PIN as a second factor on an already-authenticated device | Keeps real authentication; removes most of the friction | More work than B, and still needs most of B's answers |

### Security and tenancy impact

**Material, and the reason this is blocked.** Options B and C change who the platform believes an
actor is. Tenancy is unaffected — all three stay inside one tenant — but the actor attribution that
every audit row depends on is exactly what moves.

### ADR required

**Yes, and it is the strongest of the three.** A security boundary, per the stop conditions.

### Rejected without being offered

A device-level "kiosk account" that everyone shares. It makes every audit row say the same thing and
would silently undo the attribution the whole audit stream exists for.

### Recommendation

**Option A for go-live, then C.** Nothing about a first dinner service requires solving this, and
shipping B under time pressure is how a weak secret becomes permanent. Kent's should run on personal
sign-in for a week; if the friction is real — and it may well be — C is the version worth an ADR.

---

## D2 — Nothing runs the scheduled work

### Requirement

Kent's SLA prep clocks are built and correct: a line's clock starts when cooking starts and stops
when it is ready, keeping any breach. What does not happen is the **sweep** — the pass that flips an
overdue running clock to `Breached` and emits `verity.sla.breached`. Until something invokes it, a
manager is never told that table 9's food is late while it is still late.

### Existing contract, attempted

`ScheduleContribution` — capabilities declare recurring work as a **cadence**
(`frequent | hourly | daily | weekly`) and `runDueWork` executes it under an ordinary tenant scope.
The dine-in capability could declare its sweep today, and the gate-9 probe proved the whole path
works.

**The contract is complete. What is missing is something that calls `runDueWork` on a clock.**

### Why it is blocked

PLATFORM-FREEZE is explicit: *"A contract with no provider is a decision that has been made. A
provider chosen with no requirement is a decision that has been guessed."* Kent's is the first real
requirement that forces the binding — which means the binding is now legitimate, and the only
question is which one.

### Options

| | Option | What it means | Cost |
|---|---|---|---|
| **A** | **Deployment-host cron → an authenticated route.** The host calls a Verity endpoint on a schedule; the route resolves due work per tenant and runs it | Smallest possible adapter. No dependency, no vendor, works on the platform already deployed to | The endpoint needs its own authentication — a shared secret in configuration — and the host's scheduler becomes a deployment concern to document. Coarse granularity: "frequent" means whatever the host's minimum interval is |
| **B** | **A worker process** running the same loop continuously | Finer granularity; no HTTP surface to protect | A second thing to deploy, supervise and restart. Nothing in Kent's needs sub-minute reaction |
| **C** | **A managed queue or workflow vendor** | Retries, visibility, backoff | A dependency and a bill for one restaurant's prep clocks. This is the guess PLATFORM-FREEZE warns about, and Temporal-style machinery is research evidence in this repo, not authority |

### Security and tenancy impact

**Real but bounded, and it belongs in whichever ADR is written.** Scheduled work runs with no
signed-in human, so:

- It must run **per tenant, under `withTenant`** — `runDueWork` already does, and that must not be
  relaxed for convenience.
- Whatever triggers it authenticates. An unauthenticated sweep endpoint is a way to make the
  platform do work on demand from outside.
- It must stay idempotent. Every real scheduler retries; `sweepBreaches` is already written to
  tolerate that.

### ADR required

**Probably not for the mechanism** — Option A is an implementation decision the plan already
classifies that way. **Yes for the authentication of the trigger**, which is a security boundary and
should be recorded wherever the binding lands.

### Rejected without being offered

Running the sweep opportunistically inside a page render or a command. It would make a manager's
alert depend on someone happening to load a screen, and would put unpredictable work inside a
request a waiter is waiting on.

### Recommendation

**Option A.** It is the smallest thing that turns a complete contract into working behaviour, adds
no dependency, and can be replaced by B or C later without any capability knowing it changed —
which is the property the cadence abstraction was built to have.

---

## What happens after the decisions

In this order, and no further:

1. **D11 answered** → ADR-014 written and accepted → build `/kitchen` inside the capability.
2. **D7 answered** → if anything other than "leave it", an ADR first; otherwise nothing to build.
3. **D2 answered** → declare the dine-in schedule contribution, bind the chosen trigger, record the
   trigger's authentication.
4. **End-to-end service-chain spec as a TEST FIXTURE** — creates a restaurant tenant, walks
   menu → table → order → kitchen → preparation → bill → payment → report, and destroys it. No seed
   data, no demo records in the application.
5. **Full Kent's verification** and a written verdict.

Nothing in steps 1–3 begins before the matching decision.
