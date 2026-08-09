# Verity — Universal Operations Platform
## Product Requirements & Implementation Specification

---

## 1. Strategic Positioning

**What Verity is:**
> Verity is the universal operations platform for service and production businesses.
> From workforce and work orders to production, quality, inventory, clients, and compliance — Verity brings the entire operation into one system.

**Who it is for:**
Businesses that manage **people, work, assets, and physical operations** — regardless of whether they produce physical goods or deliver services.

**Why one platform wins:**
The underlying operational skeleton is identical across all these industries:

```
Security company:    Client → Site → Guards → Shifts → Attendance → Incident → Inspection → Invoice
Factory:             Customer → Order → Production → Workers → Materials → QC → Packing → Dispatch  
Facility Mgmt:       Client → Site → Staff → Shift → Work Order → Inspection → SLA → Invoice
IT Services:         Client → Project → Team → Ticket → SLA → Approval → Invoice
```

The nouns change. The system doesn't.

**Initial beachhead (build first, sell first):**

| Priority | Services | Priority | Production |
|---|---|---|---|
| 1 | Facility Management | 1 | Auto Components |
| 2 | Security Services | 2 | Garments & Textiles |
| 3 | Staffing & Manpower | 3 | Furniture Manufacturing |
| 4 | Housekeeping & Cleaning | 4 | Engineering / Fabrication |
| 5 | Maintenance & AMC | 5 | Packaging |

---

## 2. Verity Core — The Canonical Data Model

This is the complete set of concepts every industry operates on. Every module below is built on top of this core.

```
VERITY CORE
├── Organizations          (multi-tenant root — exists)
├── Users & Roles          (exists — SystemRole + custom Role)
├── Clients / Customers    (exists — Customer model)
├── Sites / Locations      (MISSING — see gap analysis)
├── Workforce              (exists — User + EmployeeProfile + AttendanceLog + Shift)
├── Assets                 (MISSING as dedicated model — Warehouse/Bin exist for stock only)
├── Tasks / Work Orders    (exists for production — WorkOrder + JobCard; MISSING for services — Ticket/Task)
├── Orders                 (exists — SalesOrder + SalesOrderItem)
├── Inventory              (exists — ItemMaster + Warehouse + BinBalance + StockLedgerEntry)
├── Quality                (exists — ChecklistTemplate + Inspection + QualityApproval)
├── Documents              (partial — FactoryDocument exists; no general doc workflow)
├── Approvals              (partial — Approval model exists but not wired broadly)
├── Attendance             (exists — AttendanceLog + Shift)
├── Scheduling             (MISSING — no shift scheduling / calendar per site)
├── Notifications          (exists — Notification model)
├── Reports & Analytics    (partial — reports page exists; no analytics engine)
└── Billing / Payroll inputs (MISSING — no invoice generation or payroll export)
```

---

## 3. Gap Analysis — What Exists vs. What's Needed

### 3.1 Fully Built (✅ Production-ready)

| Concept | Models | Module |
|---|---|---|
| Multi-tenancy | `Organization`, `Factory`, `ModuleEntitlement`, `Role`, `RolePermission` | `core` |
| Users & Auth | `User`, `EmployeeProfile`, `LeaveApplication` | `core`, `hr` |
| Workforce attendance | `AttendanceLog`, `Shift` | `hr` |
| Clients | `Customer`, `Deal`, `SupportSession` | `sales`, `crm` |
| Orders | `SalesOrder`, `SalesOrderItem` | `sales` |
| Production | `ProductionPlan`, `WorkOrder`, `JobCard`, `StageEntry`, `Department` | `manufacturing` |
| Inventory | `ItemMaster`, `ItemGroup`, `Warehouse`, `WarehouseBin`, `BinBalance`, `StockLedgerEntry` | `inventory` |
| Quality | `ChecklistTemplate`, `Checkpoint`, `Inspection`, `CheckpointSubmission`, `QualityApproval`, `QualityReport` | `quality` |
| Procurement | `PurchaseRequest`, `PurchaseOrder`, `PurchaseOrderItem`, `PurchaseReceipt`, `Supplier` | `procurement` |
| Dispatch | `Dispatch` | `sales` |
| Agreements | `Agreement` | `core` |
| Notifications | `Notification` | `core` |
| Attachments | `Attachment`, `ImageEvidence` | `core` |
| Audit | `AuditLog`, `TimelineEvent` | `core` |

