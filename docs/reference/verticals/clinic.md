# Clinic Management — Verity Capability Design

| | |
|---|---|
| **Client profile** | One small clinic, single location. Outpatient care with in-house pharmacy and sample-collection laboratory. |
| **Document status** | **DEMONSTRATED / NOT YET BUILT** — this is a clinic capability design on top of the shipped platform. No `verity.capability.clinic` implementation exists until there is code in `src/server/capabilities/clinic/`, additive schema/migrations, registry activation, and passing tests. |
| **Proposed capability id** | `verity.capability.clinic` |
| **Proposed pack framing** | None. This is one purpose-built reusable capability, not an industry pack. The spec's industry packs (`13_industry_packs/`) cover Facilities, Field Service, Maintenance, Professional Services, Security Operations, Staffing — healthcare delivery is absent from the corpus, so this document invents no "clinic pack". |
| **Platform state at 2026-09-01 update** | Foundation frozen at 2026-08-24 milestone (`implementation/PLATFORM-FREEZE.md`). Shipped capabilities now include Location, Asset, Evidence, Scheduling, Approval, Dine-in, and Plywood. No clinic capability exists yet. |

### 0.1 Architecture update from the last 3-4 days of commits

- **Current:** this remains a design-only client capability. There is no `src/server/capabilities/clinic/` implementation.
- **Architecture carried forward:** the current client-system pattern is capability-private code plus additive Prisma models/migrations, registry registration, workspace contributions, and command/query surfaces. Clinic should follow that pattern exactly when built.
- **UI carried forward:** use the current semantic token and accent-driven glass architecture, but keep clinical notes, lab grids, invoices, queue boards, destructive confirmations, and dense tables on solid legible surfaces.
- **Boundary unchanged:** no patient portal, telemedicine, payment-gateway, insurance, ABDM/ABHA, or generic EHR platform layer is implied by the recent plywood/dine-in work.

---

## 1. Client requirements (as received)

A small clinic management system covering:

1. **Patient registration** — demographics, contact, recurring identity across visits.
2. **Appointments** — book patients against doctors' time.
3. **Doctor consultation** — the clinical encounter: vitals, complaint, diagnosis, notes.
4. **Prescriptions** — doctor issues medicines; pharmacy dispenses them.
5. **Billing** — consolidate charges, take payment, print receipt.
6. **Pharmacy** — medicine stock, dispensing against prescriptions, walk-in sales.
7. **Lab requests / results** — doctor orders tests; samples collected; results entered, validated, delivered.
8. **Patient history** — every past visit, prescription, lab result and bill, in one timeline.
9. **Staff roles** — reception, doctor, pharmacist, lab technician each see only their world.
10. **Queue management** — walk-in and appointment flow converge into a live waiting queue.
11. **Reports** — census, revenue, prescription mix, lab turnaround, stock health.

Derived operational requirements (made explicit so scope is testable):

- Allergy information must be impossible to miss on every clinical surface.
- A completed clinical record must not be silently editable afterwards — corrections arrive as dated addenda, preserving what was originally recorded.
- Dispensing must decrement real stock, batch-aware, oldest expiry first, and leave an immutable movement trail.
- Lab results pass through a two-step trust boundary: technician enters, doctor validates. Nothing unvalidated reaches the patient-facing record.
- Appointment reminders and "report ready" messages matter enough that SMS is the natural channel — recorded as an open dependency (§17-D4), not assumed.
- Day-end: census, collections, tax summary.

Explicitly **not** requested and therefore out of scope for v1 (§15): patient portal / self-login, online booking, telemedicine, ABDM/ABHA integration, insurance/TPA claims, e-prescription interchange formats, radiology imaging (PACS), dental/eye charting specialisations, multi-branch, vaccine cold-chain, inventory purchase orders to suppliers, POS/payment-terminal hardware.

---

## 2. Authority position

### 2.1 The decision path this document follows

`implementation/PLATFORM-FREEZE.md`: *can existing Verity primitives support it? If yes, build the capability; if no, smallest additive extension justified in writing.* Answered module by module in §16. Headline: **every requirement lands on existing primitives**, and this capability is the first real consumer of three substrates the restaurant design did not exercise — Scheduling (Bookings), Evidence/StoredFile, and FieldPermission redaction. No platform change is proposed anywhere in this document.

### 2.2 Positive authority: the Bible names this exact composition

Bible V1 §129: *"A company can build a security patrol, a cleaning schedule, **a medical clinic**, or a field technician fleet in under 10 minutes by composing the same underlying primitives (`Work`, `Party`, `Resource`, `Location`)."*

Unlike the dine-in design (which carried a genuine DEC-001 conflict), no decision register entry excludes clinical software. The clinic is therefore an ordinary application of the decision path: capability-owned entities, MET-ACT commands, StateCategory machines, substrate reuse — zero platform edits. What the Bible's sentence does *not* do is decide which side of the Party boundary a walk-in patient sits on; that gap is surfaced in §6.8 and §17-D7 rather than improvised.

Two scope boundaries from the corpus still bind here:

- **GOV-SCO-006** (consumer retail storefronts and POS hardware out of scope): the billing counter is **record-and-print** — record payments, render printable receipt. No cash-drawer registry, no card-terminal integration, no gateway.
- **PLATFORM-FREEZE "what must NOT be built"**: no generic EHR framework, no FHIR layer, no clinical-decision-support engine. Everything below is purpose-built for one clinic's actual workflow; nothing generalises into a healthcare product without a future requirement forcing that through the decision path.

### 2.3 Canonical terminology compliance

All names respect GOV-TER-001..017. Three deliberate term choices need stating:

- **`Consultation` is the domain's Work instance.** Bible V2 defines WORK as the primary execution primitive; a clinical encounter is precisely a unit of service execution moving through states under commands. It is not called a ticket, case, or job card.
- **`QueueToken` and `PrescriptionItem` are capability-owned entities.** Neither is a `ChecklistItem` (ADR-006 reserves that for work sub-steps; `Task` stays reserved for project milestones). A queue position and a prescribed line-item have their own lifecycles; forcing either into checklist semantics would corrupt both. ChecklistItem remains untouched and unused.
- **`Patient` (v1) is a capability-owned entity, not a Party.** Stated, reasoned, and reversible — §6.8. No forbidden legacy vocabulary appears anywhere (no `factoryId`, no `SystemRole` enum, no role-based routes, no `.verity-glass`).

---

## 3. Platform fit — requirement → primitive map

