# Salon / Spa Management — Verity Capability Design

| | |
|---|---|
| **Client profile** | One salon/spa outlet — hair, beauty and wellness services with retail shelf, prepaid packages and memberships. |
| **Document status** | **DEMONSTRATED** — a hypothetical capability modelled on the foundation, on paper. Nothing in this document is BUILT. Per the reporting vocabulary, no part of it may be reported as implemented functionality until it exists in `src/server/capabilities/` behind passing tests. |
| **Proposed capability id** | `verity.capability.salon` |
| **Proposed pack framing** | None. One purpose-built reusable capability, not an industry pack. The spec's industry packs (`13_industry_packs/`) cover Facilities, Field Service, Maintenance, Professional Services, Security Operations, Staffing — personal care is absent from the corpus, so this document invents no "salon pack". |
| **Platform state at writing** | Foundation frozen at 2026-08-24 milestone (`implementation/PLATFORM-FREEZE.md`). Five platform-proving capabilities exist: Location, Asset, Evidence, Scheduling, Approval. No client system exists yet. |

---

## 1. Client requirements (as received)

A salon/spa management system covering:

1. **Customer profiles** — durable identity, contact, preferences, history.
2. **Appointments** — book services against staff time.
3. **Staff allocation** — who takes what, rosters, next-free assignment.
4. **Services** — the menu: categories, durations, prices, staff-grade pricing.
5. **Packages** — pre-paid bundles and multi-session packs.
6. **Walk-ins** — customers without bookings, waitlisted and seated when free.
7. **Billing** — consolidate the visit, apply offers/memberships/packages, take payment.
8. **Inventory** — retail products plus back-bar consumables.
9. **Commissions** — staff earnings from services and product sales.
10. **Memberships** — subscription tiers with discount benefits.
11. **Offers** — promotional campaigns and discounts.
12. **Reports** — revenue, utilisation, commissions, package liability, retention.

Derived operational requirements (made explicit so scope is testable):

- A service's *duration* drives the slot it occupies — a 30-minute cut and a 90-minute massage cannot share one grid size.
- Some spa services consume two scarce things at once: a therapist **and** a room. Double-booking either must be structurally impossible.
- Prices vary by stylist grade (senior vs junior); the customer sees the right price for whoever serves them.
- Package and membership balances must never go negative, must expire, and every consumption must leave a trail.
- Commissions accrue automatically when an invoice settles — nobody computes them by hand.
- Front desk, service floor and counter see different worlds; providers never handle money or customer contact details.

Explicitly **not** requested and therefore out of scope for v1 (§15): online booking / customer app, loyalty points beyond memberships and offers, payroll integration (commissions stop at payout records), supplier purchase orders, staff shift-swap approval flows, before/after photo galleries (blocked on storage driver — §17-D3), POS hardware and payment gateways (GOV-SCO-006), multi-outlet operations, tip management.

---

## 2. Authority position

### 2.1 The decision path this document follows

`implementation/PLATFORM-FREEZE.md`: *can existing Verity primitives support it? If yes, build the capability.* Answered module by module in §16. Headline: **every requirement lands on existing primitives**, zero platform changes proposed. The salon joins the clinic as a consumer of substrates the foundation proved but nobody had yet used together: Scheduling (this time including **ResourceGroup composition**, which neither prior design exercised), append-only ledgers, and Layer-3 field redaction.

### 2.2 Scope authority: silence is permission, exclusions still bind

The corpus names no exclusion touching personal-care software. Bible V1 §129 states the composability thesis — *"a security patrol, a cleaning schedule, a medical clinic, or a field technician fleet … composing the same underlying primitives (`Work`, `Party`, `Resource`, `Location`)"* — and PLATFORM-FREEZE invites exactly this: a real requirement met by purpose-built capability code. Unlike the dine-in design (which carried a genuine DEC-001 conflict), there is nothing to reconcile here.

Two boundaries still bind:

- **GOV-SCO-006** (consumer retail storefronts and POS hardware outside platform scope): the counter is **record-and-print** — record payments, render printable receipts. No card-terminal integration, no cash-drawer registry, no gateway.
- **PLATFORM-FREEZE anti-speculation rule**: no generic booking engine abstracted above Scheduling, no loyalty-points framework, no payroll engine. Commissions stop at payout records; anything further needs its own requirement through the decision path.

### 2.3 Canonical terminology compliance

All names respect GOV-TER-001..017. Three deliberate term choices need stating:

- **`Appointment` is the domain's Work instance** (Bible V2 WORK — a unit of service execution moving through states under commands). The Scheduling capability's `Booking` remains the *time commitment* row beneath it; the division of labour is stated in §6-M3.
- **`Customer` (v1) is a capability-owned entity, not a Party** — reasoned in §6.9, flagged §17-D7, identical logic to the clinic design.
- **`WaitlistEntry`, `PackageSale`, `CommissionEntry` are capability-owned entities.** None is a `ChecklistItem` (ADR-006 reserves that for work sub-steps); `Task` stays reserved for project milestones. No legacy-VEDA vocabulary appears anywhere.

---

## 3. Platform fit — requirement → primitive map

| Salon requirement | Existing primitive that carries it | Status of primitive |
|---|---|---|
| Tenant isolation | Tenant + RLS via `withTenant()`; fail-closed GUC | BUILT / PROVEN |
| Staff logins | Supabase Auth + Party/User/TenantMembership via `provisionIdentity()` | BUILT / PROVEN |
| Receptionist / Provider / Manager / Owner roles | Role + Permission (Verb+Entity+Scope), `verity.resolve_permissions`, RoleComposition | BUILT / PROVEN |
| Catalog, appointments, packages, invoices as first-class data | Capability-owned Prisma tables registered in `EntityDefinition` (MET-ENT-001..005) | Mechanism PROVEN; entities DEMONSTRATED |
| Every mutation | Command pipeline MET-ACT-001..004 (`executeCommand`) | BUILT / PROVEN |
| Appointment / waitlist / package / membership lifecycles | StateDefinition / TransitionDefinition / StateCategory (ADR-009), `assertMutable` INV-002 lock | BUILT / PROVEN |
| **Appointments against staff time** | **Scheduling**: party-backed Resource + AvailabilityWindow + Booking, overlap trigger (`resource_is_free`) | BUILT / PROVEN — first consumer was clinic; salon extends to groups |
| **Therapist + room booked together** | **ResourceGroup `AllOf`** + `resolveGroup()` returning the concrete members a booking consumes | BUILT / PROVEN — **first real consumer** |
| **"Any free stylist" walk-in assignment** | **ResourceGroup `AnyOf`** pools per service category | BUILT / PROVEN — **first real consumer** |
| Rosters and leave | AvailabilityWindow (`available=false` exceptions via `declare_unavailable`) | BUILT / PROVEN |
| Audit of every change | Activity stream + DomainEvent outbox, append-only triggers | BUILT / PROVEN |
| Package/membership/commission trails | Append-only capability tables (pattern proven by Event/Activity triggers) | DEMONSTRATED |
| Reminders, waitlist calls, renewal nudges | Notification substrate (`notify()`, literal templates, suppression recorded) | BUILT (transport dispatcher unbound — §17-D4) |
| Reports/dashboards | Server components + chart primitives (Donut/BarStrip/StairFigure), workspace contributions | BUILT |
| Look & feel | ADR-011 glass material system, accent presets, shell chrome | BUILT |