### 3.2 Registry-declared but not yet implemented (⚠️ Shell only)

| Module | What's missing |
|---|---|
| `helpdesk` | `Ticket`, `TicketComment` models + all UI + server actions |
| `projects` | `Project`, `Task`, `TimesheetEntry` models + all UI + server actions |
| `assets` | `Asset`, `AssetMaintenanceLog`, `AssetMaintenanceSchedule` models + all UI + server actions |
| `crm` | `Deal` model exists; pipeline UI and deal management actions needed |
| `finance` | No models exist; chart of accounts, journal entries, fiscal periods all missing |

### 3.3 Not in registry, completely missing (❌ New work)

| Concept | Why it's needed | Proposed module |
|---|---|---|
| **Sites / Locations** | Service businesses deploy staff to client sites. Factory has `Warehouse` for stock locations but no concept of a "client site" where work happens. | `sites` (new) |
| **Shift scheduling** | Current `Shift` model is just a definition (name, start time, end time). There is no schedule — no record of "Guard X is assigned to Site Y on Monday 6am shift." | `scheduling` (new) |
| **Billing / Payroll inputs** | No invoice generation, no payroll export, no timesheet-to-billing bridge. | `billing` (new) |

---

## 4. Module Expansion — Full Specification

### 4.1 Module: `sites` (NEW — Sites & Locations)

**Purpose:** A `Site` is a physical location belonging to a client where operational work happens. For a security company it's the guarded premises. For facility management it's the building. For construction it's the project site. It is the key linking concept between a `Customer` and the `User`/`Asset`/`WorkOrder` assigned there.

**Why it's different from `Warehouse`:** Warehouses are for stock. Sites are for work. A site has a client, staff deployed there, work orders assigned to it, SLAs, and inspection records. These are conceptually unrelated to inventory bins.

#### Schema additions

```prisma
model Site {
  id          String   @id @default(cuid())
  factoryId   String
  factory     Factory  @relation(fields: [factoryId], references: [id])

  name        String           // "DLF Tower - Block A", "Phase 2 Construction Site"
  siteCode    String           // e.g. "SITE-0042"
  address     String?
  city        String?
  state       String?

  customerId  String?          // which client this site belongs to
  customer    Customer? @relation(fields: [customerId], references: [id])

  status      SiteStatus @default(ACTIVE)

  managerUserId String?        // Verity user responsible for this site
  managerUser   User? @relation("SiteManager", fields: [managerUserId], references: [id])

  contractStart DateTime?
  contractEnd   DateTime?
  slaHours      Int?           // SLA response window in hours
  notes         String?

  deployments   SiteDeployment[]   // which staff are posted here
  workOrders    ServiceWorkOrder[] // service work orders at this site
  inspections   Inspection[]       // existing quality inspections, now site-linkable

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model SiteDeployment {
  id          String    @id @default(cuid())
  factoryId   String
  siteId      String
  site        Site      @relation(fields: [siteId], references: [id], onDelete: Cascade)
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  role        String?   // "Guard", "Supervisor", "Technician", "Housekeeper"
  startDate   DateTime
  endDate     DateTime? // null = currently deployed
  shiftId     String?
  shift       Shift?    @relation(fields: [shiftId], references: [id])
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
}

enum SiteStatus {
  ACTIVE
  ON_HOLD
  TERMINATED
}
```

**Migration note:** Add `siteId` as an optional foreign key on `Ticket` (helpdesk module), `ServiceWorkOrder` (see below), and `Inspection`. Do not make it required — existing data has no site.

**Registry entry:**
```ts
{
  key: "sites",
  name: "Sites & Locations",
  description: "Client sites, workforce deployment and site-level SLAs. Essential for service businesses.",
  requires: ["core"],
  permissions: [
    { key: "site.view", label: "View sites", group: "Sites" },
    { key: "site.manage", label: "Manage sites", group: "Sites" },
    { key: "site.deploy", label: "Deploy staff to sites", group: "Sites" },
  ],
}
```

**Pages:**
- `/owner/sites` — list of all sites with client name, active staff count, open work orders, SLA status
- `/owner/sites/[id]` — site detail: deployed staff, active work orders, inspection history, contract details

**DEFAULT_GRANTS additions:**
- OWNER, CO_OWNER, MANAGER: all three permissions
- SUPERVISOR: `site.view`, `site.deploy`