| Clinic requirement | Existing primitive that carries it | Status of primitive |
|---|---|---|
| Tenant isolation | Tenant + RLS via `withTenant()`; fail-closed GUC | BUILT / PROVEN |
| Staff logins | Supabase Auth + Party/User/TenantMembership via `provisionIdentity()` | BUILT / PROVEN |
| Receptionist / Doctor / Pharmacist / LabTech / Owner roles | Role + Permission (Verb+Entity+Scope), `verity.resolve_permissions`, RoleComposition | BUILT / PROVEN |
| Patient, consultation, prescription, stock, lab entities | Capability-owned Prisma tables registered in `EntityDefinition` (MET-ENT-001..005) | Mechanism PROVEN; entities DEMONSTRATED |
| Registration, ordering, dispensing, billing mutations | Command pipeline MET-ACT-001..004 (`executeCommand`) | BUILT / PROVEN |
| Appointment / queue / consultation / lab lifecycles | StateDefinition / TransitionDefinition / StateCategory (ADR-009), `assertMutable` INV-002 lock | BUILT / PROVEN |
| **Appointments against doctor time** | **Scheduling capability**: Resource (ADR-008, party-backed) + AvailabilityWindow + Booking with overlap trigger (`resource_is_free`) | BUILT / PROVEN — **first real consumer** |
| Rooms / equipment (consult room, centrifuge) where needed | Asset-backed Resource, same machinery | BUILT |
| Lab report PDFs, patient documents, signatures | Evidence (append-only, checksum-frozen StoredFile) | BUILT (storage driver unbound — §17-D3) — **first real consumer** |
| Diagnosis hidden from front desk | FieldPermission + `redactFields()` (Layer 3) | BUILT / PROVEN — **first real consumer** |
| Audit of every change | Activity stream + DomainEvent outbox, append-only triggers | BUILT / PROVEN |
| Lab turnaround discipline | SLA substrate: SlaPolicy/SlaClock driven by StateCategory, `urgencyFor()` | BUILT (sweep needs scheduler binding — §17-D2) |
| Reminders, ready pings | Notification substrate (`notify()`, literal templates, suppression recorded) | BUILT (transport dispatcher unbound — §17-D4) |
| Stock movement trail | Append-only capability table + events (pattern proven by DomainEvent/Activity triggers) | DEMONSTRATED |
| Reports/dashboards | Server components + chart primitives (Donut/BarStrip/StairFigure), workspace contributions | BUILT |
| Look & feel | ADR-011 glass material system, accent presets, shell chrome | BUILT |
| Approval chains | Approval capability exists — deliberately **unused** here (§6.7) | n/a |

Everything else is capability code: tables under `prisma/schema.prisma` (additive), one directory `src/server/capabilities/clinic/`, routes under `src/app/(shell)/clinic/…` plus five operational surfaces, registration in `src/server/capabilities/registry.ts`, migration-seeded metadata rows, one `registerContribution()` call. Per PLATFORM-FREEZE, all expected-and-additive, not platform changes.

---

## 4. Tenant & organization topology

```
Tenant: "<Clinic name>"              timeZone: Asia/Kolkata (explicit, never guessed;
                                     configurable at provisioning)
└── Organization: "Main practice"    (single site; hierarchy ready for a second branch)
    └── Location: "Clinic premises"  (operational site; Place+Address attached)
```

- One Tenant = the legal practice; ADR-005 boundary. A second branch later becomes a second Organization + Location inside the same tenant — no schema change, and Organization-scoped grants start to matter then.
- `Organization.timeZone` inherits the tenant zone; instants stored UTC, rendered via `temporal.ts`. Authority: Bible V4 §5.B, EXE-SCH-001.
- BusinessCalendar "Clinic hours" (tenant-wide) with per-weekday windows and holidays — feeds the working-hours choice in §10.
- Capability activation: `TenantActivation(verity.capability.clinic)` pins version at go-live (PLA-CAP-002, PLA-VER-003). Note the capability declares dependencies on `verity.capability.scheduling` and `verity.capability.evidence`; activation ordering follows the existing registry rules.
- Accent: tenant preset; default Warm Sand Gold `#D4A017` stands unless changed in Appearance settings. Never hard-coded; everything derives from `--accent-seed`.

Onboarding runbook: §13.

---

## 5. Staff identity, roles & permissions

### 5.1 People

Every staff member gets one global Party + User via `provisionIdentity()` (never direct INSERT — RLS denies it deliberately) bound to the organization with one membership each. Patients are **never** provisioned as identities in v1 (§6.8 explains why).

Each **doctor** additionally becomes a `Resource` backed by their `partyId` (ADR-008: exactly one Party backer), carrying `AvailabilityWindow` rows for consulting hours and appearing in Bookings. A procedure room or shared lab equipment can become an Asset-backed Resource if the clinic schedules against it — same machinery, additive.

Shared front-desk computers are a reality; authentication there is currently per-person Supabase sign-in. A PIN-per-staff fast-switch over shared sessions is a **security decision needing an ADR** (§17-D5) — not improvised here.

### 5.2 Roles

Closed set for v1. Composition via RoleComposition (PLA-AUT-001); flattening stays DB-side in `verity.resolve_permissions`.

| Role | Purpose | Composition |
|---|---|---|
| `Owner` | Doctor-proprietor or administrator; full control incl. configuration, audit, stock adjustment | composes `Doctor` |
| `Doctor` | Consultations, prescribing, placing lab orders, validating results | composes nothing |
| `Receptionist` | Front desk: registration, appointments, queue, check-in, billing & cash (small-clinic reality: cashier duty folds here) | composes nothing |
| `Pharmacist` | Dispensing, stock receiving, walk-in sales at pharmacy counter | composes nothing |
| `LabTechnician` | Sample collection, result entry | composes nothing |

Result *validation* belongs to `Doctor` (the signing clinician), not to the technician who entered values — the two-step trust boundary is a permission boundary as much as a state boundary.

### 5.3 Permission matrix

Verbs from the closed set (PLA-AUT-003); bespoke actions ride `ActionExecute`. All grants at `Tenant` scope — single site, so Organization/Location scopes stay unused. Entity values are §6's EntityDefinition keys.

\* O=Owner, D=Doctor, R=Receptionist, P=Pharmacist, L=Lab Technician.

| Entity | Read | Create | Edit | Delete | ActionExecute |
|---|---|---|---|---|---|
| `verity.clinic.patient` | O D R | R O | R D O | — | — |
| `verity.clinic.appointment` | O D R | R O | — | — | reschedule/cancel/no-show (R O) |
| `verity.clinic.queue_token` | O D R | R O (check-in) | — | — | call-next (R D O), mark-left (R O) |
| `verity.clinic.consultation` | O D | D O (begin) | — | — | complete/close (D O) |
| `verity.clinic.addendum` | O D | D O | — | — | — |
| `verity.clinic.prescription` | O D P | D O | — | — | cancel (D O, undispensed only) |
| `verity.clinic.prescription_item` | O D P | (via create_prescription) | — | — | dispense (P O), substitute (P O), cancel-line (D O) |
| `verity.clinic.drug` | O D P | O | O | — | — |
| `verity.clinic.stock_batch` | O P | P O (receive) | — | — | write-off expired (O) |
| `verity.clinic.stock_movement` | O P | (via movements) | — never edited — | — | adjust (O only) |
| `verity.clinic.lab_test` | O D L | O | O | — | — |
| `verity.clinic.lab_order` | O D L | D O, R O | — | — | collect (L O), enter-results (L O), validate (D O), cancel (D O) |
| `verity.clinic.invoice` | O R | R O (generate) | — | — | discount (O), void (O, unpaid only) |
| `verity.clinic.payment` | O R | R O (add-payment) | — | — | — |
| `verity.scheduling.*` (resources/bookings) | O D R | via clinic commands | availability windows (O) | — | — |

Notes:

- **Doctors do not read money.** `invoice` and `payment` are invisible to `Doctor`; the consultation workspace shows clinical history, not what the patient paid. Conversely reception sees *that* a visit happened, never *why* — see the field restriction below.
- **Deleting anything is never granted.** Patients go `inactive`, drugs retire, tests retire; historical references stay intact because every chargeable document snapshots its descriptors at write time (§6).
- **Field restriction (Layer 3, first real consumer):** `FieldPermission` on `verity.clinic.consultation#diagnosis` granted as `Read` to `Owner` and `Doctor` only. `redactFields()` omits diagnosis — it does not null it — from every reception response, so the front desk books, queues and bills without ever holding clinical facts. The same mechanism covers any sensitive custom field a tenant adds later.
- **Read auditing does not exist yet** (Activity covers writes; DomainEvent covers committed changes). Clinical-data regimes often demand access logs on reads. Recorded as §17-D10, not papered over.

