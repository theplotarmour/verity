# 04 Optional Modules And Expansion

## 1. Module Marketplace Product Requirement

ERPClaw's foundation is one install. Industry and advanced vertical capabilities are discovered from a signed module registry and installed on demand with user approval. In Verity terms, modules should become explicit capability packs with dependency metadata, activation state, schema migrations, actions, UI metadata, tests, and trust provenance.

## 2. Module Registry Page

Route: `/erpclaw/modules`

Sections:

- Installed modules.
- Available modules.
- Search and filters.
- Module detail drawer.
- Dependency graph.
- Version and update status.
- Actions provided.
- Files/hash provenance.
- Install/remove/update history.
- Trust-root verification.

List columns:

- Display name.
- Module key.
- Category.
- Version.
- Action count.
- Status.
- Required modules.
- Tags.
- GitHub source.
- Last installed/updated.

Detail sections:

- Summary and business scope.
- Functional domains.
- Required dependencies.
- Optional dependencies.
- Tables/migrations.
- Actions.
- UI pages.
- Tests.
- Files and hashes.
- License.
- Install/update/remove controls.

## 3. Module Lifecycle

### 3.1 Discover

The user can search by industry or business phrase. The product maps phrases such as "clinic", "school", "hotel", "legal practice", "construction", "retail", or "manufacturing" to matching modules.

Acceptance:

- Discovery is read-only.
- Search results show whether dependencies are already installed.
- The product must not install a module without explicit approval.

### 3.2 Install

Installation sparse-checks out approved module files, validates hashes/signature, applies migrations, rebuilds action cache, and registers UI metadata.

Acceptance:

- Dependency order is enforced.
- Hash mismatch stops install before file replacement.
- Failed schema migration leaves a recoverable state with migration ledger evidence.

### 3.3 Update

Updates compare installed file hashes with registry manifest, fetch changed files, apply migrations, and rebuild caches.

Acceptance:

- Update preview lists files and migrations.
- Update is confirmation-gated.
- Previous files are preserved for the rollback window where supported.

### 3.4 Remove

Removal disables module availability and hides UI/actions where safe. Data-retaining removal is preferred over destructive table drops.

Acceptance:

- Removal requires confirmation.
- Historical data remains readable unless an explicit archival/destructive plan is approved.

## 4. Registry-Derived Vertical Modules

The source registry includes 46 modules. The PRD requires the module page and onboarding system to represent at least these families:

| Module | Category | Product scope |
|---|---|---|
| AgricultureClaw | vertical | Farms, fields, crops, livestock, equipment, harvest tracking, agricultural accounting |
| AutomotiveClaw | vertical | Vehicle inventory, dealership sales, service orders, parts, warranty, customers |
| ConstructClaw | vertical | Projects, contracts, budgets, cost tracking, subcontractors, RFIs, submittals, change orders, safety |
| EduClaw | vertical | Students, academics, grading, attendance, staff, fees, enrollment, communications |
| EduClaw Financial Aid | sub-vertical | FAFSA, aid packages, scholarships, grants, work-study, SAP, Title IV |
| EduClaw Higher Education | sub-vertical | Degree programs, credit hours, advising, research grants, faculty workload, accreditation |
| EduClaw K-12 | sub-vertical | Grade levels, sections, behavior, parent communication, school calendar, IDEA/COPPA |
| EduClaw LMS | sub-vertical | Online courses, assignments, quizzes, gradebook, discussions, LMS sync |
| HealthClaw | vertical | Patients, providers, appointments, clinical notes, prescriptions, lab orders, billing, claims, insurance, HIPAA |
| HealthClaw Dental | sub-vertical | Dental charts, treatment plans, procedures, CDT billing |
| HealthClaw Home Health | sub-vertical | Home visits, care plans, aide scheduling, remote patient monitoring |
| HealthClaw Mental Health | sub-vertical | Therapy sessions, treatment plans, assessments, progress tracking, HIPAA |
| HealthClaw Veterinary | sub-vertical | Animal patients, species profiles, vaccinations, veterinary procedures |
| HospitalityClaw | vertical | Properties, rooms, reservations, guests, housekeeping, front desk, F&B, revenue management |
| LegalClaw | vertical | Matters, clients, time tracking, billing, documents, court dates, conflicts, trust accounting |
| NonprofitClaw | vertical | Donors, donations, campaigns, grants, programs, volunteers, events, fund accounting |
| PropertyClaw | vertical | Properties, units, leases, tenants, maintenance, rent, property accounting |
| PropertyClaw Commercial | sub-vertical | Commercial leases, CAM charges, tenant improvements, lease abstracts |
| RetailClaw | vertical | Stores, products, pricing, promotions, loyalty, POS, multi-channel and ecommerce |

Additional registry modules must be handled by the same metadata model even when not enumerated here.

## 5. Onboarding Requirements

The onboarding page/assistant should:

- Ask the user to describe their business.
- Detect likely industry.
- Ask for confirmation before applying an industry profile.
- Set up company, chart, defaults, fiscal year, tax settings, and relevant module suggestions.
- Show module recommendations with dependency explanations.
- Never auto-install a module from a vague business description.

Example flows:

- "I'm a school" suggests EduClaw and relevant submodules.
- "Set me up for a clinic" suggests HealthClaw.
- "I need manufacturing" suggests manufacturing-related modules when available.
- "I run a hotel" suggests HospitalityClaw.

## 6. Vertical Page Generation Requirements

Every installed module must contribute:

- Navigation domain entries.
- Entity page metadata.
- List/detail/create/edit forms.
- Actions with confirmation class.
- Reports and dashboard KPIs.
- Permissions.
- Migration status.
- Tests or conformance checks.

The generated UI must preserve the same entity page pattern as core ERPClaw:

- List.
- Detail.
- Create/edit form.
- Action panel.
- Reports.
- Audit.
- Linked records.
- Empty/error states.

## 7. Module Governance

Modules must obey foundation rules:

- No float money.
- No integer autoincrement primary keys for business records.
- No direct GL mutation bypassing invariant validation.
- No hardcoded CHECK constraints where registry-managed values are required.
- No unprefixed tables that collide with the foundation.
- No destructive actions without confirmation class.
- No credential or secret leakage.
- No network source outside approved module registry policy.

## 8. Expansion Acceptance Checklist

Before a module is marked usable:

- Registry entry exists with display name, category, version, action count, dependencies, source, tags, and file hashes.
- Install succeeds from a clean foundation.
- Migrations are idempotent.
- Actions appear in action cache.
- UI metadata renders all module pages.
- Tests pass.
- Removing/disabling the module does not corrupt core reports.
- The module's records are auditable.
- Cross-module accounting posts through core GL invariants.

## 9. Verity Capability Interpretation

ERPClaw module expansion should not become uncontrolled schema sprawl in Verity. The Verity mapping should be:

- Foundation ERPClaw capability for setup, accounting, ledgers, payments, reports, and module management.
- Business-domain capabilities for sales, buying, inventory, billing, HR, payroll, and advanced accounting if implementation size requires separation.
- Optional vertical capabilities installed only when the client asks for that industry.
- A metadata compiler that can ingest ERPClaw-style `UI.yaml` and produce Verity route/entity/action/report definitions.
- Explicit provenance docs for each imported module: source repo, source version, registry hash, Verity adaptation decisions, and unsupported actions.