---

### 4.2 Module: `helpdesk` (Tickets & Service Work Orders)

> Full schema, actions, and UI in the companion document `verity_service_modules_spec.md`.

**Key additions not in the previous spec:**

Add `siteId` (optional FK to `Site`) on `Ticket`:
```prisma
siteId     String?
site       Site? @relation(fields: [siteId], references: [id])
```

Add a `ServiceWorkOrder` model as a generalised "work order" for service businesses — distinct from `WorkOrder` (which is production-only and requires a `ProductionPlan`):

```prisma
model ServiceWorkOrder {
  id              String    @id @default(cuid())
  factoryId       String
  factory         Factory   @relation(fields: [factoryId], references: [id])

  woNumber        String    // e.g. "SWO-00019"
  title           String
  description     String?
  category        String?   // "Corrective", "Preventive", "Inspection", "Installation"

  customerId      String?
  customer        Customer? @relation(fields: [customerId], references: [id])

  siteId          String?
  site            Site?     @relation(fields: [siteId], references: [id])

  assignedToId    String?
  assignedTo      User?     @relation(fields: [assignedToId], references: [id])

  status          ServiceWOStatus @default(OPEN)
  priority        TicketPriority  @default(MEDIUM)

  scheduledAt     DateTime?
  startedAt       DateTime?
  completedAt     DateTime?

  slaDueAt        DateTime?

  ticketId        String?           // optionally linked to the originating ticket
  ticket          Ticket? @relation(fields: [ticketId], references: [id])

  checklistId     String?           // run a ChecklistTemplate against this WO
  checklist       ChecklistTemplate? @relation(fields: [checklistId], references: [id])

  attachments     Attachment[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum ServiceWOStatus {
  OPEN
  ASSIGNED
  IN_PROGRESS
  PENDING_PARTS
  COMPLETED
  CANCELLED
}
```

This `ServiceWorkOrder` is what Maintenance/AMC, Facility Management, and Housekeeping use instead of the production `WorkOrder`.

---

### 4.3 Module: `projects` (Engagements, Tasks, Timesheets)

> Full schema, actions, and UI in the companion document `verity_service_modules_spec.md`.

**Key addition:** Add `siteId` (optional) on `Project`:
```prisma
siteId   String?
site     Site? @relation(fields: [siteId], references: [id])
```

This allows a construction or engineering project to be tied to a physical site.

---

### 4.4 Module: `assets` (Asset Register & Maintenance)

> Full schema, actions, and UI in the companion document `verity_service_modules_spec.md`.

**Key addition:** Add `siteId` (optional) on `Asset` — where the asset is physically deployed:
```prisma
siteId   String?
site     Site? @relation(fields: [siteId], references: [id])
```

This links a generator, HVAC unit, or fleet vehicle to the site it serves.

---

### 4.5 Module: `scheduling` (NEW — Shift Scheduling)

**Purpose:** The current `Shift` model is just a template (name, start time, end time). There is no calendar — no way to say "on Monday 4 Jan, Guard Ramesh is on the morning shift at Site X." This module adds a `ShiftSchedule` (who, where, when) and `ShiftSwap` (request/approval) on top of the existing `Shift` definitions.

#### Schema additions

```prisma
model ShiftSchedule {
  id          String    @id @default(cuid())
  factoryId   String
  factory     Factory   @relation(fields: [factoryId], references: [id])

  userId      String
  user        User      @relation(fields: [userId], references: [id])

  shiftId     String
  shift       Shift     @relation(fields: [shiftId], references: [id])

  siteId      String?           // where this person is scheduled (service businesses)
  site        Site?     @relation(fields: [siteId], references: [id])

  date        DateTime          // the specific calendar date (date portion only)
  status      ScheduleStatus @default(SCHEDULED)

  notes       String?
  createdAt   DateTime @default(now())
}

model ShiftSwap {
  id              String    @id @default(cuid())
  factoryId       String
  scheduleId      String               // the schedule entry being swapped
  schedule        ShiftSchedule @relation(fields: [scheduleId], references: [id])
  requestedById   String
  requestedBy     User      @relation("SwapRequester", fields: [requestedById], references: [id])
  swapWithId      String?              // proposed replacement user
  swapWith        User?     @relation("SwapRecipient", fields: [swapWithId], references: [id])
  reason          String?
  status          SwapStatus @default(PENDING)
  resolvedAt      DateTime?
  createdAt       DateTime @default(now())
}

enum ScheduleStatus {
  SCHEDULED
  ATTENDED
  ABSENT
  SWAPPED
  CANCELLED
}

enum SwapStatus {
  PENDING
  APPROVED
  REJECTED
}
```