---

## 6. Domain model — modules and entities

Nine modules, one capability. Every entity follows the base-entity pattern exactly (`id, tenantId, createdAt, updatedAt, version, customFields`), lives in a capability section of `prisma/schema.prisma`, installs by a migration following the Location exemplar (tables → ENABLE+FORCE RLS → isolation policies → INSERT `capability_definition`/`entity_definition` rows ON CONFLICT DO NOTHING → seed states/transitions), and carries zero platform edits.

Money convention: **integer minor units (paise)** in every amount column (`priceMinor`, `amountMinor`, `mrpMinor`), currency INR from config. Precedent: Bible V6 DEC-002's `pricePaise`. Final representation ratified at build review (§17-D6). Totals computed server-side inside commands; clients only display them.

### Module M1 — Patient registry (`verity.clinic.patient`)

Features: quick registration (name, phone, age/DOB, gender); duplicate check by phone before create (search-first UI; near-matches shown, merge is *not* offered in v1 — §17-D7); demographics edit; allergy field surfaced everywhere; documents attached as Evidence; lifecycle instead of deletion.

Entity:

- **Patient** `verity.clinic.patient` — `displayName`, `phone String?` (indexed; the dedup key), `dateOfBirth Date?`, `gender String?` (custom-field candidate), `bloodGroup String?`, `allergies String?` (free text, rendered as a permanent banner on every clinical surface), `addressLine String?`, `notes String?`.
  - Custom fields (PLA-EXT-002): e.g. `abhaId`, `guardianName`, `identifierType` — declared as `CustomFieldSchema` rows, validated server-side on every write, no migration.

Age is computed from `dateOfBirth` at render time; never stored and allowed to rot.

Documents (referral letters, old reports, IDs) attach via the Evidence capability: `Evidence(entityKey="verity.clinic.patient", entityId=…, kind=Document, fileId→StoredFile)` — append-only, checksum-frozen, listed on the patient timeline. Storage driver unbound until §17-D3 resolves.

### Module M2 — Appointments (`verity.clinic.appointment`, riding Scheduling)

Features: week/day calendar per doctor; slot grid (default 15 min, ConfigParameter); booking with conflict rejection (overlap trigger, named `E_VALIDATION` message); reschedule (release old Booking, take new); cancellation with reason; no-show marking; walk-ins bypass appointments entirely and enter via queue (M3).

Entity:

- **Appointment** `verity.clinic.appointment` — `patientId FK`, `doctorResourceId FK → Resource` (party-backed), `startsAt`, `endsAt`, `reason String?`, `bookingId FK → Booking` (the Scheduling row this appointment owns), `checkedInAt DateTime?`, `state String @default("scheduled")`.