Everything else is capability code: additive schema section, one directory `src/server/capabilities/salon/`, routes under `src/app/(shell)/salon/…` plus three operational surfaces, one registry line, migration-seeded metadata, one `registerContribution()` call. Per PLATFORM-FREEZE, expected-and-additive throughout.

---

## 4. Tenant & organization topology

```
Tenant: "<Salon name>"               timeZone: Asia/Kolkata (explicit, never guessed;
                                     configurable at provisioning)
└── Organization: "Main outlet"      (single site; hierarchy ready for outlet #2)
    └── Location: "Salon premises"   (operational site; Place+Address attached)
```

- One Tenant = the legal business; ADR-005 boundary. A second outlet becomes a second Organization + Location in the same tenant — no schema change; Organization-scoped grants begin to matter then.
- `Organization.timeZone` inherits the tenant zone; instants UTC, rendered via `temporal.ts` (Bible V4 §5.B, EXE-SCH-001).
- BusinessCalendar "Opening hours" (tenant-wide, per-weekday windows + holidays) — feeds utilisation denominators (§14) and notification timing.
- Capability activation: `TenantActivation(verity.capability.salon)` (+ `verity.capability.scheduling` dependency) pins version at go-live (PLA-CAP-002, PLA-VER-003).
- Accent: tenant preset; default Warm Sand Gold `#D4A017` unless changed. Never hard-coded; everything derives from `--accent-seed`.

Onboarding runbook: §13.

---

## 5. Staff identity, roles & permissions

### 5.1 People

Every staff member gets one global Party + User via `provisionIdentity()` (never direct INSERT — RLS denies it deliberately), bound to the organization with one membership each. Customers are **never** provisioned as identities in v1 (§6.9).

Every **service provider** additionally becomes a `Resource` backed by their `partyId` (ADR-008: exactly one Party backer), carrying weekly `AvailabilityWindow` shifts and appearing in Bookings. A therapy/massage room becomes an **Asset-backed Resource**. Rooms and therapists compose into `ResourceGroup`s per service category:

- `"Hair services"` — `AnyOf` pool of stylist Resources (any free member satisfies),
- `"Spa body therapy"` — `AllOf` of {therapist pool, therapy-room Asset} (every member required simultaneously).

Both group kinds are built machinery (`resolveGroup()`); the salon is their first real consumer.

Shared front-desk devices: authentication is per-person Supabase sign-in today. A PIN fast-switch over shared sessions is a **security decision needing an ADR** (§17-D5) — not improvised.

### 5.2 Roles

Closed set for v1; composition via RoleComposition (PLA-AUT-001), flattening DB-side in `verity.resolve_permissions`.

| Role | Purpose | Composition |
|---|---|---|
| `Owner` | Proprietor; full control incl. configuration, audit, stock adjustments, commission corrections | composes `Manager` |
| `Manager` | Runs the floor: everything operational + catalog/package/offer/membership admin + payouts | composes `Receptionist`, `Provider` |
| `Receptionist` | Desk: customers, bookings, waitlist, billing & cash | — |
| `Provider` | Stylists, beauticians, therapists: their own day list, start/complete own services | — |

### 5.3 Permission matrix

Verbs from the closed set (PLA-AUT-003); bespoke actions ride `ActionExecute`. All grants at `Tenant` scope — single outlet. Entity values are §6's EntityDefinition keys.

\* O=Owner, M=Manager, R=Receptionist, P=Provider.

| Entity | Read | Create | Edit | Delete | ActionExecute |
|---|---|---|---|---|---|
| `verity.salon.customer` | O M R | R M O | R M O | — | set-state (O) |
| `verity.salon.service_category` / `service` / `service_rate` | O M R P | M O | M O | — | — |
| `verity.salon.appointment` | O M R P† | R M O | — | — | reschedule/cancel/no-show (R M O), check-in (R M O), begin/complete (P M O‡) |
| `verity.salon.waitlist_entry` | O M R | R M O | — | — | seat-next/mark-left (R M O) |
| `verity.salon.package_definition` | O M R P | M O | M O | — | — |
| `verity.salon.package_sale` | O M R | R M O | — | — | consume (R M O at checkout), cancel (O) |
| `verity.salon.offer_definition` | O M R | M O | M O | — | pause/resume/end (M O) |
| `verity.salon.membership_plan` | O M R | M O | M O | — | — |
| `verity.salon.customer_membership` | O M R | R M O | — | — | renew (R M O), cancel (O) |
| `verity.salon.product` | O M R P | M O | M O | — | — |
| `verity.salon.stock_batch` | O M | M O (receive) | — | — | write-off expired (O) |
| `verity.salon.stock_movement` | O M | (via movements) | — never edited — | — | adjust (O), record-backbar-usage (P M O) |
| `verity.salon.commission_rule` | O M | O | O | — | — |
| `verity.salon.commission_entry` | O M | (auto on settle / adjustments) | — never edited — | — | adjust (O) |
| `verity.salon.commission_payout` | O M | M O | — | — | — |
| `verity.salon.invoice` | O M R | R M O (generate) | — | — | discount (M O), void (O unpaid) |
| `verity.salon.payment` | O M R | R M O | — | — | — |
| `verity.scheduling.*` | O M R P | via salon commands | availability windows (M O) | — | — |

\† Providers read **their own day's** appointments via query filtering (Layer-2 `ctx.scope()` on the provider dimension), not the whole table.
\‡ A provider completes only services assigned to them — enforced in command preconditions against the acting user, not by grant gymnastics.

Notes:

- **Providers never touch money or contacts.** `invoice`, `payment`, `commission_*` are invisible to `Provider`; and see the field restriction below.
- **Deleting anything is never granted.** Services retire (`isFormulary`-style active flag), products retire, offers end, memberships lapse — history keeps its snapshots.
- **Field restriction (Layer 3, second real consumer after the clinic's diagnosis redaction):** `FieldPermission` on `verity.salon.customer#phone` and `#email`, `Read` granted to `Owner`/`Manager`/`Receptionist` only. `redactFields()` omits them from every provider response. Client-contact poaching by departing staff is a real salon-industry loss; the platform makes it structural rather than trusting policy.
- **Read auditing does not exist** (platform audits writes only). Flagged §17-D10, shared with the clinic register.

---

## 6. Domain model — modules and entities

Eleven modules, one capability. Every entity follows the base-entity pattern exactly (`id, tenantId, createdAt, updatedAt, version, customFields`), installs by migration following the Location exemplar (tables → ENABLE+FORCE RLS → isolation policies → INSERT `capability_definition`/`entity_definition` rows ON CONFLICT DO NOTHING → seed states/transitions), and carries zero platform edits.

Money convention: **integer minor units (paise)** in every amount column (`priceMinor`, `amountMinor`, `ratePct` kept as basis points `rateBps Int` to avoid float percentages), currency INR from config. Precedent: Bible V6 DEC-002's `pricePaise`; representation ratified at build review (§17-D6). Totals computed server-side inside commands; clients display only.

### Module M1 — Customers (`verity.salon.customer`)

Features: quick registration; duplicate check by phone before create (search-first UI; merge is *not* offered in v1 — §17-D7); contact + preference capture (skin/hair sensitivity notes — the spa analogue of allergies); birthday captured as a plain date (offer targeting reads it; CRM-grade profiles remain out); visit history timeline (appointments + invoices + package balances + memberships); lifecycle instead of deletion.

Entity:

- **Customer** `verity.salon.customer` — `displayName`, `phone String?` (indexed; dedup key; FieldPermission-restricted), `email String?` (restricted likewise), `dateOfBirth Date?`, `anniversaryDate Date?`, `gender String?` (custom-field candidate), `sensitivities String?` (free text, permanent banner on service surfaces), `preferences String?` (usual stylist, product likes), `notes String?`.
  - Custom fields (PLA-EXT-002): e.g. `skinType`, `hairType`, `referralSource` — `CustomFieldSchema` rows validated server-side on every write, no migration.

Lifetime-value style figures are **derived in queries**, never stored columns.

### Module M2 — Services catalogue (`verity.salon.service_category`, `verity.salon.service`, `verity.salon.service_rate`)

Features: category tree (one level, sort order); services with default duration and base price; **grade-based rates** (Senior/Junior/Stylist tiers with price and optional duration overrides); retirement without deletion; photo placeholder slot reserved for when §17-D3 binds a driver.

Entities:

- **ServiceCategory** `verity.salon.service_category` — `name`, `sortOrder Int`, `active Boolean @default(true)`; optionally maps to the staff ResourceGroup that performs it (`resourceGroupId FK?`) — the join that powers walk-in allocation and booking validation.
- **Service** `verity.salon.service` — `categoryId FK`, `name`, `description String?`, `durationMinutes Int`, `basePriceMinor Int` (CHECK ≥ 0), `requiresRoom Boolean @default(false)`, `active Boolean @default(true)`.
- **ServiceRate** `verity.salon.service_rate` — `serviceId FK`, `staffGrade String` (`junior | stylist | senior`), `priceMinor Int`, `durationMinutesOverride Int?`. Unique per (serviceId, staffGrade). Resolution order at booking/checkout: exact rate for the assigned provider's grade → else base.

Durations are minutes-granular integers; slots are therefore *computed periods*, not a fixed grid (§6-M3).

### Module M3 — Appointments (`verity.salon.appointment`, riding Scheduling)

Features: day/week calendar with one column per provider (or per room); booking computes the period from service duration at the applicable grade-rate; conflict rejection structurally (overlap trigger); reschedule; cancellation; no-show marking; check-in on arrival; the provider begins and completes the service from the floor surface.

The division of labour is exact: **Scheduling owns time**, **the salon owns meaning**. For a solo service, `book_appointment` creates one Booking against the chosen provider Resource. For a room service, the command resolves the category's `AllOf` group via `resolveGroup()` and writes one Booking per member resource (therapist + room), all with `subjectEntityKey="verity.salon.appointment"` — either being busy rejects the whole command atomically. Slot granularity follows the service: `startsAt` + computed `endsAt`; no grid configuration exists because none is needed.

Entity:

- **Appointment** `verity.salon.appointment` — `customerId FK`, `providerResourceId FK?` (null until allocated; required by `begin_service`), `resourceGroupId FK?` (pool/group the booking came from), `bookingIds Json` (the Scheduling rows owned — array because group bookings are several), `services Json` (`[{serviceId, serviceNameSnapshot, durationMinutesSnapshot, priceMinorSnapshot, staffGrade}]` — snapshotted at booking; catalogue edits never rewrite pending work), `quotedTotalMinor Int`, `startsAt`, `endsAt`, `source String @default("booked")` (`booked | walk_in`), `checkedInAt DateTime?`, `startedAt DateTime?`, `completedAt DateTime?`, `state String @default("booked")`.

Walk-ins that are seated immediately (no wait) enter as `source="walk_in"` appointments created by `seat_walk_in`; when nobody is free they become waitlist entries instead (M4) and convert on seating.

### Module M4 — Walk-ins & waitlist (`verity.salon.waitlist_entry`)

Features: front desk notes the customer and wanted services; system quotes a wait estimate from each candidate group's next-free slot (query over windows + bookings — an estimate, labelled as one); `seat_next` allocates the first free member of the target group (AnyOf) and converts the entry into a walk-in appointment; customers leave; board shows the live list ordered by arrival.

Entity:

- **WaitlistEntry** `verity.salon.waitlist_entry` — `customerId FK?` (anonymous walk-ins allowed: plain `displayName String?` instead), `serviceCategoryIds Json`, `quotedWaitMinutes Int?`, `takenAt DateTime?`, `seatedAt DateTime?`, `appointmentId FK?` (set on conversion), `state String @default("waiting")`.

No numbered tokens as in the clinic — salons run on names and estimates, and inventing ticket numbers would be process invention, not modelling. The board is a projection query (§12 freshness).

### Module M5 — Packages (`verity.salon.package_definition`, `verity.salon.package_sale`, `verity.salon.package_consumption`)

Two shapes, one mechanism:

- **Bundle package** — a fixed combination sold once (e.g. "Bridal glow: cut + facial + mani-pedi"), redeemed as a single checkout line.
- **Session package** — pre-purchased sitting counts (e.g. "10 hair-spas, 90 days, ₹4,999"), consumed per visit.

Entities:

- **PackageDefinition** `verity.salon.package_definition` — `name`, `kind String` (`bundle | session`), `items Json` (`[{serviceId, serviceNameSnapshot, sessions Int}]` for session kind; the combination list for bundles), `priceMinor Int`, `validityDays Int`, `active Boolean @default(true)`.
- **PackageSale** `verity.salon.package_sale` — `customerId FK`, `definitionId FK`, `definitionSnapshot Json` (frozen at sale: items, sessions, expiry computed from `validityDays`), `expiresAt DateTime`, `sessionsRemaining Int` (session kind; maintained exclusively by commands, CHECK ≥ 0), `amountPaidMinor Int`, `state String @default("active")`.
- **PackageConsumption** `verity.salon.package_consumption` — `saleId FK`, `appointmentId FK`, `serviceId FK`, `sessions Int` (> 0), `consumedAt DateTime`, `byUserId`. **Append-only by construction:** no update command exists; corrections are compensating entries. Same trust argument as Evidence and the stock ledger.

Balance rules live in command preconditions: consumption requires `active` state, unexpired date, sufficient `sessionsRemaining`; expiry is checked at consumption attempt (a lazy transition — the sale flips to `expired` when a post-expiry attempt arrives, or when any query renders it; no scheduler pretends otherwise, §17-D2). Outstanding-unconsumed value is the **package liability** report input (§14) — sold, unexpired, unconsumed.

### Module M6 — Billing (`verity.salon.invoice`, `verity.salon.invoice_line`, `verity.salon.payment`)

Features: generate the visit invoice sweeping completed-but-unbilled appointments for the customer's current visit chain; **automatic benefit resolution server-side, in priority order**: active package coverage first (consume sessions), then best-of active membership discount and applied offer (never stacked silently — one percentage winner per line, precedence configurable via ConfigParameter), then retail lines at membership discount if any; snapshot lines; part-payments; settle-on-full; void while unpaid; print receipt; standalone retail sale (shelf purchase, no visit) invoices instantly.

Entities:

- **Invoice** `verity.salon.invoice` — `customerId FK?` (null anonymous retail), `visitKey String?`, `subtotalMinor`, `benefitBreakdown Json` (`{packageSessionsApplied, membershipPct, offerId, discountMinor}` — the auditable "why this total" record, PRN-001), `discountMinor @default(0)`, `taxBreakdown Json`, `totalMinor`, `roundingMinor @default(0)`, `amountPaidMinor @default(0)`, `state String @default("open")`, `generatedByUserId`, `settledAt DateTime?`.
- **InvoiceLine** `verity.salon.invoice_line` — `invoiceId FK`, `sourceEntityKey String` (`appointment | package_sale | product_sale`), `sourceEntityId Uuid?`, `descriptionSnapshot`, `qty Int @default(1)`, `unitAmountMinor`, `grossMinor`, `discountMinor @default(0)`, `taxMinor @default(0)`, `netMinor`.
- **Payment** `verity.salon.payment` — `invoiceId FK`, `method String` (cash/upi/card), `amountMinor`, `reference String?`, `receivedByUserId`.

Tax mechanism configurable via ConfigParameter keys; applicability is a tenant setting — the corpus fixes no position on service-GST, so rates print beside each tax line and live in configuration, never code (PRN-001).

Invoice settlement is also the **commission trigger** (M8) and the **package-sale revenue fact** — one command, three ledgers, one transaction.

### Module M7 — Inventory (`verity.salon.product`, `verity.salon.stock_batch`, `verity.salon.stock_movement`)

Features: retail product master (brand, size, mrp); goods receiving by batch; retail sale decrements FEFO; back-bar consumables recorded manually per usage (`record_backbar_usage`, provider-or-manager, reason implicit in the service context); owner-only adjustments with mandatory reason; expiry watch (cosmetics expire); reorder alerts below `reorderLevelUnits`.

Entities:

- **Product** `verity.salon.product` — `name`, `brandName?`, `sizeLabel String?`, `mrpMinor Int`, `reorderLevelUnits Int @default(0)`, `unitLabel String`, `isRetail Boolean @default(true)` (false = pure back-bar supply, hidden from sale UI), `active Boolean @default(true)`.
- **StockBatch** `verity.salon.stock_batch` — `productId FK`, `batchNo String?`, `expiryDate Date?` (nullable — not every SKU carries one), `qtyUnits Int` (CHECK ≥ 0), `costMinor Int` (purchase cost — margin reporting input), `mrpMinor Int`, `receivedAt`.
- **StockMovement** `verity.salon.stock_movement` — `batchId FK`, `kind String` (`receive | sale | backbar | adjust | writeoff`), `deltaQty Int` (signed), `refEntityKey String?`, `refEntityId Uuid?`, `reason String?`, `byUserId`, `createdAt`. **Append-only by construction.**

Per-service norm-based auto-depletion (e.g. "every colour consumes 30 ml developer") is deliberately absent — plausible-looking norms go stale and silently corrupt stock truth; manual usage records stay honest. Norms return via §15's decision path only if asked.

### Module M8 — Commissions (`verity.salon.commission_rule`, `verity.salon.commission_entry`, `verity.salon.commission_payout`)

Features: rules per staff-grade × earning head (service categories, retail) as basis-point rates; automatic accrual when an invoice settles — each attributable line generates an entry for the serving provider (package-covered visits accrue at a configurable reduced rate, since the revenue was taken earlier); owner corrections as explicit adjustment entries (never edits); monthly payout runs close the period and lock entries behind a payout id; provider-visible statement (own earnings only).

Entities:

- **CommissionRule** `verity.salon.commission_rule` — `staffGrade String?` (null = any), `headEntityKey String` (`verity.salon.appointment` service lines or `product_sale`), `headFilter String?` (service-category id), `rateBps Int` (CHECK ≥ 0), `packageCoveredRateBps Int?` (reduced rate when the line was package-funded), `active Boolean @default(true)`.
- **CommissionEntry** `verity.salon.commission_entry` — `providerUserId FK`, `kind String` (`earned | adjustment`), `invoiceId FK?`, `invoiceLineId FK?`, `baseAmountMinor`, `rateBps`, `amountMinor` (signed for negative adjustments), `reason String?`, `incurredAt DateTime`, `payoutId FK?` (null until paid out). **Append-only; corrections are new rows.**
- **CommissionPayout** `verity.salon.commission_payout` — `providerUserId FK`, `periodStart Date`, `periodEnd Date`, `totalMinor Int`, `paidAt DateTime`, `reference String?` (bank/UPI ref), `createdByUserId`.

Accrual happens inside `add_payment`'s settling transaction: rules resolved at settle-time (rule changes affect future settles, never past ones — entries carry their `rateBps`). Slab/target schemes are out (§17-D12).

### Module M9 — Memberships (`verity.salon.membership_plan`, `verity.salon.customer_membership`)

Features: plan catalogue (duration, price, service/product discount bps, perks text); selling a membership (instant invoice line or standalone sale — v1 standalone invoice); renewal creates a fresh row (history preserved; old rows keep `supersededBy` pointer); cancellation owner-only; expiry lazy-checked like packages.

Entities:

- **MembershipPlan** `verity.salon.membership_plan` — `name`, `durationDays Int`, `priceMinor Int`, `serviceDiscountBps Int` (CHECK 0..10000), `productDiscountBps Int`, `perks String?`, `active Boolean @default(true)`.
- **CustomerMembership** `verity.salon.customer_membership` — `customerId FK`, `planId FK`, `planSnapshot Json`, `startedAt DateTime`, `expiresAt DateTime`, `supersededById FK?`, `state String @default("active")`.

Memberships discount; packages entitle; offers promote. The three benefit kinds meet only inside `generate_invoice`'s resolver, whose precedence order and full arithmetic land in `benefitBreakdown` — one place to audit, one place to change.

### Module M10 — Offers (`verity.salon.offer_definition`)

Features: percent or flat-amount off a service/category/product scope, validity window, optional redemption cap, manager pause/resume, end. Application is server-side only at invoice generation; the desk may *suggest* an offer, the command decides eligibility and stamps the redemption onto the line.

Entity:

- **OfferDefinition** `verity.salon.offer_definition` — `name`, `kind String` (`percent | flat`), `value Int` (bps or minor units), `scopeEntityKey String?` + `scopeEntityId Uuid?` (service/category/product; null = everything), `validFrom DateTime`, `validTo DateTime`, `maxRedemptions Int?`, `redemptionCount Int @default(0)` (maintained by commands), `state String @default("active")`.

Birthday/anniversary auto-offers read the customer dates at generation time — a resolver rule, not a separate campaign engine.

### Module M11 — Reporting

No new entities — queries over invoices, appointments, windows, packages, memberships, movements, commissions. Catalogue in §14.

### 6.9 Why customers are not Parties in v1 (stated, not silent)

Identical reasoning to the clinic's patient decision, summarised: `provisionIdentity()` requires a Supabase Auth identity, so registering a walk-in would mint credentials for someone who will never log in, in a single global realm, under ADR-007's invitation-and-verification regime designed for responding persons. V1 therefore keeps `Customer` a capability-owned, tenant-scoped, RLS-isolated entity — deduped by phone within the tenant, never touching global tables — squarely the PLATFORM-FREEZE's encouraged purpose-built shape, and reversible when a portal arrives (conversion touches ADR-007 verification and INV-003 dedup; §17-D7, product-owner sign-off). Growing Party itself into "customer with a birthday and a usual stylist" would repeat the ontology drift CLAUDE.md forbids.

---

## 7. State machines

Seeded as `StateDefinition` + `TransitionDefinition` rows in the install migration. Category bindings follow ADR-009; only Completed/Cancelled may be terminal; INV-002 locks terminals permanently; structural guard from absence of TransitionDefinition rows.

### Appointment `verity.salon.appointment`

| State | Category | Terminal | Meaning |
|---|---|---|---|
| `booked` | Pending | no | Confirmed future or present booking (initial) |
| `checked_in` | Active | no | Customer present, awaiting the chair/room |
| `in_service` | Active | no | Provider working; actual service clock |
| `completed` | Completed | no | Execution terminal (ADR-003 decoupling) — awaiting billing tail |
| `billed` | Pending | no | On an open invoice |
| `settled` | Completed | **yes** | Paid and closed — INV-002 lock |
| `cancelled` | Cancelled | **yes** | Called off |
| `no_show` | Cancelled | **yes** | Never arrived (past grace window) |

Transitions: booked→checked_in · booked→cancelled · booked→no_show · checked_in→in_service · checked_in→cancelled · checked_in→no_show · in_service→completed · completed→billed · billed→settled. Cancelling releases owned Bookings command-side in the same transaction. `billed→settled` rides invoice settlement.

### WaitlistEntry `verity.salon.waitlist_entry`

| State | Category | Terminal | Meaning |
|---|---|---|---|
| `waiting` | Pending | no | Noted, awaiting a free provider (initial) |
| `seated` | Active | no | Converted to a walk-in appointment |
| `done` | Completed | **yes** | Served through (mirror of the appointment's settle; closed for board hygiene) |
| `left` | Cancelled | **yes** | Departed |

Transitions: waiting→seated · waiting→left · seated→done. `done` is written by the appointment-settling command.

### PackageSale `verity.salon.package_sale`

| State | Category | Terminal | Meaning |
|---|---|---|---|
| `active` | Active | no | Sessions/bundle available (initial) |
| `exhausted` | Completed | **yes** | Natural end — all sessions consumed |
| `expired` | Completed | **yes** | Natural end — validity lapsed (lazy flip, §6-M5) |
| `cancelled` | Cancelled | **yes** | Owner void (refund handled outside the system; reason mandatory) |

Transitions: active→exhausted · active→expired · active→cancelled. Two natural-end terminals are deliberate: both are Completed-category facts about a finished commercial object, and INV-002 locking them preserves liability-report integrity.

### CustomerMembership `verity.salon.customer_membership`

| State | Category | Terminal | Meaning |
|---|---|---|---|
| `active` | Active | no | Benefits live (initial) |
| `expired` | Completed | **yes** | Validity lapsed (lazy flip) |
| `superseded` | Completed | **yes** | Renewed — replaced by a newer row |
| `cancelled` | Cancelled | **yes** | Owner void |

Transitions: active→expired · active→superseded · active→cancelled.

### Invoice `verity.salon.invoice`

| State | Category | Terminal | Meaning |
|---|---|---|---|
| `open` | Active | no | Generated, accepting payments (initial) |
| `settled` | Completed | **yes** | Paid in full — INV-002 lock; commissions accrued |
| `voided` | Cancelled | **yes** | Owner-only; precondition zero Payment rows |

Transitions: open→settled · open→voided. Part-payments are rows, not a state.

### OfferDefinition `verity.salon.offer_definition`

| State | Category | Terminal | Meaning |
|---|---|---|---|
| `active` | Active | no | Applying to eligible checkouts (initial) |
| `paused` | Blocked | no | Temporarily withheld |
| `ended` | Completed | **yes** | Retired permanently |

Transitions: active→paused · paused→active (an explicit, declared operational toggle — the one bidirectional pair in this capability, chosen deliberately and called out here rather than smuggled in) · active→ended · paused→ended.

---

## 8. Command catalog

Every row: MET-ACT-001 zod input, MET-ACT-002 authorize, MET-ACT-003 preconditions, transactional mutation, MET-ACT-004 outbox events, Activity diff where fields change. Keys namespaced `verity.salon.*`.

| Command key | Verb | Actor(s) | Key preconditions | Emits |
|---|---|---|---|---|
| `verity.salon.register_customer` | Create | R M O | phone unique per tenant when given | `customer.registered` |
| `verity.salon.update_customer` | Edit | R M O | not terminal state | `customer.updated` + Activity diff |
| `verity.salon.set_customer_state` | ActionExecute | O | valid target | `customer.state_changed` |
| `verity.salon.create_service_category` / `edit_service_category` | Create/Edit | M O | name unique | `service_category.created/updated` |
| `verity.salon.create_service` / `edit_service` | Create/Edit | M O | category active | `service.created/updated` |
| `verity.salon.set_service_rate` | Create/Edit | M O | grade enum; ≥ 0 | `service.rate_set` |
| `verity.salon.book_appointment` | Create | R M O | group/resource free for computed period; snapshots services; solo → 1 Booking, room service → per-member Bookings | `appointment.booked` + `verity.scheduling.booked`(n) |
| `verity.salon.reschedule_appointment` | ActionExecute | R M O | state `booked`; new period free; releases + retakes Bookings | `appointment.rescheduled` |
| `verity.salon.cancel_appointment` | ActionExecute | R M O | not past `completed`; releases Bookings | `appointment.cancelled` |
| `verity.salon.mark_no_show` | ActionExecute | R M O | state allows; grace passed | `appointment.no_show` |
| `verity.salon.check_in` | ActionExecute | R M O | state `booked`, window current | `appointment.checked_in` |
| `verity.salon.begin_service` | ActionExecute | P M O | state `checked_in`; acting user is the appointed provider (or allocates from group); sets `providerResourceId` | `appointment.begun` |
| `verity.salon.complete_service` | ActionExecute | P M O | state `in_service`; actor owns it | `appointment.completed` |
| `verity.salon.add_waitlist` | Create | R M O | — | `waitlist.added` |
| `verity.salon.seat_next` | ActionExecute | R M O | free member in target group (`resolveGroup` AnyOf); converts to walk-in appointment | `waitlist.seated` |
| `verity.salon.mark_waitlist_left` | ActionExecute | R M O | state `waiting` | `waitlist.left` |
| `verity.salon.define_package` / `edit_package` | Create/Edit | M O | items reference active services | `package.defined/updated` |
| `verity.salon.sell_package` | Create | R M O | definition active; computes expiry | `package.sold` |
| `verity.salon.consume_package` | ActionExecute | R M O | sale `active`, unexpired, sessions sufficient; writes PackageConsumption | `package.consumed` |
| `verity.salon.cancel_package_sale` | ActionExecute | O | reason mandatory | `package.sale_cancelled` |
| `verity.salon.define_offer` / `edit_offer` / `pause_offer` / `end_offer` | Create/Edit/AE | M O | validity sane; redemption cap respected at apply-time | `offer.*` |
| `verity.salon.define_membership_plan` / `edit_membership_plan` | Create/Edit | M O | — | `membership_plan.*` |
| `verity.salon.sell_membership` | Create | R M O | no other active overlapping membership for customer | `membership.sold` |
| `verity.salon.renew_membership` | ActionExecute | R M O | current row expiring/expired; new row + supersede link | `membership.renewed` |
| `verity.salon.cancel_membership` | ActionExecute | O | reason mandatory | `membership.cancelled` |
| `verity.salon.create_product` / `edit_product` | Create/Edit | M O | — | `product.*` |
| `verity.salon.receive_stock` | Create | M O | batch unique per product+batchNo when given | `stock.received` |
| `verity.salon.record_backbar_usage` | ActionExecute | P M O | batch has stock; writes movement | `stock.backbar_used` |
| `verity.salon.adjust_stock` | ActionExecute | O | reason mandatory | `stock.adjusted` |
| `verity.salon.write_off_expired` | ActionExecute | O | batch expired, qty > 0 | `stock.written_off` |
| `verity.salon.generate_invoice` | Create | R M O | ≥1 unbilled artifact in visit chain (or explicit retail mode); benefit resolver runs; idempotent per source artifact | `invoice.generated` |
| `verity.salon.add_payment` | ActionExecute | R M O | invoice `open`; amount ≤ balance; settle-at-full also: appointments→settled, package consumptions finalised, commission entries accrued | `invoice.payment_recorded` / `invoice.settled` / `commission.accrued` |
| `verity.salon.discount_invoice` | ActionExecute | M O | `open`, zero payments | `invoice.discounted` |
| `verity.salon.void_invoice` | ActionExecute | O | zero Payment rows; compensates commission entries (negative adjustment) and package consumptions if any | `invoice.voided` |
| `verity.salon.set_commission_rule` | Create/Edit | O | rateBps 0..10000 | `commission.rule_set` |
| `verity.salon.adjust_commission` | ActionExecute | O | reason mandatory; signed entry | `commission.adjusted` |
| `verity.salon.payout_commissions` | ActionExecute | M O | ≥1 unbilled-payout entry in period for provider; stamps payoutId, closes period | `commission.paid_out` |

Queries (all tenant-scoped, Layer-2 via `ctx.scope()`, Layer-3 redaction automatic on top-level arrays): `search_customers`, `customer_timeline`, `today_sheet`, `provider_calendar`, `provider_day` (self-filtered), `next_free_slots` (estimate engine), `waitlist_board`, `package_balances`, `expiring_packages`, `membership_due`, `invoices_open`, `stock_levels`, `expiry_watch`, `commission_statement`, `dashboard_counts`, plus the §14 report queries.

---

## 9. Events & audit

Every command writes DomainEvents to the outbox inside the command transaction; Activity rows capture diffs on edits. Events downstream automation would subscribe to:

- `customer.registered` / `.updated` / `.state_changed`
- `appointment.booked` / `.rescheduled` / `.cancelled` / `.no_show` / `.checked_in` / `.begun` / `.completed`
- `waitlist.added` / `.seated` / `.left`
- `package.sold` / `.consumed` / `.sale_cancelled`
- `membership.sold` / `.renewed` / `.cancelled`
- `offer.paused` / `.ended` / `.redeemed` (emitted at invoice generation per applied line)
- `stock.received` / `.backbar_used` / `.adjusted` / `.written_off` / `.low_stock`
- `invoice.generated` / `.payment_recorded` / `.settled` / `.voided`
- `commission.accrued` / `.adjusted` / `.paid_out`

Nothing consumes them yet — no dispatcher exists. They are the contract a future SMS bridge or accounting export subscribes to, emitted at zero marginal cost.

Audit posture: mutations fully attributable and append-only where it matters (movements, consumptions, commission entries). **Read-access auditing does not exist** — shared platform gap, §17-D10.

---

## 10. SLA application

Deliberately thin. Unlike the lab (turnaround promises) or the kitchen (prep discipline), a salon has few objective deadlines, and forcing clocks onto taste-driven services would manufacture metrics. What genuinely benefits:

| Policy target | Intent | Calendar | Consequence |
|---|---|---|---|
| `verity.salon.waitlist_entry` | Start at `added`, stop at `seated` | BusinessCalendar opening hours | `urgencyFor()` badge escalates the waitlist board; quoted-vs-actual wait feeds §14's estimate-quality metric |

No-show grace is a precondition comparison (slot end + configured minutes), not a clock. Package/membership expiry is lazy (§6-M5). Nothing else gets a clock until a requirement asks — the SLA substrate sits unused beyond this one policy, which is the correct amount.

Sweeps need the scheduler binding like everywhere else (§17-D2); urgency badges compute on-read meanwhile.

---

## 11. Notifications

Templates registered at install; literal `{name}` substitution only (existing rule). InApp-only until §17-D4 binds a transport — for a salon, reminders and win-back messages are SMS-shaped, so D4 ranks high here too.

| Template key | Trigger | Recipients | Body |
|---|---|---|---|
| `appointment_reminder` | Scheduled (needs D2), day + 2h before | Customer (future transport) | "{customerName}, your appointment at {salonName} is on {date} at {time}." |
| `waitlist_your_turn` | `seat_next` conversion | Customer (future transport), desk InApp | "{customerName}, your table— your chair is ready." (final copy at build) |
| `package_expiring` | Query-driven (needs D2 sweep) 7 days pre-expiry | Desk InApp → call list | "{customerName} has {sessionsRemaining} sessions expiring {date}." |
| `membership_renewal_due` | Query-driven (needs D2) 7 days pre-expiry | Desk InApp | "{customerName}'s {planName} expires {date}." |
| `low_stock` | `stock.low_stock` event | Manager, Owner InApp | "{productName} at or below reorder level ({qtyUnits} {unitLabel})." |
| `day_close_reminder` | Scheduled (needs D2), closing time | Receptionist, Owner | "Counter day-end pending: {openInvoices} open invoices." |

Suppressed notifications are recorded, never dropped (substrate guarantee) — a missed reminder is always explainable.

---

## 12. Experience design

### 12.1 Shell strategy

Three operational surfaces run in the **worker shell** (`shells: ["worker"]`, `(worker)` route group) — front desk, service floor, counter are task-scoped apps. Manager pages live in `(shell)` under `/salon/…` via contributed navigation. Worker-shell chrome remains the shared open decision (§17-D5) — now three designs deep. Navigation contributed; the shell holds no route map.

### 12.2 Page inventory — Front desk surface (`/desk`)

| Page | Route | Purpose |
|---|---|---|
| F1 Today | `/desk` | Day sheet: bookings per provider column, waitlist count, quick actions |
| F2 Book | `/desk/book` | Service picker → duration/price computed by grade → provider or pool picker → conflict-checked calendar |
| F3 Customers | `/desk/customers` | Search-first (phone duplicate check), register, profile drawer with balances (package sessions, membership status) and sensitivities banner |
| F4 Waitlist | `/desk/waitlist` | Add walk-in, quotes, seat-next, board view |
| F5 Checkout | `/desk/checkout` | Generate visit invoice, watch the benefit resolver show its work (`benefitBreakdown` preview), take payment, print |

### 12.3 Page inventory — Service floor surface (`/floor`)

| Page | Route | Purpose |
|---|---|---|
| S1 My day | `/floor` | This provider's sequence: checked-in → in_service → next up; begin/complete taps |
| S2 Service screen | `/floor/[id]` | Customer banner with **sensitivities warning**; service detail; preference notes capture (feeds profile); back-bar usage quick-record |
| S3 Board | `/floor/board` | Whole-floor view (managers): every chair's status |

### 12.4 Page inventory — Counter surface (`/counter`)

| Page | Route | Purpose |
|---|---|---|
| C1 Counter home | `/counter` | Open invoices, unsettled visits, today's collections |
| C2 Invoice detail | `/counter/invoices/[id]` | Line recap (snapshots), discount (manager), payments/part-pay, settle, print receipt |
| C3 Retail sale | `/counter/retail` | Shelf purchase without visit: pick products, instant invoice, payment |
| C4 Receipt print | `/counter/invoices/[id]/print` | Print stylesheet; dense financial text solid per ADR-011 |

### 12.5 Manager pages (platform shell, contributed navigation)

| Page | Route | Purpose |
|---|---|---|
| M1 Dashboard | `/salon` | Today census, revenue heads (Donut), chair utilisation (BarStrip), alert strip (low stock, expiring packages, renewals due, open invoices) |
| M2 Customers | `/salon/customers` | Directory; contact fields redacted per role (Layer 3 live) |
| M3 Services | `/salon/services` | Categories, services, grade rates |
| M4 Packages | `/salon/packages` | Definitions, sales, liability view |
| M5 Memberships | `/salon/memberships` | Plans, active memberships, renewals due |
| M6 Offers | `/salon/offers` | Definitions, redemption counts, pause/end |
| M7 Inventory | `/salon/inventory` | Levels, batches, receiving, expiry watch |
| M8 Commissions | `/salon/commissions` | Rules, per-provider statements, adjustment log, payout runs |
| M9 Reports | `/salon/reports` | §14 catalogue |
| M10 Settings | `/salon/settings` | Fees, tax parameters, benefit precedence, no-show grace (ConfigParameter) |
| M11 Staff & roles | `/salon/staff` | Provisioning entry; membership-admin UI gap shared (§17-D9) |
| M12 Audit | `/audit` (platform) | Existing stream |

### 12.6 Material & accessibility notes (ADR-011 applied, not recited)

- **Solid, always:** waitlist board and floor board (public/glanceable screens), long-form notes, dense tables (stock, invoices, commission statements), destructive confirmations (void invoice, cancel package), semantic status colouring (expiry warnings use semantic colours, never accent).
- **Glass where hierarchy earns it:** shell chrome, page headers, overlays (customer-search flyover during booking, confirmations), dashboard cards. Four-layer blur cap; AA composited contrast via `pairFor()` — never white-by-default.
- Reduced-transparency honoured globally; light/dark parity from shared material tokens.

### 12.7 Data freshness

Polling until D1 resolves: `/desk` and boards 5 s; floor and checkout 10 s; counter and dashboards 15 s. Server components re-render on navigation. No optimistic writes — islands apply server results only; concurrent edits surface `E_CONFLICT` and re-read (two desks editing one invoice is the live case).

---

## 13. Configuration & onboarding runbook

1. **Provision** tenant (explicit timeZone) → Organization → Location → BusinessCalendar "Opening hours" → accent.
2. **Activate** `verity.capability.salon` (+ scheduling dependency).
3. **Seed roles & permissions** (migration metadata); verify matrix before staffing.
4. **Provision staff** — `provisionIdentity()` per member; memberships; provider Resources (party-backed) + weekly AvailabilityWindow shifts; room Assets → Asset-backed Resources; compose ResourceGroups per category (`AnyOf` stylist pools, `AllOf` therapy groups).
5. **Catalogues** — services, grade rates, products via CSV import flowing through create commands (authorization/validation/audit for free; no bulk bypass exists or is added).
6. **Commercial setup** — package definitions, membership plans, launch offers, commission rules, tax/fee/no-show-grace ConfigParameters, benefit-precedence choice.
7. **Opening stock** — `receive_stock` per batch; reconcile levels.
8. **Smoke checklist** — register → book (conflict rejected on double-book) → check-in → begin → complete → checkout with package consumption + membership discount → pay → commission entry appears → receipt prints; provider login shows no prices, no contacts, no commissions; audit shows everything.
9. **Go-live** — pin activation version; hand devices to surfaces.

---

## 14. Reports catalogue

| Report | Grain | Source |
|---|---|---|
| Daily census & collections | Day | Appointments, payments |
| Revenue by head (services / retail / packages / memberships) | Day/month | InvoiceLines grouped by `sourceEntityKey` |
| Chair utilisation | Week | Booked minutes ÷ AvailabilityWindow minutes per provider (BarStrip) |
| Estimate quality (quoted vs actual wait) | Week | Waitlist quoted vs seated delta |
| Commission statements | Month | CommissionEntries per provider, payout-linked |
| Package liability outstanding | Snapshot | Active sales × unconsumed sessions × effective unit price |
| Membership health (active, expiring 30d, renewal rate) | Month | CustomerMemberships |
| Offer performance | Campaign | Redemptions vs capped, incremental lines |
| Stock valuation & expiry exposure | Snapshot | Batches (qty × cost/mrp), expiry buckets |
| Customer retention (revisit gaps, top customers) | Quarter | Appointment history per customer |

All rendered from existing chart primitives; browser-print exportable. No warehouse, no aggregation machinery — volumes are query-shaped and inventing pipelines now would violate the freeze.

---

## 15. Out of scope for v1 (each returns via the freeze's decision path when asked)

Online booking / customer app (the D7 portal), loyalty points engine (memberships + offers cover the need), payroll/GL integration beyond payout records, supplier purchase orders, shift-swap approvals, before/after photo galleries (blocked on §17-D3), POS hardware/gateways (GOV-SCO-006), multi-outlet operations (topology supports it), tip management, per-service norm-based back-bar depletion, slab/target commission schemes, marketing campaign automation.

---

## 16. Foundation validation assessment

| Module | Carried by existing primitives without modification? |
|---|---|
| M1 Customers | YES — capability entity + Layer-3 field redaction |
| M2 Services | YES — entities + grade-rate children |
| M3 Appointments | YES — Scheduling end-to-end, extended to `resolveGroup()` composition |
| M4 Walk-ins/waitlist | YES — entity + state machine + group resolution |
| M5 Packages | YES — append-only consumption ledger + CHECK-guarded balance |
| M6 Billing | YES — snapshot lines, benefit resolver in-command, integer money |
| M7 Inventory | YES — movement ledger pattern (proven precedent) |
| M8 Commissions | YES — derive-on-settle inside the command transaction; append-only entries |
| M9 Memberships | YES — entities + lazy expiry + renewal chain |
| M10 Offers | YES — entity + resolver participation |
| M11 Reporting | YES — queries + chart primitives + workspace contributions |

Platform surfaces touched: none. Schema: additive section only. Registry: one line. Shell: contributions only. **Distinctive proof this design adds:** it is the first to exercise ResourceGroup composition (`AllOf` therapist+room, `AnyOf` pools), append-only commercial ledgers at three layers (stock, package sessions, commissions), and cross-ledger transactional coupling (one settlement writing three ledgers atomically) — all inside the frozen contract set. That is the foundation-ready definition's "arbitrary future capabilities" clause demonstrating itself a third time.

Honest limits: the decisions below block specific modules from being *built well* (not modelled), and two accounting/regulatory questions belong to authorities nobody has written yet.

---

## 17. Open decisions register (classified; none solved silently)

| # | Decision | Classification | Blocking |
|---|---|---|---|
| D1 | Realtime posture: polling cadences vs SSE/WebSocket | Implementation decision | UX quality only |
| D2 | Scheduler provider binding — sweeps (expiry flips, reminder jobs, day-close) have no caller | Missing ADR (freeze deferral deliberate) | Push escalation, reminders, proactive expiry notices |
| D3 | Storage driver binding — service photos, before/after galleries reserve but cannot store | Missing ADR (deliberate deferral) | Galleries, document archival |
| D4 | Notification transport — SMS is the salon's real channel; InApp ships mute | Missing ADR (deliberate deferral) | Reminders reach nobody off-device |
| D5 | Worker-shell chrome — three designs now share the need | Missing ADR | Operational surfaces' visual contract |
| D6 | Money representation ratification (integer minor units; `rateBps` proposal) | Implementation decision | Build review |
| D7 | **Customer ↔ Party boundary** — v1 capability-owned; portal-era conversion touches ADR-007 verification + INV-003 dedup | **Missing ADR — product owner** | Portal, cross-tenant identity, merge tooling |
| D8 | Offline wiring for flaky connectivity | Implementation decision (device UX) | Resilience |
| D9 | Membership/staff administration UI gap | Missing specification | Onboarding step 4 ergonomics |
| D10 | Read-access auditing (writes audited only; shared with clinic register) | **Missing specification — possible foundation extension** | Compliance-sensitive deployments |
| D11 | **Package/membership accounting policy** — prepaid liability recognition timing, GST point of taxation, refund proration on cancellation | **Missing specification** — accounting authority outside corpus; do not improvise | Financial reporting correctness |
| D12 | Commission scheme depth — slabs, targets, deductions, split-service attribution | Missing specification if demanded beyond flat bps | Payroll-grade accuracy |
| D13 | Overbooking tolerance — some salons deliberately double-book with assistant support; conflicts are strict in this design | Implementation decision (needs a real demand to reopen) | Scheduling flexibility |
| D14 | Corrective paths — package mis-consumption compensating-entry UX; waitlist seat-failure retry posture | Implementation decision | Build review |

D7, D10, D11 are refused guesses, surfaced with classification and left to the owners the constitution names.

---

## 18. Proposed build sequence

Seven phases, each releasable, each zero platform edits:

1. **Skeleton** — capability directory, additive schema + migration (tables, RLS, metadata rows, templates, config keys), registry line, `registerContribution()`. Conformance tests: isolation fail-closed, authorization, terminal locks.
2. **Customers + services catalogue** — M1/M2 commands/queries, duplicate-check search, grade-rate resolution, redaction test (provider response lacks phone/email — the Layer-3 proof).
3. **Appointments + waitlist** — provider/window setup, booking orchestration (solo and grouped), conflict rejection, check-in/begin/complete, waitlist seat-next. First ResourceGroup-consumer tests.
4. **Billing** — visit sweep, benefit resolver (package → membership/offer precedence) with breakdown, payments/settlement, receipts, retail sale.
5. **Packages + memberships + offers** — definitions, sales, consumption ledger reconciliation property (Σconsumed + remaining = purchased), lazy expiry, renewals, redemption caps.
6. **Inventory + commissions** — receiving, FEFO retail decrement, back-bar usage, low-stock events; derive-on-settle accrual, adjustments, payout closure.
7. **Reports + polish** — §14 catalogue, dashboard contributions, notifications, e2e Playwright pass over the §13 smoke checklist.

Phases 2–4 alone constitute a usable soft-launch (paper packages/commissions); phase 6 completes the commercial loop.

---

## 19. Traceability appendix

| Design element | Authority |
|---|---|
| Capability-not-pack framing | PLATFORM-FREEZE purpose-built principle; CLAUDE.md anti-drift |
| Legitimacy of building this at all | Bible V1 §129 composability thesis; freeze decision path (corpus silent ⇒ default-permitted, exclusions still bind) |
| Customer as capability entity, not Party | ADR-001, ADR-007, `User.authUserId` NOT NULL (schema), §17-D7 |
| Staff identity via `provisionIdentity()` | Bible V2 Primitive 2 §2/§6, INV-003, PLA-IDE-001..004 |
| Providers as party-backed Resources; rooms as Asset-backed | ADR-008; `verity.capability.scheduling` |
| Therapist+room via `AllOf`; walk-in pools via `AnyOf` | ADR-008 ResourceGroup semantics; `resolveGroup()` contract |
| Appointment as Work instance; Booking as its time commitment | Bible V2 WORK; Scheduling `subjectEntityKey` contract |
| Grade-priced services; snapshots on appointments | Forward-looking masters, immutable history (Evidence analogy; dinein/clinic precedent) |
| Waitlist naming; no ChecklistItem/Task misuse | GOV-TER-001..017; ADR-006 |
| State machines & categories | ADR-009 (six categories, two terminals); StateDefinition/TransitionDefinition runtime |
| Command pipeline, events-in-transaction | Spec MET-ACT-001..004; PLA-EXT-004; `executeCommand` |
| Permission matrix, RoleComposition | PLA-AUT-001..003; `verity.resolve_permissions`; ADR-005 scope ladder |
| Contact redaction via FieldPermission | Authorization Layer 3 (`redactFields`, omit-not-null) |
| Append-only ledgers (stock, package sessions, commissions) | EXE-AUD-003 append-only pattern; Evidence precedent |
| Benefit precedence resolved server-side, printed on invoice | PRN-001 least surprise/explainable; command-authority rule (clients display, never compute) |
| Lazy expiry, on-read urgency | No scheduler exists (freeze deferral); §17-D2 |
| Record-and-print billing | GOV-SCO-006 |
| Integer paise + basis-point rates | Bible V6 DEC-002 precedent; §17-D6 |
| Polling freshness; islands apply server results; E_CONFLICT retry | Experience doctrine (no API routes, no client caches) |
| Glass by material level | ADR-011 six constraints |
| Unused Approval capability | PLATFORM-FREEZE anti-speculation rule |
| Unused read auditing; accounting-policy gaps | Honest gaps — §17-D10, §17-D11 |