**Registry entry:**
```ts
{
  key: "scheduling",
  name: "Shift Scheduling",
  description: "Calendar-based shift assignment per user and site, with swap requests.",
  requires: ["core", "hr"],
  permissions: [
    { key: "schedule.view", label: "View schedules", group: "Scheduling" },
    { key: "schedule.manage", label: "Publish schedules", group: "Scheduling" },
    { key: "schedule.swap", label: "Request shift swaps", group: "Scheduling" },
  ],
}
```

**Pages:**
- `/owner/scheduling` — weekly/monthly calendar grid showing staff × shift × site assignments
- Drag-and-drop or form-based scheduling interface
- Swap request queue (manager view)
- "My Schedule" view (worker-facing)

**ModuleKey type addition:** Add `"sites"` and `"scheduling"` and `"billing"` to the `ModuleKey` union in `registry.ts`.

---

### 4.6 Module: `billing` (NEW — Billing & Payroll Inputs)

**Purpose:** Closes the loop from operations to money. A service delivery generates a `ServiceInvoice` to the client. Timesheets + attendance generate `PayrollInput` records exported to payroll. This is not a full accounting system — it's the bridge between operational data and financial outputs.

#### Schema additions

```prisma
model ServiceInvoice {
  id            String    @id @default(cuid())
  factoryId     String
  factory       Factory   @relation(fields: [factoryId], references: [id])

  invoiceNumber String                  // e.g. "INV-2025-00041"
  customerId    String
  customer      Customer  @relation(fields: [customerId], references: [id])

  siteId        String?
  site          Site?     @relation(fields: [siteId], references: [id])

  status        InvoiceStatus @default(DRAFT)

  issueDate     DateTime  @default(now())
  dueDate       DateTime?

  lineItems     InvoiceLineItem[]

  subtotal      Float     @default(0)
  taxAmount     Float     @default(0)
  total         Float     @default(0)

  notes         String?
  paidAt        DateTime?

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model InvoiceLineItem {
  id          String   @id @default(cuid())
  invoiceId   String
  invoice     ServiceInvoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  description String
  quantity    Float
  unitPrice   Float
  amount      Float
  taxRate     Float    @default(0)
}

model PayrollInput {
  id          String   @id @default(cuid())
  factoryId   String
  factory     Factory  @relation(fields: [factoryId], references: [id])

  userId      String
  user        User     @relation(fields: [userId], references: [id])

  periodStart DateTime
  periodEnd   DateTime

  presentDays   Int   @default(0)
  absentDays    Int   @default(0)
  overtimeHours Float @default(0)
  leaveDays     Int   @default(0)

  totalHours    Float @default(0)   // from TimesheetEntry if projects module on
  status        PayrollStatus @default(DRAFT)

  exportedAt  DateTime?             // when exported to payroll system
  notes       String?

  createdAt   DateTime @default(now())
}

enum InvoiceStatus {
  DRAFT
  SENT
  PAID
  OVERDUE
  CANCELLED
}

enum PayrollStatus {
  DRAFT
  FINALISED
  EXPORTED
}
```

**Registry entry:**
```ts
{
  key: "billing",
  name: "Billing & Payroll",
  description: "Service invoices to clients, and payroll input summaries from attendance and timesheets.",
  requires: ["core", "sales"],
  permissions: [
    { key: "invoice.view", label: "View invoices", group: "Billing" },
    { key: "invoice.manage", label: "Create and send invoices", group: "Billing" },
    { key: "payroll.view", label: "View payroll inputs", group: "Billing" },
    { key: "payroll.export", label: "Export payroll", group: "Billing" },
  ],
}
```

**Pages:**
- `/owner/billing` — tabs: Invoices | Payroll Inputs
- Invoice list with status filters, "New Invoice" button
- Invoice detail: line items editor, status control, PDF preview/download
- Payroll input summary: period selector, attendance summary per employee, export to CSV

---

## 5. Updated `ModuleKey` Type

In `src/platform/modules/registry.ts`, add to the union:

```ts
export type ModuleKey =
  | "core"
  | "inventory"
  | "manufacturing"
  | "quality"
  | "procurement"
  | "sales"
  | "crm"
  | "hr"
  | "finance"
  | "projects"
  | "assets"
  | "helpdesk"
  | "sites"          // NEW
  | "scheduling"     // NEW
  | "billing"        // NEW
  | "automotive";
```

---

## 6. Industry Operating Packs

Add to `src/platform/tenancy/provision.ts` as a constant. No new DB model needed — this is just a named bundle used at provisioning time.

```ts
export const VERTICAL_PACKS: Record<string, { label: string; modules: ModuleKey[] }> = {
  // ─── Service verticals ───────────────────────────────────────
  facility_management: {
    label: "Facility Management",
    modules: ["core", "hr", "sites", "scheduling", "helpdesk", "assets", "quality", "procurement", "billing"],
  },
  security_services: {
    label: "Security Services",
    modules: ["core", "hr", "sites", "scheduling", "helpdesk", "billing"],
  },
  staffing_manpower: {
    label: "Staffing & Manpower",
    modules: ["core", "hr", "sites", "scheduling", "crm", "sales", "billing"],
  },
  housekeeping_cleaning: {
    label: "Housekeeping & Cleaning",
    modules: ["core", "hr", "sites", "scheduling", "quality", "helpdesk", "procurement", "billing"],
  },
  maintenance_amc: {
    label: "Maintenance & AMC",
    modules: ["core", "hr", "sites", "helpdesk", "assets", "procurement", "quality", "billing"],
  },
  logistics_fleet: {
    label: "Logistics & Fleet",
    modules: ["core", "hr", "sites", "assets", "sales", "billing"],
  },
  it_services_msp: {
    label: "IT Services / MSP",
    modules: ["core", "hr", "helpdesk", "projects", "crm", "billing"],
  },
  engineering_services: {
    label: "Engineering Services",
    modules: ["core", "hr", "sites", "projects", "assets", "procurement", "quality", "billing"],
  },
  construction: {
    label: "Construction Services",
    modules: ["core", "hr", "sites", "projects", "procurement", "inventory", "quality", "billing"],
  },
  professional_services: {
    label: "Professional Services",
    modules: ["core", "hr", "projects", "crm", "sales", "billing"],
  },
  digital_creative: {
    label: "Digital / Creative Agency",
    modules: ["core", "hr", "projects", "crm", "sales", "billing"],
  },
  events_hospitality: {
    label: "Events & Hospitality",
    modules: ["core", "hr", "sites", "projects", "quality", "procurement", "billing"],
  },

  // ─── Production verticals ─────────────────────────────────────
  auto_components: {
    label: "Auto Components",
    modules: ["core", "hr", "inventory", "manufacturing", "quality", "procurement", "sales", "automotive"],
  },
  garments_textiles: {
    label: "Garments & Textiles",
    modules: ["core", "hr", "inventory", "manufacturing", "quality", "procurement", "sales"],
  },
  furniture_manufacturing: {
    label: "Furniture Manufacturing",
    modules: ["core", "hr", "inventory", "manufacturing", "quality", "procurement", "sales"],
  },
  engineering_fabrication: {
    label: "Engineering / Fabrication",
    modules: ["core", "hr", "inventory", "manufacturing", "quality", "procurement", "sales", "assets"],
  },
  packaging: {
    label: "Packaging",
    modules: ["core", "hr", "inventory", "manufacturing", "quality", "procurement", "sales"],
  },
  electronics: {
    label: "Electronics / Electrical",
    modules: ["core", "hr", "inventory", "manufacturing", "quality", "procurement", "sales"],
  },
  food_beverage: {
    label: "Food & Beverage",
    modules: ["core", "hr", "inventory", "manufacturing", "quality", "procurement", "sales"],
  },
  jewellery: {
    label: "Jewellery Manufacturing",
    modules: ["core", "hr", "inventory", "manufacturing", "quality", "procurement", "sales"],
  },
  footwear_leather: {
    label: "Footwear & Leather",
    modules: ["core", "hr", "inventory", "manufacturing", "quality", "procurement", "sales"],
  },
  printing: {
    label: "Printing & Packaging",
    modules: ["core", "hr", "inventory", "manufacturing", "quality", "procurement", "sales"],
  },
};
```

Usage at provisioning: `provisionTenant({ modules: VERTICAL_PACKS["facility_management"].modules })`.
The `withDependencies()` resolver in `registry.ts` handles transitive requirements automatically.