The division of labour is exact: **Scheduling owns time** (does the doctor have this slot? — `verity.scheduling.book` with `subjectEntityKey="verity.clinic.appointment"`), **the clinic owns meaning** (who, why, what happened — the appointment's own state machine). `book_appointment` orchestrates both inside one command transaction: create Appointment, then Booking; if the slot is taken the whole command rolls back with the friendly message, exactly as `createResource`'s precondition mirrors the DB constraint for a better error.

Doctor unavailability (leave, conference) is `verity.scheduling.declare_unavailable` — an AvailabilityWindow exception — already built.

### Module M3 — Queue management (`verity.clinic.queue_token`)

Features: check-in converts an appointment (or registers a walk-in) into a numbered token for the day; live queue board grouped by doctor; call-next honours priority flags then FIFO; big-screen display mode for the waiting area; token marked `left` if the patient departs.

Entity:

- **QueueToken** `verity.clinic.queue_token` — `date Date` (tokens number per day), `number Int`, `patientId FK`, `doctorResourceId FK?` (null = unassigned pool, assigned at call-next), `appointmentId FK?`, `priority String?` (e.g. `elderly`, `urgent` — honoured by call-next ordering), `issuedByUserId`, `calledAt DateTime?`, `servedAt DateTime?`, `state String @default("waiting")`.

Daily numbering is allocated inside `check_in` (max+1 for the date, transactional). The board is a pure projection query; freshness posture in §12.7.

### Module M4 — Consultation (`verity.clinic.consultation`, `verity.clinic.addendum`)

Features: begin from a called token (or directly); structured vitals capture; chief complaint, diagnosis, notes (SOAP layout is presentation, one stored body of text plus structured vitals); follow-up date; complete; close; post-completion corrections only as addenda.

Entities:

- **Consultation** `verity.clinic.consultation` — `patientId FK`, `doctorUserId FK` (captured from actor context, never payload — PLA-TEN-006), `queueTokenId FK?`, `appointmentId FK?`, `openedAt`, `completedAt DateTime?`, `vitals Json` (`{bpSys, bpDia, pulse, tempC, weightKg, heightCm, spo2}` — one writer per consultation, kept as a single JSON blob; trend charts parse it in queries; normalisation into a observations table waits for a requirement, §15), `chiefComplaint String?`, `diagnosis String?`, `notes String?`, `followUpDate Date?`, `state String @default("open")`.
- **Addendum** `verity.clinic.addendum` — `consultationId FK`, `text`, `authorUserId`, `createdAt`. Base-entity minimal, append-only by absence of edit commands.

Clinical immutability rule: `complete_consultation` freezes the narrative. A later correction is a dated, attributed Addendum — the original text is never rewritten. This is the domain reading of the same principle behind Evidence immutability and the INV-002 lock, applied at capability level. `close_consultation` (administrative closure, after billing settles) locks permanently.

### Module M5 — Prescriptions (`verity.clinic.prescription`, `verity.clinic.prescription_item`, `verity.clinic.drug`)

Features: prescribe from a searchable formulary inside the consultation workspace; dose instruction text per item; issue in the same action as creation (no draft limbo — a doctor's pad is authoritative when written); pharmacist dispenses line-by-line with partial quantities; brand substitution allowed pre-dispense with a mandatory note; cancel only while nothing is dispensed; print-ready layout.

Entities:

- **Drug** `verity.clinic.drug` — `name`, `composition String?`, `form String?` (tablet/syrup/injection…), `isFormulary Boolean @default(true)` (retired drugs flip false; never deleted), `reorderLevelUnits Int @default(0)`, `unitLabel String` ("tabs", "ml").
  - Custom fields: `scheduleClass` (e.g. H / H1 / OTC — informational; see §17-D11 before anyone builds a legal register on top of it), `manufacturer`.
- **Prescription** `verity.clinic.prescription` — `patientId FK`, `consultationId FK` (v1: prescriptions exist only inside consultations; standalone refills return via §15's decision path), `doctorUserId`, `issuedAt`, `instructions String?`, `state String @default("issued")`.
- **PrescriptionItem** `verity.clinic.prescription_item` — `prescriptionId FK`, `drugId FK`, `doseText` ("500mg TDS × 5 days"), `qtyPrescribed Int`, `qtyDispensed Int @default(0)`, `substitutionNote String?`, `state String @default("pending")`.

No price snapshot lives on a prescription item — medicines are priced at dispensing from the stock batch (MRP travels with the batch), and the charge appears on the invoice as its own snapshotted line (M8). The prescription is a clinical document; the invoice is a commercial one.

### Module M6 — Pharmacy (`verity.clinic.stock_batch`, `verity.clinic.stock_movement`)

Features: goods receiving (batch no, expiry, qty, MRP); live stock per drug summed across batches; FEFO dispensing (first-expiry-first-out is a command precondition, not a convention); walk-in OTC sales (a one-line prescription-less dispense that bills immediately); stock adjustment (owner-only, reason mandatory); expiry watch (report + write-off); reorder alerts below `reorderLevelUnits`.

Entities:

- **StockBatch** `verity.clinic.stock_batch` — `drugId FK`, `batchNo String`, `expiryDate Date`, `qtyUnits Int` (CHECK ≥ 0 — the column constraint is the backstop; commands are the path), `mrpMinor Int`, `receivedAt`.
- **StockMovement** `verity.clinic.stock_movement` — `batchId FK`, `kind String` (`receive | dispense | sale | adjust | writeoff`), `deltaQty Int` (signed), `refEntityKey String?`, `refEntityId Uuid?` (points at the `prescription_item` or invoice line that caused it), `reason String?`, `byUserId`, `createdAt`. **Append-only by construction:** no update command exists; corrections are compensating movements. Same trust argument as Evidence.

Batch status (expired, depleted) is *derived* at read time from `expiryDate`/`qtyUnits` — not a stored state machine. Inventory truth is quantity arithmetic plus a movement ledger; adding a lifecycle machine here would create two representations of one fact.

### Module M7 — Laboratory (`verity.clinic.lab_test`, `verity.clinic.lab_order`, `verity.clinic.lab_order_item`)

Features: test catalogue with sample type and default turnaround; order placed from a consultation (or at reception for direct tests); sample collection recording; result entry per parameter with units and abnormal flagging; doctor validation sealing the result; printable report; report PDF attached as Evidence once the storage driver exists; SLA clock per order (§10).

Entities:

- **LabTest** `verity.clinic.lab_test` — `name`, `code String?`, `sampleType String` (blood/urine/…), `defaultTatMinutes Int`, `priceMinor Int`, `unitLabel String?`, `referenceRange String?` (display hint, e.g. "70–100 mg/dL"), `active Boolean @default(true)`.
- **LabOrder** `verity.clinic.lab_order` — `patientId FK`, `consultationId FK?`, `orderedById`, `orderedAt`, `sampleCollectedAt DateTime?`, `validatedAt DateTime?`, `state String @default("ordered")`.
- **LabOrderItem** `verity.clinic.lab_order_item` — `labOrderId FK`, `testId FK`, `testNameSnapshot`, `unitSnapshot String?`, `rangeSnapshot String?` (frozen at order time; catalogue edits never rewrite pending work — same snapshot principle as order lines), `resultValue String?`, `abnormalFlag String?` (`normal | abnormal | critical`), `enteredByUserId?`, `enteredAt?`, `validatedByUserId?`, `validatedAt?`.

Trust boundary made structural: `enter_lab_results` (technician) may fill values on an order in `resulted`-bound states but cannot move it past entry; `validate_lab_results` (doctor) is the only transition to `validated`, stamps validator identity on every item, emits the patient-notifying event, and stops the SLA clock. An unvalidated result is never rendered on the patient timeline.

Rejected sample (haemolysed, insufficient): no reverse edge exists. `cancel_lab_order` records the reason; a fresh order is placed. Corrective-edge alternative ratified at build review (§17-D13).

### Module M8 — Billing (`verity.clinic.invoice`, `verity.clinic.invoice_line`, `verity.clinic.payment`)

Features: generate a visit invoice that sweeps every unbilled chargeable artifact for that patient's current visit chain (consultation fee, lab orders, dispensed prescription items); standalone pharmacy walk-in sale invoices itself at dispense time; line items snapshot description + amount from their source; discount (owner-gated); part-payments; settle-on-full; void while unpaid; print stylesheet receipt; tax mechanism configurable, applicability a tenant setting — the corpus fixes no medical-GST position, so rates live in ConfigParameter and appear printed beside each tax line (PRN-001).

Entities:

- **Invoice** `verity.clinic.invoice` — `patientId FK?` (null for anonymous walk-in sales), `customerName String?` (plain field for those sales — not a Party; same reasoning as §6.8), `visitKey String?` (groups the artifacts of one visit), `subtotalMinor`, `discountMinor @default(0)`, `taxBreakdown Json`, `totalMinor`, `roundingMinor @default(0)`, `amountPaidMinor @default(0)` (maintained by `add_payment`), `state String @default("open")`, `generatedByUserId`, `settledAt DateTime?`.
- **InvoiceLine** `verity.clinic.invoice_line` — `invoiceId FK`, `sourceEntityKey String`, `sourceEntityId Uuid?` (consultation fee / lab order / dispense batch), `descriptionSnapshot`, `qty Int @default(1)`, `unitAmountMinor`, `lineAmountMinor`.
- **Payment** `verity.clinic.payment` — `invoiceId FK`, `method String` (cash/upi/card), `amountMinor`, `reference String?`, `receivedByUserId`.

Consultation fees come from ConfigParameter (`verity.clinic.fees.consultation_first`, `…_follow_up`) read at `generate_invoice`; follow-up-vs-first is decided by prior-visit lookup. Charge generation is idempotent per source artifact (one line per `sourceEntityId`), so regenerating never double-bills.

### Module M9 — Reporting

No new entities — queries over invoices, tokens, lab orders, movements, prescriptions. Catalogue in §14. Live operations panel (waiting count, unvalidated labs, expiring stock, open invoices) rides workspace contributions into the platform Overview.

### 6.7 Why the Approval capability is unused (stated, not silent)

Considered for lab-result validation and stock adjustments and rejected. Both are two-party, single-step, same-session checks — a state transition guarded by permission verbs expresses them completely. Wiring an approval-chain substrate in would add a second representation of a one-step fact. Approval remains available the day a real multi-step requirement appears (e.g., controlled-substance countersign, supplier credit notes).

### 6.8 Why patients are not Parties in v1 (stated, not silent)

The strongest pull in this design is toward making `Patient` a Party — the Bible composes a clinic from `Party` among others, and patient history wants durable identity. The platform's only sanctioned identity path defeats that here: `provisionIdentity()` requires a Supabase Auth user id, so registering a walk-in would mint credentials for someone who will never log in, in a single global realm, under an ADR-007 regime whose uniqueness story (verified contacts, invitation, verification) presupposes a person *responding*. It would also make every registration a cross-cutting global write for what is operationally a local record.

Therefore v1: **`Patient` is a capability-owned, tenant-scoped entity** — RLS-isolated like any other row, deduped by phone within the tenant, never touching global tables. This is squarely the PLATFORM-FREEZE's encouraged purpose-built shape, and it is reversible: when a patient portal arrives, the conversion (link Patient → Party via verified contact, ADR-007 flow, INV-003 dedup questions) is a deliberate migration designed then, not an accident avoided now. Classified **missing ADR / implementation decision requiring product-owner sign-off** — §17-D7. Growing Party itself into "patient with a blood group" was considered and rejected: that is exactly the ontology drift CLAUDE.md forbids.

---

## 7. State machines

Seeded as `StateDefinition` + `TransitionDefinition` rows in the install migration. Category bindings follow ADR-009 (behavioural categories; SLA reads category, never key); only Completed/Cancelled may be terminal; INV-002 locks terminals permanently; structural guard comes from absence of TransitionDefinition rows — no backwards edges declared anywhere unless named below.

### Appointment `verity.clinic.appointment`

| State | Category | Terminal | Meaning |
|---|---|---|---|
| `scheduled` | Pending | no | Booked, awaiting the day (initial) |
| `checked_in` | Active | no | Token issued; living in the queue now |
| `completed` | Completed | **yes** | Visit happened (or day closed over it) |
| `cancelled` | Cancelled | **yes** | Called off by either side |
| `no_show` | Cancelled | **yes** | Never arrived |

Transitions: scheduled→checked_in · scheduled→cancelled · scheduled→no_show · checked_in→completed. Cancelling releases the Booking (command-side, same transaction).

### QueueToken `verity.clinic.queue_token`

| State | Category | Terminal | Meaning |
|---|---|---|---|
| `waiting` | Pending | no | Issued, in the board (initial) |
| `called` | Active | no | Named at the desk / on the board |
| `in_consultation` | Active | no | Inside with the doctor |
| `done` | Completed | **yes** | Seen and through |
| `left` | Cancelled | **yes** | Departed unseen |

Transitions: waiting→called · called→in_consultation · in_consultation→done · waiting→left · called→left.

### Consultation `verity.clinic.consultation`

| State | Category | Terminal | Meaning |
|---|---|---|---|
| `open` | Draft | no | Begun, narrative being written (initial) |
| `active` | Active | no | Doctor engaged with patient (vitals/exam in progress) |
| `completed` | Completed | no | Clinically finished (ADR-003 execution terminal) — prescriptions/lab orders may still ripple, billing tail runs; addenda still land |
| `closed` | Completed | **yes** | Administrative closure — INV-002 lock, record immutable forever |
| `cancelled` | Cancelled | **yes** | Patient left before examination began |

Transitions: open→active · open→cancelled · active→completed · completed→closed. Exactly ADR-003's split: `completed` stops nothing administratively but freezes the narrative (immutability is the capability's own rule, §6-M4); `closed` plays Closed.

### PrescriptionItem `verity.clinic.prescription_item`

| State | Category | Terminal | Meaning |
|---|---|---|---|
| `pending` | Pending | no | Awaiting dispensing (initial) |
| `partially_dispensed` | Active | no | Some quantity given, more owed |
| `dispensed` | Completed | no | Fully supplied (non-terminal: the prescription header aggregates; history keeps serving) |
| `cancelled` | Cancelled | **yes** | Removed before any dispense |

Transitions: pending→partially_dispensed · pending→dispensed · partially_dispensed→dispensed · pending→cancelled. The parent Prescription derives: all items terminal-or-dispensed ⇒ `fully_dispensed` (Completed, non-terminal); any item dispensed blocks whole-prescription cancel. No backwards edges; a wrongly dispensed item is a compensating stock movement plus an addendum, never an edit.

### LabOrder `verity.clinic.lab_order`

| State | Category | Terminal | Meaning |
|---|---|---|---|
| `ordered` | Pending | no | Placed, awaiting sample (initial) |
| `sampled` | Active | no | Sample in hand, work in lab — SLA clock running |
| `resulted` | Pending | no | Values entered, awaiting doctor validation |
| `validated` | Completed | **yes** | Signed off, released to patient record |
| `cancelled` | Cancelled | **yes** | Rejected sample / called off, reason recorded |

Transitions: ordered→sampled · ordered→cancelled · sampled→resulted · sampled→cancelled · resulted→validated · resulted→cancelled (validation rejects — e.g. garbled values — back to explicit re-entry via cancel+reorder; no silent rewind). Clock intent: runs in `sampled`, stops at `validated` (§10).

### Invoice `verity.clinic.invoice`

| State | Category | Terminal | Meaning |
|---|---|---|---|
| `open` | Active | no | Generated, accepting payments (initial) |
| `voided` | Cancelled | **yes** | Owner-only; precondition zero Payment rows |
| `settled` | Completed | **yes** | Paid in full — INV-002 lock |

Transitions: open→voided · open→settled. Part-payments are rows, not a state.

---

## 8. Command catalog

Every row: MET-ACT-001 zod input, MET-ACT-002 authorize, MET-ACT-003 preconditions, transactional mutation, MET-ACT-004 outbox events, Activity diff where fields change. Keys namespaced `verity.clinic.*`.

| Command key | Verb | Actor(s) | Key preconditions | Emits |
|---|---|---|---|---|
| `verity.clinic.register_patient` | Create | R O | — | `patient.registered` |
| `verity.clinic.update_patient` | Edit | R D O | patient not `deceased` | `patient.updated` + Activity diff |
| `verity.clinic.set_patient_state` | ActionExecute | O | valid target (inactive/deceased/reactivate) | `patient.state_changed` |
| `verity.clinic.book_appointment` | Create | R O | doctor Resource free for slot (`resource_is_free`); creates Appointment + Booking atomically | `appointment.booked` + `verity.scheduling.booked` |
| `verity.clinic.reschedule_appointment` | ActionExecute | R O | state `scheduled`; new slot free; releases old Booking, takes new | `appointment.rescheduled` |
| `verity.clinic.cancel_appointment` | ActionExecute | R O | state `scheduled`; releases Booking | `appointment.cancelled` |
| `verity.clinic.mark_no_show` | ActionExecute | R O | state `scheduled`, slot past grace | `appointment.no_show` |
| `verity.clinic.check_in` | ActionExecute | R O | appointment `scheduled` (or walk-in with patientId only); allocates daily token number; appointment→checked_in | `queue.token_issued` |
| `verity.clinic.call_next` | ActionExecute | R D O | ≥1 waiting token for doctor (or pool); picks priority-then-FIFO; token→called | `queue.token_called` |
| `verity.clinic.mark_token_left` | ActionExecute | R O | token not terminal | `queue.token_left` |
| `verity.clinic.begin_consultation` | ActionExecute | D O | token `called` (caller becomes doctorUserId); token→in_consultation; creates Consultation `open` | `consultation.begun` |
| `verity.clinic.complete_consultation` | ActionExecute | D O | state `active`; payload carries vitals/complaint/diagnosis/notes/follow-up; freezes narrative | `consultation.completed` |
| `verity.clinic.close_consultation` | ActionExecute | D O | state `completed` | `consultation.closed` |
| `verity.clinic.add_addendum` | Create | D O | consultation `completed` (pre-closure) | `consultation.addendum_added` |
| `verity.clinic.create_prescription` | Create | D O | consultation `active` or `completed`-not-closed; ≥1 item | `prescription.issued` |
| `verity.clinic.cancel_prescription` | ActionExecute | D O | zero items dispensed | `prescription.cancelled` |
| `verity.clinic.dispense_item` | ActionExecute | P O | item dispensable; stock sufficient across batches FEFO; writes StockMovements, increments `qtyDispensed`, advances item state | `prescription.item_dispensed` |
| `verity.clinic.substitute_drug` | Edit | P O | item untouched by dispense; substitutionNote required | `prescription.item_substituted` |
| `verity.clinic.create_drug` / `edit_drug` | Create / Edit | O | name unique per tenant | `drug.created` / `drug.updated` |
| `verity.clinic.receive_stock` | Create | P O | expiry future; batch unique per drug+batchNo | `stock.received` |
| `verity.clinic.adjust_stock` | ActionExecute | O | reason mandatory; compensating movement written | `stock.adjusted` |
| `verity.clinic.write_off_expired` | ActionExecute | O | batch expired, qty > 0 | `stock.written_off` |
| `verity.clinic.create_lab_test` / `edit_lab_test` | Create / Edit | O | — | `lab_test.created` / `lab_test.updated` |
| `verity.clinic.place_lab_order` | Create | D O, R O | ≥1 active test; snapshots descriptors | `lab.order_placed` |
| `verity.clinic.record_sample_collected` | ActionExecute | L O | state `ordered` | `lab.sample_collected` (clock starts) |
| `verity.clinic.enter_lab_results` | ActionExecute | L O | state `sampled`; fills values/flags per item | `lab.results_entered` |
| `verity.clinic.validate_lab_results` | ActionExecute | D O | state `resulted`; every item valued; stamps validator, stops clock | `lab.validated` |
| `verity.clinic.cancel_lab_order` | ActionExecute | D O | not `validated`; reason mandatory | `lab.order_cancelled` |
| `verity.clinic.generate_invoice` | Create | R O | ≥1 unbilled artifact in visit chain (or explicit pharmacy-sale mode); idempotent per source artifact | `invoice.generated` |
| `verity.clinic.add_payment` | ActionExecute | R O | invoice `open`; amount ≤ balance; settles at full | `invoice.payment_recorded` / `invoice.settled` |
| `verity.clinic.discount_invoice` | ActionExecute | O | invoice `open`, zero payments | `invoice.discounted` |
| `verity.clinic.void_invoice` | ActionExecute | O | zero Payment rows | `invoice.voided` |

Queries (read side, all tenant-scoped, Layer-2 scope via `ctx.scope()`, Layer-3 redaction automatic on top-level arrays): `search_patients`, `patient_timeline` (visits + prescriptions + labs + invoices + documents, unified), `today_schedule`, `doctor_calendar`, `queue_board`, `dispense_queue`, `stock_levels` (+ below-reorder filter), `expiry_watch`, `lab_worklist`, `lab_validation_queue`, `invoices_open`, `daily_collections`, `dashboard_counts`, plus the seven report queries of §14.

---

## 9. Events & audit

Every command writes its DomainEvents to the outbox inside the command transaction (rollback takes them along); Activity rows capture field diffs on edits. Events worth subscribing to downstream:

- `patient.registered` / `patient.state_changed`
- `appointment.booked` / `.rescheduled` / `.cancelled` / `.no_show`
- `queue.token_issued` / `.token_called`
- `consultation.begun` / `.completed` / `.closed` / `.addendum_added`
- `prescription.issued` / `.item_dispensed` / `.cancelled`
- `stock.received` / `.adjusted` / `.written_off` / `.low_stock` (emitted by dispense when a drug crosses its reorder level)
- `lab.order_placed` / `.sample_collected` / `.results_entered` / `.validated` / `.cancelled`
- `invoice.generated` / `.payment_recorded` / `.settled` / `.voided`

Nothing consumes these yet — no dispatcher exists. They are the contract future automation (SMS bridge, ABDM bridge) would subscribe to, and they cost nothing to emit now.

Audit posture: every mutation attributable and append-only. **Read access to clinical data is not audited** — the platform has no read-log primitive. Flagged §17-D10; if a deployment regime requires access logs, that is a foundation extension decided through the freeze's path, not something this capability fakes with queries writing Activity rows.

---

## 10. SLA application

Second real consumer of the SLA substrate. Policies seeded at install:

| Policy target | Intent | Calendar | Breach consequence |
|---|---|---|---|
| `verity.clinic.lab_order` | Start clock at `sample_collected` (category Active), stop at `validated` | Null calendar — wall-clock minutes; a sample does not stop decomposing because the lab closed | `urgencyFor()` badge escalates on `/lab` worklist; breach retained in history even after validation |
| `verity.clinic.queue_token` | Start at issue, stop at `called` | BusinessCalendar "Clinic hours" — waiting-time metrics only make sense inside operating hours | Waiting-time overrun surfaces on reception dashboard; no patient-visible promise implied |

Per-test turnaround overrides ride the order: `place_lab_order` seeds the clock budget from `lab_test.defaultTatMinutes` summed policy-side. Resumed clocks continue budgets; a late-validated order keeps its breach — existing substrate behaviour, no new code.

**Nothing invokes sweeps** — no scheduler provider is bound (§17-D2). Until then urgency badges compute on-read (`remainingMinutes` at query time), and true push escalation waits for the binding.

---

## 11. Notifications

Templates registered at install; substitution strictly literal `{name}`-style placeholders (an expression language would make a tenant template a stored program — existing rule). Delivery is InApp-only until §17-D4 binds a transport; for a clinic the eventual channel is overwhelmingly SMS, which is why D4 ranks higher here than in any other design.

| Template key | Trigger | Recipients | Body (literal placeholders) |
|---|---|---|---|
| `appointment_reminder` | Scheduled (needs D2) day before slot | Patient's phone via future transport | "{patientName}, reminder: appointment with {doctorName} on {date} at {time}." |
| `token_called` | `call_next` | Waiting-area board (primary), InApp secondary | "Now serving {number}: {patientName} — {doctorName}" |
| `lab_validated` | `validate_lab_results` | Patient (future transport), ordering doctor InApp | "Reports for {patientName} are ready at {clinicName}." |
| `prescription_ready` | First `dispense_item` on a prescription | InApp to counter | "Prescription for {patientName} is being filled." |
| `low_stock` | `stock.low_stock` event | Pharmacist, Owner InApp | "{drugName} at or below reorder level ({qtyUnits} {unitLabel})." |
| `day_close_reminder` | Scheduled (needs D2) end of hours | Receptionist, Owner | "Counter day-end pending: {openInvoices} open invoices." |

Suppressed notifications are recorded, never dropped silently (existing substrate guarantee) — a missed reminder must always be explainable.

---

## 12. Experience design

### 12.1 Shell strategy

Five operational surfaces run in the **worker shell** (`shells: ["worker"]` contributions, `(worker)` route group) — reception, consultation, pharmacy, lab, counter are task-scoped apps, not platform browsing. Manager pages live in the adaptive `(shell)` under `/clinic/…` via contributed navigation. The worker-shell chrome itself is still an open decision shared with the dine-in design — two clients now need it, which strengthens the case (§17-D5). Navigation is contributed by the capability; the shell holds no route map (existing contribution contract).

### 12.2 Page inventory — Reception surface (`/reception`)

| Page | Route | Purpose |
|---|---|---|
| R1 Today | `/reception` | Day sheet: upcoming appointments per doctor, live queue counts, quick actions (register, book, check in) |
| R2 Register patient | `/reception/register` | Duplicate-check-as-you-type on phone; demographics form; allergy capture prominent |
| R3 Book appointment | `/reception/book` | Week/day grid per doctor Resource; conflict rejection inline; reschedule/cancel/no-show from the slot |
| R4 Queue desk | `/reception/queue` | Check-in, call-next, mark-left; token issuance; priority flags |
| R5 Billing | `/reception/billing` | Open invoices, generate visit invoice, take payment, print receipt |
| R6 Queue board | `/reception/board` | Big-screen display mode: now-serving per doctor, solid high-contrast typography, auto-refresh |

### 12.3 Page inventory — Doctor surface (`/consult`)

| Page | Route | Purpose |
|---|---|---|
| D1 My queue | `/consult` | Called/waiting tokens for this doctor; begin consultation |
| D2 Consultation workspace | `/consult/[id]` | Patient banner with **permanent allergy warning**; history sidebar (timeline: past consultations, prescriptions, labs, documents); vitals capture; SOAP-layout narrative; follow-up date; complete |
| D3 Prescribe | inside D2 | Formulary search; dose text; item list; issue |
| D4 Lab orders | inside D2 + `/consult/labs` | Place orders mid-consult; validation inbox: review entered values, validate or reject |
| D5 Patient chart | `/consult/patients/[id]` | Full timeline view (diagnosis visible; money invisible — §5.3) |

### 12.4 Page inventory — Pharmacy surface (`/pharmacy`)

| Page | Route | Purpose |
|---|---|---|
| P1 Dispense queue | `/pharmacy` | Prescriptions pending/partial, per item quantities, FEFO handled server-side, substitutions with note |
| P2 Walk-in sale | `/pharmacy/sale` | OTC dispense + instant invoice + payment |
| P3 Stock | `/pharmacy/stock` | Levels per drug, batch drill-down, reorder alerts, expiry watch |
| P4 Receive | `/pharmacy/receive` | Goods inward: batch no, expiry, qty, MRP |
| P5 Sale history | `/pharmacy/sales` | Dispense ledger, walk-in sales, reprint invoices |

### 12.5 Page inventory — Laboratory surface (`/lab`)

| Page | Route | Purpose |
|---|---|---|
| L1 Worklist | `/lab` | Ordered → collect; sampled → enter; urgency badges from SLA remaining |
| L2 Result entry | `/lab/orders/[id]` | Per-parameter values, units, abnormal/critical flags; submit for validation |
| L3 Validation queue | `/lab/validation` | Doctor-facing: entered results to approve/reject |
| L4 Report | `/lab/orders/[id]/print` | Print-clean validated report (solid layout) |

### 12.6 Page inventory — Counter surface (`/counter`)

| Page | Route | Purpose |
|---|---|---|
| C1 Counter home | `/counter` | Open invoices, unsettled visits, today's collections |
| C2 Invoice detail | `/counter/invoices/[id]` | Line recap (snapshots), discount (owner), payments, part-pay, settle, print receipt |
| C3 Receipt print | `/counter/invoices/[id]/print` | Print stylesheet; dense financial text stays solid per ADR-011 |

### 12.7 Manager pages (platform shell, contributed navigation)

| Page | Route | Purpose |
|---|---|---|
| M1 Dashboard | `/clinic` | Census, revenue heads (Donut), lab TAT (StairFigure), alerts strip (low stock, expiring, unvalidated, open invoices) |
| M2 Patients | `/clinic/patients` | Directory + search; diagnosis redacted unless role permits (Layer 3 live) |
| M3 Formulary | `/clinic/drugs` | Drug catalogue CRUD, reorder levels |
| M4 Lab catalogue | `/clinic/tests` | Tests, prices, TAT defaults |
| M5 Staff & roles | `/clinic/staff` | Provisioning entry point; membership/role assignment UI is a known platform gap (§17-D9) |
| M6 Settings | `/clinic/settings` | Fees, slot length, tax parameters, queue behaviour (ConfigParameter) |
| M7 Reports | `/clinic/reports` | §14 catalogue |
| M8 Audit | `/audit` (platform) | Existing stream; every command lands here automatically |

### 12.8 Material & accessibility notes (ADR-011 applied, not recited)

- **Solid, always:** queue board (R6 — public screen, maximum legibility), consultation narrative and notes (long-form text), stock and invoice tables (dense data), lab result grids, destructive confirmations (void invoice, write-off), semantic status colouring (abnormal/critical flags use semantic colours, never accent).
- **Glass permitted where hierarchy earns it:** shell chrome, page headers, overlay panels (patient-search flyover over the consult pad, confirm dialogs), dashboard cards on the manager surface. Four-layer blur cap respected; nothing composited below AA — `pairFor()` decides text colour over accent, never white-by-default.
- Reduced-transparency honoured globally; light/dark parity from the shared material tokens.

### 12.9 Data freshness

Polling intervals until D1 resolves: reception and queue board 5 s; doctor queue, pharmacy, lab 10 s; counter and manager dashboards 15 s. Server components re-render on navigation regardless. No SSE/WebSocket until the realtime decision lands; no optimistic writes — islands apply server results only (E_CONFLICT re-read-and-retry on concurrent token/invoice edits).

---

## 13. Configuration & onboarding runbook

Ordered, each step using existing mechanisms:

1. **Provision** tenant (timeZone explicit) → Organization → Location → BusinessCalendar "Clinic hours" → accent choice.
2. **Activate** `verity.capability.clinic` (+ scheduling, evidence dependencies) via TenantActivation.
3. **Seed roles & permissions** — §5.2/§5.3 rows are migration-seeded metadata; verify matrix with a permission-diff script before step 4.
4. **Provision staff** — `provisionIdentity()` per member; assign memberships; create doctor Resources (party-backed) + weekly AvailabilityWindows; optional Asset-backed Resources for rooms/equipment.
5. **Catalogues** — drugs and lab tests via CSV import flowing through `create_drug`/`create_lab_test` commands (papaparse client-side, commands server-side — imports get authorization, validation, audit for free; no bulk-write bypass exists or is added).
6. **Fees & taxes** — ConfigParameter: consultation fees, slot minutes, tax rates/applicability.
7. **Opening stock** — `receive_stock` per batch; verify stock_levels reconciliation equals received totals.
8. **SLA policies & notification templates** — seeded by install migration; confirm per-test TAT overrides.
9. **Smoke checklist** — register→book→check-in→call→consult→prescribe→collect sample→enter→validate→generate invoice→pay→receipt prints; stock decremented FEFO; diagnosis invisible to a receptionist login; audit shows every step.
10. **Go-live** — pin activation version; hand devices to surfaces.

---

## 14. Reports catalogue

| Report | Grain | Source |
|---|---|---|
| Daily census & collections | Day | Tokens, consultations, payments |
| Revenue by head (consultation / pharmacy / lab) | Day/month | InvoiceLines grouped by `sourceEntityKey` |
| Prescription frequency (top drugs) | Month | PrescriptionItems joined Drugs |
| Lab turnaround distribution | Month | SlaClocks on lab orders (breach rate, p50/p90) |
| Appointment no-show & wait times | Week | Appointments (`no_show` rate), tokens (wait duration percentiles) |
| Stock valuation & expiry exposure | Snapshot | Batches (qty × MRP), buckets 0–30/31–90/90+ days |
| Tax summary | Month | Invoices' `taxBreakdown` roll-up |

All rendered from existing chart primitives; all exportable via browser print. No warehouse, no projection infrastructure — volumes at small-clinic scale are query-shaped, and inventing aggregation machinery now would violate the freeze.

---

## 15. Out of scope for v1 (each returns via the freeze's decision path when asked)

Patient portal/self-login (the D7 conversion), online booking, telemedicine, ABDM/ABHA integration, insurance/TPA claims, e-prescription interchange (FHIR/HL7), radiology/PACS, dental/ophthalmic charting, vaccine cold chain, supplier purchase orders, loyalty/CRM for patients, multi-branch operations (topology already supports it), payment gateways and POS hardware (GOV-SCO-006), structured vitals-observations table (JSON suffices until a trending requirement forces normalization), offline-mode device UI (substrate exists, §17-D8).

---

## 16. Foundation validation assessment

| Module | Carried by existing primitives without modification? |
|---|---|
| M1 Patient registry | YES — capability entity + Evidence/StoredFile |
| M2 Appointments | YES — Scheduling capability exercised end-to-end (Resources, windows, Bookings, conflict trigger) |
| M3 Queue | YES — capability entity + state machine + queries |
| M4 Consultation | YES — Work-instance pattern + INV-002-style closure + Activity audit |
| M5 Prescriptions | YES — entities + state machines + command pipeline |
| M6 Pharmacy | YES — append-only ledger pattern (proven by Event/Activity triggers) + CHECK constraints |
| M7 Laboratory | YES — two-step trust boundary expressed as permissions + states; Evidence for reports |
| M8 Billing | YES — snapshot lines, ConfigParameter-driven computation, integer money |
| M9 Reporting | YES — queries + chart primitives + workspace contributions |

Platform surfaces touched: none. Schema touched: additive capability section only. Registry touched: one line. Shell touched: none (contributions only). **This capability proves the freeze's central claim harder than the dine-in design did** — it consumes Scheduling, Evidence, FieldPermission and SLA together, all previously proven in isolation, with zero foundation edits. That is the "arbitrary future capabilities" clause of the foundation-ready definition demonstrating itself.

Honest limits: five decisions below block specific modules from being *built well* (not modelled), and three regulatory gaps belong to authorities nobody has written yet.

---

## 17. Open decisions register (classified; none solved silently)

| # | Decision | Classification | Blocking |
|---|---|---|---|
| D1 | Realtime posture: polling cadences vs SSE/WebSocket | Implementation decision | UX quality only |
| D2 | Scheduler provider binding — SLA sweeps, reminders, day-close jobs have no caller | Missing ADR (freeze names the deferral deliberate) | Push escalation, reminders |
| D3 | Storage driver binding — lab report PDFs, patient documents reserve but cannot store | Missing ADR (deliberate deferral) | Document attachment, report archival |
| D4 | Notification transport — SMS is the clinic's real channel; InApp-only ships mute | Missing ADR (deliberate deferral) | Reminders, ready-pings reach nobody off-device |
| D5 | Worker-shell chrome — five surfaces need it; shared with dine-in | Missing ADR | Operational surfaces' visual contract |
| D6 | Money representation ratification (integer minor units proposed) | Implementation decision | Build review |
| D7 | **Patient ↔ Party boundary.** v1 Patient is capability-owned; portal-era conversion touches ADR-007 verification, INV-003 global dedup, and whether identity provisioning gains a credential-less path | **Missing ADR — product owner** | Portal, cross-clinic identity, merge tooling |
| D8 | Offline queue wiring for unreliable connectivity | Implementation decision (device UX) | Rural-flaky deployments |
| D9 | Membership/staff administration UI gap (roles exist, screens don't) | Missing specification | Onboarding step 4 ergonomics |
| D10 | **Read-access auditing for clinical data.** Platform audits writes only; clinical regimes commonly require access logs | **Missing specification — possible foundation extension** | Compliance-sensitive deployments |
| D11 | Prescription legality registers (Schedule H/H1 bookkeeping, retention periods, who may sign) | **Missing specification** — corpus silent; do not improvise legal controls | Controlled-substance handling |
| D12 | Health-record retention & erasure (records never hard-delete; erasure-regime conflicts unresolved) | **Missing ADR** | Long-run compliance posture |
| D13 | Corrective edges vs cancel-and-reorder for lab rejections (this design: no backwards edges) | Implementation decision | Build review |
| D14 | Consent capture (signatures via Evidence once D3 binds) | Deferred feature | v2 |

D7, D10, D11, D12 are the four this design refuses to guess. They are surfaced, classified, and left to the owners the constitution names.

---

## 18. Proposed build sequence

Seven phases, each releasable, each zero platform edits, dependencies downward only:

1. **Skeleton** — capability directory, schema section + migration (all tables, RLS, metadata rows, SLA/notification seeds), registry line, `registerContribution()`, config parameters. Conformance tests: isolation fail-closed, command authorization, terminal locks.
2. **Patients** — M1 commands/queries, duplicate-check search, Evidence document attach (reserve-only until D3), patient chart read path with Layer-3 redaction test (receptionist response lacks diagnosis — the redaction proof).
3. **Appointments + queue** — doctor Resources/windows, booking orchestration, conflict rejection, check-in/call-next, board projection. First Scheduling-consumer tests.
4. **Consultation + prescriptions** — begin/complete/close, addenda, formulary, issuing, immutability tests (post-completion edit attempts fail; addendum appends).
5. **Pharmacy** — receiving, FEFO dispense, movements ledger reconciliation property (Σmovements = Σbatch deltas), low-stock emission, walk-in sale.
6. **Laboratory** — orders, collection, entry, validation, SLA clocks on-read, report print.
7. **Billing + reports + polish** — invoice sweep idempotency, payments/settlement, receipts, §14 reports, dashboard contributions, e2e Playwright pass over the §13 smoke checklist.

Phases 2–4 alone constitute a usable soft-launch (paper pharmacy/lab); nothing before phase 6 pretends to clinical completeness.

---

## 19. Traceability appendix

| Design element | Authority |
|---|---|
| Capability-not-pack framing | PLATFORM-FREEZE purpose-built principle; CLAUDE.md anti-drift |
| Clinic as legitimate composition | Bible V1 §129 |
| Patient as capability entity, not Party | ADR-001 (bare identity), ADR-007 (invitation+verification), `User.authUserId` NOT NULL (schema), §17-D7 |
| Staff identity via `provisionIdentity()` | Bible V2 Primitive 2 §2/§6, INV-003, PLA-IDE-001..004 |
| Doctor as party-backed Resource + AvailabilityWindow + Booking | ADR-008; `verity.capability.scheduling` |
| Consultation as Work instance; addenda not edits | Bible V2 WORK; ADR-003 Completed/Closed split; INV-002 analogue at capability level |
| QueueToken / PrescriptionItem naming | GOV-TER-001..017; ADR-006 (ChecklistItem untouched) |
| State machines & categories | ADR-009 (six categories, two terminals); StateDefinition/TransitionDefinition runtime |
| Command pipeline, events-in-transaction, hooks | Spec MET-ACT-001..004; PLA-EXT-004; `executeCommand` |
| Permission matrix, RoleComposition, Tenant-scope grants | PLA-AUT-001..003; `verity.resolve_permissions`; ADR-005 scope ladder |
| Diagnosis redaction via FieldPermission | Authorization Layer 3 (`redactFields`, omit-not-null) |
| Lab two-step trust boundary | Layer-1 verbs + state guard; PRN-001 (explainable) |
| Stock ledger append-only | EXE-AUD-003 append-only pattern; Evidence precedent |
| Snapshots on lines/results/invoices | Forward-looking masters, immutable history — dinein M3 principle, Evidence analogy |
| SLA on lab orders / queue tokens | SLA substrate (StateCategory-driven); EXE-SCH; §17-D2 caveat |
| Notifications literal-template, suppressed-recorded | Notification substrate rules |
| Record-and-print billing | GOV-SCO-006 |
| Integer paise money | Bible V6 DEC-002 precedent; §17-D6 ratification |
| Polling freshness; islands apply server results | Experience doctrine (no API routes, no client caches, E_CONFLICT retry) |
| Glass by material level; solid where dense/sensitive | ADR-011 six constraints |
| Worker-shell routing of operational surfaces | Bible V4 shell partition (worker shell); §17-D5 open chrome |
| Unused Approval capability | PLATFORM-FREEZE anti-speculation rule |
| Unused read auditing | Honest gap — §17-D10 |