---

## 7. Navigation Architecture

The sidebar in `owner-shell.tsx` must evolve. Currently it has fixed nav groups hardcoded. It should be driven by which modules the tenant has enabled so service tenants don't see "Production" and factory tenants don't see "Helpdesk."

### Target architecture

Replace the static `navGroups` array with a **module-keyed nav definition**:

```ts
// Each item declares which module must be enabled for it to show
type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
  permission: Permission;
  requiredModule?: ModuleKey;  // ADD THIS FIELD
};
```

The `OwnerShell` component receives an `enabledModules: ModuleKey[]` prop (fetched server-side in `owner/layout.tsx` from `ModuleEntitlement`). Nav items are filtered by `!item.requiredModule || enabledModules.includes(item.requiredModule)`.

### Full nav item list with module requirements

**Overview group:**
- Dashboard — no module requirement

**Service Operations group** (visible when any service module is on):
- Helpdesk → `requiredModule: "helpdesk"`
- Service Work Orders → `requiredModule: "helpdesk"`
- Projects → `requiredModule: "projects"`
- Sites → `requiredModule: "sites"`
- Scheduling → `requiredModule: "scheduling"`

**Production Operations group** (visible when manufacturing is on):
- Order Taking → `requiredModule: "sales"`
- Production → `requiredModule: "manufacturing"`
- Floor → `requiredModule: "manufacturing"`
- Logistics → `requiredModule: "sales"`

**Shared Operations group:**
- Inventory → `requiredModule: "inventory"`
- Purchase → `requiredModule: "procurement"`
- Assets → `requiredModule: "assets"`
- Quality → `requiredModule: "quality"`

**Finance group:**
- Billing → `requiredModule: "billing"`
- Reports → no requirement

**Top bar items (always shown):**
- Master Data, Customers, Team, Departments, Settings — no module requirement

---

## 8. Tenant Onboarding — Vertical Pack Selection

When a new tenant is created (via the HQ onboarding flow or the agreement/signup page), the provisioning step should present the vertical pack selector:

**UX flow:**
1. Enter org name, slug, logo
2. Select **"What type of business are you?"** — dropdown or card selector showing the 24 vertical pack labels
3. Optionally show which modules are included in the chosen pack (expandable detail)
4. Allow advanced customization (toggle individual modules on/off)
5. Confirm → call `provisionTenant({ modules: VERTICAL_PACKS[selected].modules })`

**HQ admin can change modules post-provisioning** via `hq.ts` → `updateTenantModules(orgId, moduleKeys[])`. This should upsert `ModuleEntitlement` rows and NOT delete any data from modules being disabled (only hide the UI).

---

## 9. Implementation Order

Build in strict dependency order. Each phase is independently deployable and testable.

### Phase 1 — Schema foundation (no UI, just migrations)
1. Add `Site` + `SiteDeployment` models
2. Add `ServiceWorkOrder` model (with optional `siteId`, `ticketId`)
3. Add `Ticket` + `TicketComment` models
4. Add `Project` + `Task` + `TimesheetEntry` models
5. Add `Asset` + `AssetMaintenanceLog` + `AssetMaintenanceSchedule` models
6. Add `ShiftSchedule` + `ShiftSwap` models
7. Add `ServiceInvoice` + `InvoiceLineItem` + `PayrollInput` models
8. Add all new enums: `TicketStatus`, `TicketPriority`, `ProjectStatus`, `TaskStatus`, `AssetStatus`, `SiteStatus`, `ScheduleStatus`, `SwapStatus`, `InvoiceStatus`, `PayrollStatus`
9. Add optional `siteId` FK to `Ticket`, `Project`, `Asset`, `Inspection`
10. Run `prisma db push` — verify no existing data is lost
11. Run `npm run test` — all 217 tests must still pass

### Phase 2 — Registry & provisioning updates (no UI)
1. Add `"sites"`, `"scheduling"`, `"billing"` to `ModuleKey` union in `registry.ts`
2. Add module definitions for all three in the `MODULES` array
3. Add `VERTICAL_PACKS` constant to `provision.ts`
4. Update `DEFAULT_GRANTS` in `provision.ts` for all new permission keys
5. Add `requiredModule` field to `NavItem` type in `owner-shell.tsx`
6. Wire `enabledModules` prop through `owner/layout.tsx` → `OwnerShell`
7. Filter nav items by enabled modules in `OwnerShell` render

### Phase 3 — Helpdesk module (highest service-sector priority)
1. `src/server/actions/helpdesk.ts` — all actions
2. `/owner/helpdesk/page.tsx` + `HelpdeskClient.tsx`
3. `/owner/helpdesk/[id]/page.tsx` + `TicketDetailClient.tsx`
4. Add to nav

### Phase 4 — Sites module
1. `src/server/actions/sites.ts` — all actions
2. `/owner/sites/page.tsx` + `SitesClient.tsx`
3. `/owner/sites/[id]/page.tsx` + `SiteDetailClient.tsx`
4. Add `siteId` selector to Ticket creation form
5. Add to nav

### Phase 5 — Projects module
1. `src/server/actions/projects.ts` — all actions
2. `/owner/projects/page.tsx` + `ProjectsClient.tsx`
3. `/owner/projects/[id]/page.tsx` + `ProjectDetailClient.tsx` (3-tab layout)
4. Add to nav

### Phase 6 — Assets module
1. `src/server/actions/assets.ts` — all actions
2. `/owner/assets/page.tsx` + `AssetsClient.tsx`
3. `/owner/assets/[id]/page.tsx` + `AssetDetailClient.tsx`
4. Add to nav

### Phase 7 — Scheduling module
1. `src/server/actions/scheduling.ts`
2. `/owner/scheduling/page.tsx` + `SchedulingClient.tsx` (calendar UI)
3. Add to nav

### Phase 8 — Billing module
1. `src/server/actions/billing.ts`
2. `/owner/billing/page.tsx` + `BillingClient.tsx` (tabbed: Invoices | Payroll)
3. PDF invoice generation (use a simple HTML-to-PDF approach, no heavy library)
4. Add to nav

### Phase 9 — Onboarding vertical pack selector
1. Add pack selector to the tenant provisioning / onboarding UI
2. HQ admin module toggle UI

---

## 10. Coding Conventions Reference

> Must follow exactly — these are not suggestions.

### Every page.tsx (server component)
```ts
import { guardModulePage } from "@/platform/modules/guard";
await guardModulePage("helpdesk");  // replace with module key
const user = await getOwnerUser();
if (!user) redirect("/");
```

### Every server action
```ts
"use server";
import { guardModuleAction } from "@/platform/modules/guard";
export async function myAction(input: ...) {
  await guardModuleAction("helpdesk");  // replace with module key
  // ALL queries scoped to user.factoryId
}
```

### Tenancy rule — never violate this
Every single DB query includes a tenant scope:
```ts
prisma.ticket.findMany({ where: { factoryId: user.factoryId } })
```

### Styling rules (from AGENTS.md)
- Text: `text-text-primary`, `text-text-secondary`, `text-text-tertiary`
- No hardcoded darks inside cards
- Inner scrolling: `overflow-y-auto h-[520px]` — outer page must not scroll
- Active pills: `bg-[var(--brand)] text-white`
- Twin columns: `items-stretch`

### Auto-numbering pattern
Consistent across all new entities:
```ts
const count = await prisma.ticket.count({ where: { factoryId } });
const ticketNumber = `TKT-${String(count + 1).padStart(5, "0")}`;
```

---

## 11. Acceptance Criteria

### Module isolation
- [ ] Tenant without `helpdesk` → `/owner/helpdesk` redirects to `/owner/dashboard`
- [ ] Tenant without `projects` → `/owner/projects` redirects to `/owner/dashboard`
- [ ] Tenant without `sites` → `/owner/sites` redirects to `/owner/dashboard`
- [ ] Nav items for disabled modules are not rendered at all

### Data isolation
- [ ] Tenant A cannot read, write, or enumerate Tenant B's tickets, projects, sites, or assets
- [ ] All queries verified to include `factoryId` filter

### Vertical packs
- [ ] Provisioning a `facility_management` pack creates correct entitlements
- [ ] Provisioning a `garments_textiles` pack does NOT entitle `helpdesk` or `projects`
- [ ] A factory tenant sees "Production" nav group; a security company tenant sees "Helpdesk" nav group

### Build & tests
- [ ] `npm run build` exits 0 (TypeScript strict, no errors)
- [ ] `npm run test` — all 217 existing tests pass (new actions may add more)
- [ ] No page-level console errors for any module combination
