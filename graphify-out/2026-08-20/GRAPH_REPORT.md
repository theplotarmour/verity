# Graph Report - verity  (2026-08-20)

## Corpus Check
- 679 files · ~501,670 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3734 nodes · 9314 edges · 266 communities (207 shown, 59 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 26 edges (avg confidence: 0.62)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9e75fb68`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- getOwnerUser
- 00000000000000_baseline/migration.sql
- 20260727000000_init/migration.sql
- receive/route.ts
- server/permissions.ts
- hq.ts
- owner.ts
- actions/stages.ts
- AddMasterDataClient.tsx
- pricing.ts
- guardModuleWrite
- itemsFromSpec.ts
- ProjectDetailClient.tsx
- packs.ts
- ColumnStrip.tsx
- prisma.ts
- registry.ts
- Module Development
- ModuleKey
- entitlements.ts
- seed-carxen.ts
- Verity Completion Plan
- queries/spec.ts
- SpecStudioClient.tsx
- getUserSession
- guardModuleAction
- qc-video.ts
- settings/client.tsx
- owner-shell.tsx
- booking/client.tsx
- Architectural Blockers
- history.ts
- 3. Module-by-Module Operational Audit & Lifecycles
- descriptor.equivalence.test.ts
- server/auth.ts
- purchase.ts
- Verity Vertical Packs
- resolve.ts
- reactions.ts
- primitives.tsx
- cn
- getActiveSessionUser
- DepartmentsClient.tsx
- jobCardAdapter.ts
- toast.tsx
- bomTemplates.ts
- production/client.tsx
- SpecDataGrid.tsx
- InventoryClient.tsx
- seed.ts
- bootstrap_seed.mjs
- PRD 01 — Metering & Subscription Billing
- lib/types.ts
- phoneKey
- sopGate.ts
- api-keys.ts
- mock_seed.mjs
- 12-decisions/README.md
- actions/scheduling.ts
- events.ts
- devDependencies
- assignments.ts
- orders.ts
- ItemsTree.tsx
- VariantDescInput.tsx
- VERITY_HQ_PHONES
- Requirements
- dependencies
- brand.ts
- assistant/route.ts
- lifecycle.ts
- scripts
- ChecklistBuilder.tsx
- production-status.ts
- ItemUnitsEditor.tsx
- actions/projects.ts
- markdown.ts
- docs/README.md
- compilerOptions
- seed_designs.ts
- worker/layout.tsx
- root-providers.tsx
- actions/billing.ts
- gen_rls_migration.mjs
- verify/[id]/page.tsx
- PRD 00 — Module System
- PRD 04 — Franchise Modules
- tally/route.ts
- guard-coverage.test.ts
- OrderReviewDossier.tsx
- link-targets.ts
- integrations.ts
- backfill-role-permissions.ts
- onboarding/page.tsx
- specFields.ts
- ItemSearchInput.tsx
- InstallPromptBanner.tsx
- language-provider.tsx
- retype.ts
- tenant-isolation.test.ts
- enrich_seed.ts
- resolveOrderItem
- seed_plotarmour.mjs
- contrast.test.ts
- orderFields.ts
- rules
- generate_verity_docs.py
- Phase 4 — Permission Backfill (awaiting approval)
- enrich_usage.ts
- 3. Generative Role-Specific UX Layer (The Four Worlds)
- write-guard.test.ts
- package.json
- vercel.json
- repair-legacy-pin-hashes.ts
- PRD 03 — Module Contract & Developer Platform
- outbox.ts
- db_state.mjs
- seed_group_defaults.mjs
- seed_seatcover_spec.mjs
- timing.mts
- verify_login.mjs
- entitlement-guards.test.ts
- guard-placement.test.ts
- inventory-of-db.mts
- verify.mts
- sw.js/route.ts
- no-native-select.test.ts
- src/middleware.ts
- next.config.ts
- reset-demo.ts
- backfill_inspections.ts
- fix_qc.ts
- fix_stage_config.ts
- migrate_variants_to_items.mjs
- reseed_catalog.ts
- row_counts.mjs
- seed_item_groups.mjs
- seed_jmd_checklist_temp.ts
- seed_jmd_qc_temp.ts
- update_qc.ts
- workspace-routes.test.ts
- ProgressRing.tsx
- theme.ts
- specCsv.test.ts
- @aws-sdk/s3-request-presigner
- Semantic Theme Tokens
- dayjs
- hashPin
- eslint.config.mjs
- bus.ts
- @fontsource/noto-sans-devanagari
- shopifyOrder.ts
- gsap
- Verity — Claude Code Project Memory
- jose
- Verity — SMB & Lifestyle Services OS Strategy
- next
- next-themes
- 2. Requirements
- 2. Sync Workflow
- anomalies.ts
- react
- Verity Vision
- @sentry/nextjs
- Verity — The Composable Business Operating Platform
- VEDA To Verity Migration
- tailwindcss-animate
- @types/papaparse
- 3. The "Real Work" Ahead (Remediation Order)
- PRD 05: Master Data Edit & Delete Refinements
- PRD 06: Veda Platform Backports & Optimizations
- postcss.config.mjs
- backfill_bom_mode.mts
- seed_bom_templates.mjs
- cleanup.mts
- designs.mts
- fab.mts
- inspect.mts
- legacy.mts
- prod.mts
- progress.mts
- strays.mts
- app icon.png
- Original MasterSheetView snapshot
- Item tree root groups snippet
- customers.ts
- locations.ts
- combinations.ts
- Module Registry
- Modules, Packs, And Systems
- Packs
- "Supplier"
- "Warehouse"
- Migrations
- Terminology
- VEDA Legacy Context
- Dynamic Dashboard
- System Builder
- Client Portal
- Brand System
- UI System
- Data Model
- Security
- Target Architecture
- Current Extraction Map
- Future Modules
- Immediate Priorities
- AI And Agent Implementation Rules
- storage.ts
- Verity Principles
- Events And Workflows
- Module Lifecycle
- RBAC And Capability Authorization
- Verity Core
- Configuration vs Customization
- System Templates
- Client Provisioning
- Module Library
- Dynamic Navigation
- Kent's Module Map
- Testing
- Current State
- Verification Checklist
- Verity Documentation
- Admin Control Center
- Role-Based Experience
- Current Architecture
- Client Implementations
- Verity PRDs
- clsx
- do-not-do.md
- framer-motion
- inngest
- serwist
- @supabase/ssr
- "User"

## God Nodes (most connected - your core abstractions)
1. `getOwnerUser` - 393 edges
2. `guardModuleWrite()` - 148 edges
3. `getUserSession()` - 110 edges
4. `guardModuleAction()` - 108 edges
5. `cn()` - 106 edges
6. `Button()` - 69 edges
7. `guardModulePage()` - 58 edges
8. `toast` - 56 edges
9. `Input()` - 42 edges
10. `ModuleKey` - 42 edges

## Surprising Connections (you probably didn't know these)
- `describeSpecDetails()` --indirect_call--> `v()`  [INFERRED]
  src/lib/server/specUtils.ts → scripts/seed_all_specs.mjs
- `make()` --calls--> `createItemFromSpecFor()`  [EXTRACTED]
  prisma/seed-carxen.ts → src/server/internal/itemEngine.ts
- `rebuildBlueprints()` --calls--> `buildItemBlueprint()`  [EXTRACTED]
  prisma/seed-carxen.ts → src/server/actions/itemBlueprint.ts
- `main()` --calls--> `hashPin()`  [EXTRACTED]
  scripts/onboard_jmd_impex.ts → src/lib/server/hash.ts
- `Trial` --references--> `ModuleKey`  [EXTRACTED]
  scripts/provision-trial.ts → src/platform/modules/registry.ts

## Import Cycles
- 3-file cycle: `src/platform/modules/definitions/procurement.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/procurement.ts`
- 3-file cycle: `src/platform/modules/definitions/quality.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/quality.ts`
- 3-file cycle: `src/platform/modules/definitions/sales.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/sales.ts`
- 3-file cycle: `src/platform/modules/definitions/automotive.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/automotive.ts`
- 3-file cycle: `src/platform/modules/definitions/booking.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/booking.ts`
- 3-file cycle: `src/platform/modules/definitions/projects.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/projects.ts`
- 3-file cycle: `src/platform/modules/definitions/finance.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/finance.ts`
- 3-file cycle: `src/platform/modules/definitions/core.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/core.ts`
- 3-file cycle: `src/platform/modules/definitions/helpdesk.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/helpdesk.ts`
- 3-file cycle: `src/platform/modules/definitions/scheduling.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/scheduling.ts`
- 3-file cycle: `src/platform/modules/definitions/sites.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/sites.ts`
- 3-file cycle: `src/platform/modules/definitions/manufacturing.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/manufacturing.ts`
- 3-file cycle: `src/platform/modules/definitions/assets.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/assets.ts`
- 3-file cycle: `src/platform/modules/definitions/billing.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/billing.ts`
- 3-file cycle: `src/platform/modules/definitions/crm.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/crm.ts`
- 3-file cycle: `src/platform/modules/definitions/hr.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/hr.ts`
- 3-file cycle: `src/platform/modules/definitions/inventory.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/inventory.ts`

## Communities (266 total, 59 thin omitted)

### Community 0 - "getOwnerUser"
Cohesion: 0.09
Nodes (52): MasterDataWorkspacePage(), StorageDiagnosticsPage(), DEFAULT_MATERIAL_CATEGORY, FABRIC_CATEGORY, createItemInRootCategory(), itemsInRootCategory(), uniqueSku(), getOwnerUser (+44 more)

### Community 1 - "00000000000000_baseline/migration.sql"
Cohesion: 0.05
Nodes (82): "Agreement", "Approval", "Attachment", "AttendanceLog", "AuditLog", "BinBalance", "Blueprint", "BlueprintRouteStep" (+74 more)

### Community 2 - "20260727000000_init/migration.sql"
Cohesion: 0.05
Nodes (81): "Agreement", "Approval", "Attachment", "AttendanceLog", "AuditLog", "BinBalance", "Blueprint", "BlueprintRouteStep" (+73 more)

### Community 3 - "receive/route.ts"
Cohesion: 0.16
Nodes (18): dynamic, handled(), POST(), runtime, dynamic, json(), POST(), runtime (+10 more)

### Community 4 - "server/permissions.ts"
Cohesion: 0.21
Nodes (16): SettingsClient(), OwnerSettingsPage(), PermissionMatrixCard(), ROLE_LABELS, ROLES, ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, KEY_TO_LEGACY (+8 more)

### Community 5 - "hq.ts"
Cohesion: 0.07
Nodes (60): GET(), hashPassword(), GET(), BLANK, Client, ClientsClient(), Issued, Pack (+52 more)

### Community 6 - "owner.ts"
Cohesion: 0.07
Nodes (50): AssetDetailPage(), AssetsPage(), InvoiceDetailPage(), BillingPage(), CustomersPage(), DepartmentFloorPage(), FloorPage(), TicketDetailPage() (+42 more)

### Community 7 - "actions/stages.ts"
Cohesion: 0.10
Nodes (48): ApproveActions(), dynamic, SupervisorStagePage(), ChecklistRow(), ChecklistState, idbDel(), idbGet(), idbPut() (+40 more)

### Community 8 - "AddMasterDataClient.tsx"
Cohesion: 0.08
Nodes (40): Group, panelOf(), StructuredValue, StructuredVariantForm(), EditableSpecCell(), NamePreviewBar(), FreeTextInput(), Props (+32 more)

### Community 9 - "pricing.ts"
Cohesion: 0.09
Nodes (36): TenantBillingPage(), ChargeLine, GeneratedInvoice, generateInvoice(), intendedLines(), monthPeriod(), nextInvoiceNumber(), PLATFORM_LINE (+28 more)

### Community 10 - "guardModuleWrite"
Cohesion: 0.10
Nodes (50): createWithDocNumber(), formatDocNumber(), guardModuleWrite(), AssetInput, createAsset(), createMaintenanceSchedule(), deleteAsset(), deleteMaintenanceSchedule() (+42 more)

### Community 11 - "itemsFromSpec.ts"
Cohesion: 0.12
Nodes (32): prisma, AddMasterDataClient(), BomEdit, isAttributeGroup(), writeBomEdits(), specHash(), identityOf(), isEmptyAnswer() (+24 more)

### Community 12 - "ProjectDetailClient.tsx"
Cohesion: 0.05
Nodes (96): AssetRow, AssetsClient(), BLANK, STATUSES, Asset, AssetDetailClient(), Log, Schedule (+88 more)

### Community 13 - "packs.ts"
Cohesion: 0.11
Nodes (29): checkDashboardRouting(), fail(), main(), pass(), prisma, reportIngestCoverage(), ROUTE, DASHBOARDS (+21 more)

### Community 14 - "ColumnStrip.tsx"
Cohesion: 0.18
Nodes (16): SpecStudioClient(), ColumnCard(), ColumnStrip(), SchemaEditor(), StripGroup, BUILTIN_COLUMNS, BuiltinColumnId, BY_ID (+8 more)

### Community 15 - "prisma.ts"
Cohesion: 0.07
Nodes (29): dynamic, InspectorInboxPage(), dynamic, InspectorProfilePage(), dynamic, SupervisorHome(), Answer, getDB() (+21 more)

### Community 16 - "registry.ts"
Cohesion: 0.12
Nodes (21): assetsModule, automotiveModule, billingModule, bookingModule, coreModule, crmModule, financeModule, helpdeskModule (+13 more)

### Community 17 - "Module Development"
Cohesion: 0.06
Nodes (29): Current Code Candidates, Does Not Own, Manufacturing Module, Owns, Required Migration, Current Module Groups, Module Catalog, Module Document Template (+21 more)

### Community 18 - "ModuleKey"
Cohesion: 0.08
Nodes (38): hashPin(), main(), prisma, Trial, TRIALS, CLIENT_OWNER, hashPin(), main() (+30 more)

### Community 19 - "entitlements.ts"
Cohesion: 0.12
Nodes (33): entitledModules(), main(), prisma, Entry, inflight, invalidate(), store, disableModule() (+25 more)

### Community 20 - "seed-carxen.ts"
Cohesion: 0.07
Nodes (52): cleanStructure(), COLOURS, created, Ctx, CUSTOMERS, DEFAULT_ROUTE, DEPARTMENTS, DESIGNS (+44 more)

### Community 21 - "Verity Completion Plan"
Cohesion: 0.06
Nodes (31): Current measured coverage, Decisions Logged, Deliberately out of scope, Exit criterion, Exit criterion, Exit criterion, Exit criterion, Exit criterion (+23 more)

### Community 22 - "queries/spec.ts"
Cohesion: 0.11
Nodes (30): BomContributionShape, BomLine, BomOverrideShape, BomSource, BomTemplateLineShape, expandBomTemplate(), ResolvedBomLine, resolveItemBom() (+22 more)

### Community 23 - "SpecStudioClient.tsx"
Cohesion: 0.15
Nodes (19): Group, MobileGroupRail(), Group, TemplateEditor(), SubTree(), TreeGroup, CategorySettings(), KIND_HINTS (+11 more)

### Community 24 - "getUserSession"
Cohesion: 0.09
Nodes (27): GET(), POST(), InspectorVerifiedPage(), ProductionLabelPage(), OrderInfo, ProductionLabel(), OwnerReviewInspectionPage(), OrderTimeline() (+19 more)

### Community 25 - "guardModuleAction"
Cohesion: 0.07
Nodes (55): InventoryClient(), InventoryPage(), LogisticsClient(), LogisticsPage(), OwnerReportsPage(), download(), ReportsPackClient(), deriveProductionStatus() (+47 more)

### Community 26 - "qc-video.ts"
Cohesion: 0.15
Nodes (22): QcVideoCapture(), readDuration(), STORAGE_ALLOWED_EXTENSIONS, STORAGE_ALLOWED_MIME_TYPES, STORAGE_BUCKET, STORAGE_MAX_BYTES, VIDEO_ALLOWED_EXTENSIONS, VIDEO_ALLOWED_MIME_TYPES (+14 more)

### Community 27 - "settings/client.tsx"
Cohesion: 0.13
Nodes (13): AddEmployeeForm(), RemoveEmployeeButton(), ResetPinButton(), ConfirmDialog(), ConfirmDialogProps, Card(), layouts, tokens (+5 more)

### Community 28 - "owner-shell.tsx"
Cohesion: 0.10
Nodes (28): AssistantPanel(), Message, MobileTab(), NAV_ICONS, NotificationItem, OwnerShell(), ShellNavItem, withIcon() (+20 more)

### Community 29 - "booking/client.tsx"
Cohesion: 0.08
Nodes (38): BookingCard(), BookingClient(), dateFmt, dayKeyFmt, instantOf(), keyOf(), NewBookingSheet(), shiftKey() (+30 more)

### Community 30 - "Architectural Blockers"
Cohesion: 0.07
Nodes (29): 1. A central module registry exists, 2. Tenant module enablement exists, 3. Provisioning creates tenants with modules, 4. Admin can manage modules, 5. Navigation is partly module-driven, 6. Some newer modules are server-gated, Acceptance Checklist Against The Vision, Architectural Blockers (+21 more)

### Community 31 - "history.ts"
Cohesion: 0.10
Nodes (22): dynamic, SupervisorHistoryDetailPage(), dynamic, SupervisorHistoryPage(), Bucket, BUCKET_LABEL, BUCKET_TONE, HistoryClient() (+14 more)

### Community 32 - "3. Module-by-Module Operational Audit & Lifecycles"
Cohesion: 0.08
Nodes (25): 10. Serving (`serving`), 11. Helpdesk (`helpdesk`), 12. Assets (`assets` / `maintenance`), 13. Inventory (`inventory`), 14. Procurement (`procurement`), 1. Core (`core`), 1. The Core Philosophy Shift, 2. People (`hr`) (+17 more)

### Community 33 - "descriptor.equivalence.test.ts"
Cohesion: 0.09
Nodes (29): DescriptorSpec, DescriptorValues, ALL, ARMRESTS, BRANDS, DESIGNS, FABRICS, GENERATIONS (+21 more)

### Community 34 - "server/auth.ts"
Cohesion: 0.12
Nodes (24): POST(), HomeClient(), TAP_SPRING, HomePage(), WorkerSettingsClient(), NotificationPrefsCard(), clearUserSession(), createUserSession() (+16 more)

### Community 35 - "purchase.ts"
Cohesion: 0.14
Nodes (23): PurchasePage(), PurchaseClient(), approvePurchaseOrder(), confirmPurchaseDelivery(), createPurchaseOrder(), createSupplier(), deletePurchaseOrder(), deleteSupplier() (+15 more)

### Community 36 - "Verity Vertical Packs"
Cohesion: 0.09
Nodes (21): Adding a new pack, How packs work, Kent's Restaurant context, Modules included, Modules included, Modules included (current), Modules included (current), Modules planned (PRD 04) (+13 more)

### Community 37 - "resolve.ts"
Cohesion: 0.16
Nodes (22): groupByName, makeItem(), prisma, descendantIds(), FieldLike, FieldShape, groupChain(), GroupNode (+14 more)

### Community 38 - "reactions.ts"
Cohesion: 0.22
Nodes (21): emitEvent(), ownerRecipients(), draftServiceInvoice(), EventPayload, on(), appointmentInvoiceMarker(), AppointmentPayload, auditAppointment() (+13 more)

### Community 39 - "primitives.tsx"
Cohesion: 0.07
Nodes (33): dynamic, Tab, TABS, SearchResults, MemberWithStats, AutoComponentsDashboard(), FacilityManagementDashboard(), QsrFranchiseDashboard() (+25 more)

### Community 40 - "cn"
Cohesion: 0.05
Nodes (47): OwnerDashboard(), Dept, FloorClient(), Job, orderLine(), Stat(), DepartmentFloorClient(), JobRow() (+39 more)

### Community 41 - "getActiveSessionUser"
Cohesion: 0.21
Nodes (8): POST(), relativeTime(), WarningRow, WarningsQueue(), WARNINGS_QUEUE_LIMIT, getActiveSessionUser, dismissAllNotifications(), dismissNotification()

### Community 42 - "DepartmentsClient.tsx"
Cohesion: 0.14
Nodes (20): DepartmentModal(), DepartmentsClient(), Dept, Member, ROSTER_ROLES, RosterModal(), Template, UserRow (+12 more)

### Community 43 - "jobCardAdapter.ts"
Cohesion: 0.10
Nodes (38): InspectorRejectedPage(), dynamic, ReviewInspectionPage(), ReviewCheckpoints(), SearchPage(), EmployeeProfilePage(), FloorProgressWidget(), departmentKind (+30 more)

### Community 44 - "toast.tsx"
Cohesion: 0.09
Nodes (21): Section, BLANK, CustomerRow, Suggestion, LaunchOutletDialog(), Customer, CustomersTree(), emptyForm() (+13 more)

### Community 45 - "bomTemplates.ts"
Cohesion: 0.11
Nodes (36): ItemDetailPage(), BomTemplateEditor(), ContributionEditor(), DeleteItemButton(), ItemBomEditor(), sourceStyle, addContribution(), ContributionOwner (+28 more)

### Community 46 - "production/client.tsx"
Cohesion: 0.15
Nodes (13): getColorIndicator(), OrdersClient(), OrdersClientProps, PipelineBadge(), StatusBadge(), SearchClient(), CustomerOption, CustomerPicker() (+5 more)

### Community 47 - "SpecDataGrid.tsx"
Cohesion: 0.17
Nodes (19): SpecDataGrid(), SpecRow, CsvField, csvHeader(), csvOptionSheet(), csvSampleRow(), FIXED, parseCsvRow() (+11 more)

### Community 48 - "InventoryClient.tsx"
Cohesion: 0.17
Nodes (5): STOCK_MODAL_COPY, StockModalType, Tab, TABS, ADJUSTMENT_TYPES

### Community 49 - "seed.ts"
Cohesion: 0.13
Nodes (15): BlueprintSeed, CODE_PREFIX, codeCounters, hashPin(), main(), prisma, seedItemGroups(), main() (+7 more)

### Community 50 - "bootstrap_seed.mjs"
Cohesion: 0.09
Nodes (15): colorNames, customerNames, DEFAULT_DEPARTMENTS, designSpec, ensureVariant(), fabricItems, firstNames, item() (+7 more)

### Community 51 - "PRD 01 — Metering & Subscription Billing"
Cohesion: 0.10
Nodes (19): 1. Module prices — one number per tier, 2. Pack prices — a real 20–25% discount, 3. Team size — three flat brackets, no per-seat, 4. Trial — 7 days, no card, Goals, Non-goals, PRD 01 — Metering & Subscription Billing, Problem (+11 more)

### Community 52 - "lib/types.ts"
Cohesion: 0.08
Nodes (24): AppData, AssignmentDraft, AssignmentStatus, AuditLog, BootstrapPayload, Checkpoint, CheckpointResponse, Customer (+16 more)

### Community 53 - "phoneKey"
Cohesion: 0.18
Nodes (14): main(), prisma, HqLayout(), parsePhoneList(), phoneKey(), samePhone(), allowlist(), Denial (+6 more)

### Community 54 - "sopGate.ts"
Cohesion: 0.38
Nodes (3): checkOpeningSop(), SopVerdict, startOfToday()

### Community 55 - "api-keys.ts"
Cohesion: 0.23
Nodes (16): headers(), hashToken(), IssuedKey, issueKeyMaterial(), MAX_SKEW_SECONDS, safeEqual(), SignatureVerdict, signPayload() (+8 more)

### Community 56 - "mock_seed.mjs"
Cohesion: 0.11
Nodes (13): colorNames, customerNames, designSpec, ensureVariant(), fabricItems, firstNames, item(), lastNames (+5 more)

### Community 57 - "12-decisions/README.md"
Cohesion: 0.11
Nodes (14): ADR-001: Verity Is A Module Platform, Consequences, Decision, ADR-002: Modules Own Capability Contracts, Consequences, Decision, ADR-003: Entitlements Are Organization-Scoped, Consequences (+6 more)

### Community 58 - "actions/scheduling.ts"
Cohesion: 0.28
Nodes (13): SchedulingPage(), isoDay(), SchedulingClient(), copyWeek(), deleteSchedule(), getSchedulingData(), requestSwap(), resolveSwap() (+5 more)

### Community 59 - "events.ts"
Cohesion: 0.18
Nodes (14): isFailingQcScore(), QC_FAIL_THRESHOLD, qcAuditScore(), QcScore, escapeHtml(), EventKey, EVENTS, Prefs (+6 more)

### Community 60 - "devDependencies"
Cohesion: 0.07
Nodes (27): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, @playwright/test, prisma, tailwindcss (+19 more)

### Community 61 - "assignments.ts"
Cohesion: 0.14
Nodes (15): dynamic, GET(), runtime, Reassign(), channel(), g, LiveChange, publishChange() (+7 more)

### Community 62 - "orders.ts"
Cohesion: 0.22
Nodes (12): ensureFactoryDepartments(), resolveOrderTemplate(), allocateFinishedStock(), approveSalesOrder(), assessOnOrderStock(), createBatchOrders(), createCustomer(), createOrder() (+4 more)

### Community 63 - "ItemsTree.tsx"
Cohesion: 0.10
Nodes (29): Category, emptyForm(), Field(), FieldDef, Form, Item, ItemsTree(), ItemMetadata (+21 more)

### Community 64 - "VariantDescInput.tsx"
Cohesion: 0.11
Nodes (32): DesignOption, matchesAll(), Option, Segment, segmentsFromValue(), SpecConstraint, Stage, stagesFor() (+24 more)

### Community 65 - "VERITY_HQ_PHONES"
Cohesion: 0.12
Nodes (18): /verity HQ Console, Module Entitlements, Phone + 4-digit PIN login, requireHqAction guard, Server Action Auth Surface, Site, Tenant Scoping by factoryId, Verity Core Data Model (+10 more)

### Community 66 - "Requirements"
Cohesion: 0.11
Nodes (17): Goals, Non-goals, PRD 02 — AI Assistant, Problem, R1 — Grounding context, R2 — Model routing, R3 — Read-only tools, tenant-scoped, R4 — Proposals, not writes (+9 more)

### Community 67 - "dependencies"
Cohesion: 0.07
Nodes (29): @aws-sdk/client-s3, @fontsource/inter, groq-sdk, idb, lucide-react, dependencies, @aws-sdk/client-s3, @fontsource/inter (+21 more)

### Community 68 - "brand.ts"
Cohesion: 0.13
Nodes (12): contentType, size, contentType, size, BRAND_ACCENT, BRAND_ACCENT_DARK, BRAND_BACKGROUND, BRAND_DESCRIPTION (+4 more)

### Community 69 - "assistant/route.ts"
Cohesion: 0.12
Nodes (25): POST(), SYSTEM_PROMPT, ASSISTANT_TOKEN_CAP, BudgetVerdict, checkAssistantBudget(), recordAssistantTokens(), AssistantContext, buildAssistantContext() (+17 more)

### Community 70 - "lifecycle.ts"
Cohesion: 0.22
Nodes (13): GET(), dynamic, GET(), runtime, dynamic, GET(), runtime, cronAuthorized() (+5 more)

### Community 71 - "scripts"
Cohesion: 0.12
Nodes (16): scripts, build, build:analyze, db:migrate, db:reset, db:sync, dev, lint (+8 more)

### Community 72 - "ChecklistBuilder.tsx"
Cohesion: 0.23
Nodes (12): ChecklistBuilder(), CheckpointInput, referenceImagePath(), SectionInput, TemplateInput, TemplatesStudioTab(), components, importMasterCsvExtra() (+4 more)

### Community 73 - "production-status.ts"
Cohesion: 0.18
Nodes (8): isJobCardOnFloor(), JOB_CARD_DONE, KIND_STATUS, PRODUCTION_STATUS_LABELS, PRODUCTION_STATUSES, ProductionStatus, StatusInput, StatusJobCard

### Community 74 - "ItemUnitsEditor.tsx"
Cohesion: 0.23
Nodes (11): ItemUnitsEditor(), UnitCell(), Units, NormalisedUnits, normaliseUnit(), normaliseUnits(), UnitInput, getItemUnits() (+3 more)

### Community 75 - "actions/projects.ts"
Cohesion: 0.24
Nodes (17): ProjectDetailClient(), approveTimesheet(), createProject(), createTask(), deleteProject(), deleteTask(), deleteTimesheet(), parseDate() (+9 more)

### Community 76 - "markdown.ts"
Cohesion: 0.22
Nodes (11): Contents(), GuideClient(), GuidePage(), metadata, escapeHtml(), GuideHeading, inline(), isTableDivider() (+3 more)

### Community 77 - "docs/README.md"
Cohesion: 0.24
Nodes (3): Architecture Verdict, Read These Instead, Verity Architecture

### Community 78 - "compilerOptions"
Cohesion: 0.06
Nodes (34): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+26 more)

### Community 79 - "seed_designs.ts"
Cohesion: 0.16
Nodes (13): BOM_BY_FAMILY, CATALOGUE, CODE_PREFIX, COMMON_FINISHING, FABRIC_CONSUMPTION, ItemSpec, Line, main() (+5 more)

### Community 80 - "worker/layout.tsx"
Cohesion: 0.34
Nodes (6): WorkerLayout(), AutoRefresh(), isUserBusy(), IdleLogout(), LiveRefresh(), logoutUser()

### Community 81 - "root-providers.tsx"
Cohesion: 0.22
Nodes (6): metadata, viewport, RootProviders(), ThemeProvider(), CursorGlow(), initPostHog()

### Community 82 - "actions/billing.ts"
Cohesion: 0.28
Nodes (14): DraftInvoiceInput, LineItemInput, priceLines(), round2(), buildInvoiceFromWork(), createInvoice(), deleteInvoice(), exportPayrollCsv() (+6 more)

### Community 83 - "gen_rls_migration.mjs"
Cohesion: 0.21
Nodes (11): byName, counts, emit(), models, out, p(), parentLink(), parentLinkShallow() (+3 more)

### Community 84 - "verify/[id]/page.tsx"
Cohesion: 0.15
Nodes (9): QualityPassportPage(), PassportCard(), VerificationPanel(), VerifiedMoment(), DesignReference(), EvidenceItem, EvidenceLightbox(), OrderSpecCard() (+1 more)

### Community 85 - "PRD 00 — Module System"
Cohesion: 0.12
Nodes (16): Deferred, with reasons, Goals, Non-goals, PRD 00 — Module System, Problem, R1 — Manifest registry, R2 — Navigation from manifests, R3 — Installer (+8 more)

### Community 86 - "PRD 04 — Franchise Modules"
Cohesion: 0.12
Nodes (16): Module: Field Compliance (Tier 3, Retail + FM), Module: Franchise Ops (Tier 3, QSR + Retail), Module: Kitchen Ops (Tier 3, QSR), Pack changes, and what they cost, PRD 04 — Franchise Modules, Problem, Requirements, Requirements (+8 more)

### Community 87 - "tally/route.ts"
Cohesion: 0.38
Nodes (8): dynamic, GET(), runtime, csvField(), TALLY_COLUMNS, tallyDate(), TallyRow, toTallyCsv()

### Community 88 - "guard-coverage.test.ts"
Cohesion: 0.24
Nodes (8): ACTION_FILES, ACTIONS_DIR, OWNER_DIR, PAGES, ACTION_OWNERSHIP, Ownership, requiresGuard(), ROUTE_OWNERSHIP

### Community 89 - "OrderReviewDossier.tsx"
Cohesion: 0.27
Nodes (7): AssignmentRow(), checklistFor(), ChecklistItem, DeptRow(), OrderReviewDossier(), Pill(), statusTone()

### Community 90 - "link-targets.ts"
Cohesion: 0.31
Nodes (8): ancestry(), buildLinkTargets(), GroupNode, LinkTarget, linkTargetIdOf(), lower(), SYSTEM_LINK_TARGETS, groups

### Community 91 - "integrations.ts"
Cohesion: 0.29
Nodes (14): ApiKey, Delivery, Endpoint, IntegrationsClient(), OwnerIntegrationsPage(), addMyWebhook(), issueMyApiKey(), listMyApiKeys() (+6 more)

### Community 92 - "backfill-role-permissions.ts"
Cohesion: 0.25
Nodes (6): APPLY, prisma, AMBIGUOUS, RegistryKey, ROLE_REGISTRY_GRANTS, WITHHELD

### Community 93 - "onboarding/page.tsx"
Cohesion: 0.25
Nodes (4): OnboardingPage(), CircularMarqueeLoader(), CircularMarqueeLoaderProps, VerityLogo()

### Community 94 - "specFields.ts"
Cohesion: 0.24
Nodes (13): Group, LinkableGroup, SpecFieldEditor(), COLUMN_TYPES, toFieldKey(), addSpecFieldOption(), createSpecField(), deleteSpecField() (+5 more)

### Community 95 - "ItemSearchInput.tsx"
Cohesion: 0.31
Nodes (7): ItemSearchInput(), Props, VariantValue, countFinishedGoods(), ItemSearchResult, PRODUCIBLE_WHERE, searchFinishedGoods()

### Community 96 - "InstallPromptBanner.tsx"
Cohesion: 0.29
Nodes (7): InstallAction(), InstallPromptBanner(), BeforeInstallPromptEvent, PwaContext, PwaContextValue, PwaProvider(), usePwa()

### Community 97 - "language-provider.tsx"
Cohesion: 0.19
Nodes (13): LanguageContext, LanguageContextValue, LanguageProvider(), useLanguage(), BottomNav(), BottomNavItem, BottomNavProps, InspectorNav() (+5 more)

### Community 98 - "retype.ts"
Cohesion: 0.16
Nodes (11): AnswerPlan, blockingReason(), EMPTY, isBlank(), NEEDS_A_CHOICE, NUMERIC, planAnswer(), StoredAnswer (+3 more)

### Community 99 - "tenant-isolation.test.ts"
Cohesion: 0.28
Nodes (8): ACTIONS_DIR, argumentBlock(), Call, GUARDED_FILES, modelsWithFactoryId(), SCHEMA, SCOPE_OPENING, scopeOpeningCalls()

### Community 100 - "enrich_seed.ts"
Cohesion: 0.32
Nodes (7): CATALOGUE, CODE_PREFIX, ItemSpec, main(), nextCode(), prisma, uniqueSku()

### Community 101 - "resolveOrderItem"
Cohesion: 0.18
Nodes (7): prisma, groupIds, o(), prisma, SPECS, v(), resolveOrderItem()

### Community 102 - "seed_plotarmour.mjs"
Cohesion: 0.29
Nodes (7): DEPARTMENTS, GRANTS, hashPin(), main(), MODULES, prisma, ROLE_LABELS

### Community 103 - "contrast.test.ts"
Cohesion: 0.29
Nodes (5): contrast(), CSS, relativeLuminance(), token(), parseSpecTokens()

### Community 104 - "orderFields.ts"
Cohesion: 0.46
Nodes (6): asRecord(), AUTOMOTIVE_KEYS, LegacyOrderColumns, PREFER_DYNAMIC, readOrderFields(), writeOrderFields()

### Community 105 - "rules"
Cohesion: 0.29
Nodes (6): extends, rules, @next/next/no-img-element, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, next/core-web-vitals

### Community 106 - "generate_verity_docs.py"
Cohesion: 0.48
Nodes (6): Path, build_docs(), dedent(), main(), reset_docs(), write()

### Community 107 - "Phase 4 — Permission Backfill (awaiting approval)"
Cohesion: 0.12
Nodes (15): Before and after, per role, CO_OWNER — 35 → 50, Deliberately withheld, MANAGER — 33 → 44, OWNER — 43 → 62, Phase 4 — Permission Backfill (awaiting approval), Safety properties, Scale (+7 more)

### Community 108 - "enrich_usage.ts"
Cohesion: 0.29
Nodes (5): BOM_RECIPES, DEPT_CHECKLISTS, prisma, PRODUCT_QC, PRODUCT_TYPE_FIELDS

### Community 109 - "3. Generative Role-Specific UX Layer (The Four Worlds)"
Cohesion: 0.13
Nodes (14): 1. Platform Core Definition, 1. Service Day, 2. Dynamic Workflow Composition Engine, 2. Field Maintenance, 3. Generative Role-Specific UX Layer (The Four Worlds), 4. Design & Glassmorphism Guidelines, Reference Composition Flows, Streamlined Development Model (No External SDK) (+6 more)

### Community 110 - "write-guard.test.ts"
Cohesion: 0.29
Nodes (4): Action, ACTIONS, GUARDED, READ_PREFIXES

### Community 111 - "package.json"
Cohesion: 0.33
Nodes (5): name, prisma, seed, private, version

### Community 112 - "vercel.json"
Cohesion: 0.33
Nodes (5): bom1, crons, framework, regions, $schema

### Community 113 - "repair-legacy-pin-hashes.ts"
Cohesion: 0.47
Nodes (5): current(), main(), prisma, SEEDED_PINS, stale()

### Community 114 - "PRD 03 — Module Contract & Developer Platform"
Cohesion: 0.14
Nodes (14): Goals, Non-goals, PRD 03 — Module Contract & Developer Platform, Problem, R1 — `module.test.ts`, required, R2 — CI gate, R3 — Scaffolding, R4 — Module store (HQ) (+6 more)

### Community 115 - "outbox.ts"
Cohesion: 0.26
Nodes (11): backoffMs(), Client, deliverOne(), WEBHOOK_EVENTS, WebhookEvent, assertDeliverable(), checkWebhookUrl(), isBlockedAddress() (+3 more)

### Community 116 - "db_state.mjs"
Cohesion: 0.40
Nodes (4): fcols, names, phase0, prisma

### Community 117 - "seed_group_defaults.mjs"
Cohesion: 0.40
Nodes (4): byName, CHAIN, prisma, route

### Community 119 - "timing.mts"
Cohesion: 0.40
Nodes (4): p, t0, t1, t2

### Community 121 - "entitlement-guards.test.ts"
Cohesion: 0.40
Nodes (4): ACTION_MODULE_MAP, ACTIONS_DIR, OWNER_DIR, PAGE_MODULE_MAP

### Community 123 - "inventory-of-db.mts"
Cohesion: 0.50
Nodes (3): configuration, p, records

### Community 151 - "hashPin"
Cohesion: 0.46
Nodes (12): MemberDetailClient(), can(), hashPin(), generateRandomPin(), inviteMember(), logAudit(), removeMember(), resetMemberPin() (+4 more)

### Community 153 - "bus.ts"
Cohesion: 0.26
Nodes (9): __clearListeners(), emit(), EmitResult, EventListener, listenerCount(), PlatformEvent, Registration, REGISTRY (+1 more)

### Community 155 - "shopifyOrder.ts"
Cohesion: 0.31
Nodes (8): attributes(), customerName(), mapShopifyOrder(), pick(), ShopifyLineItem, ShopifyOrder, base, mapped()

### Community 157 - "Verity — Claude Code Project Memory"
Cohesion: 0.22
Nodes (8): Core Rules (always apply), Design System, graphify, Headless API Layer, Key Files, Skills active in this project, Verity — Claude Code Project Memory, What this is

### Community 159 - "Verity — SMB & Lifestyle Services OS Strategy"
Cohesion: 0.22
Nodes (8): 1. Vertical Strategy Shift, 2. New Module Specification: Appointment Booking (`booking`), 3. Packs Alignment (`src/platform/tenancy/packs.ts`), 4. UI/UX Refinements, Module Registry Definition (`src/platform/modules/definitions/booking.ts`), Schema Design (Draft), Target Audience, Verity — SMB & Lifestyle Services OS Strategy

### Community 162 - "2. Requirements"
Cohesion: 0.22
Nodes (8): 1. Problem, 2. Requirements, 3. Success Criteria, PRD 07 — Usability & Vertical Completeness, R1 — Dynamic Vertical Seeding, R2 — Menu Management Screen (`/owner/menu`), R3 — Tables & Floor Management (`/owner/tables`), R4 — Register Navigation Items

### Community 163 - "2. Sync Workflow"
Cohesion: 0.22
Nodes (8): 1. Initial Local Setup (Run Once), 2. Sync Workflow, 3. Handling Mass Changes, Step 1: Fetch Veda Commits, Step 2: Identify the Commit Hash, Step 3: Cherry-Pick the Commit, Step 4: Resolve Naming Conflicts, Verity Sync Guide: Porting Fixes from Veda

### Community 164 - "anomalies.ts"
Cohesion: 0.36
Nodes (6): Anomaly, AnomalySignal, countCancelledAppointments(), countCancelledOrders(), judgeSignal(), scanFactoryAnomalies()

### Community 166 - "Verity Vision"
Cohesion: 0.25
Nodes (8): Client Configuration, Client Data, Core Model, Module Catalog, Platform Acceptance Test, Product Line, The Required Separation, Verity Vision

### Community 168 - "Verity — The Composable Business Operating Platform"
Cohesion: 0.25
Nodes (7): 1. The Core Flywheel: Capabilities to Client Systems, 2. Core Taxonomy: Universal vs. Vertical Modules, 3. The Experience Engine: Composed UI Generation, 4. Module Event Contracts (Decoupled Composition), A. Universal Modules (The Base), B. Vertical & Specialized Modules (The Extensions), Verity — The Composable Business Operating Platform

### Community 169 - "VEDA To Verity Migration"
Cohesion: 0.25
Nodes (8): Deprecated Patterns, Migration Map, Phase 1: Make Module Disable Real, Phase 2: Prove Blank Tenant, Phase 3: Dashboard Composition, Phase 4: Module SDK Pilot, Phase 5: Manufacturing Extraction, VEDA To Verity Migration

### Community 172 - "3. The "Real Work" Ahead (Remediation Order)"
Cohesion: 0.25
Nodes (7): 1. Ground Truth Context, 2. Completed Work (Phase 1 & 2), 3. The "Real Work" Ahead (Remediation Order), Claude Code developer Guide & Repository Context, Phase 3: Convert Dashboard to Module-Composed Widgets, Phase 4: Create a Real Module SDK Contract, Phase 5: Extract VEDA/Manufacturing from Core

### Community 173 - "PRD 05: Master Data Edit & Delete Refinements"
Cohesion: 0.25
Nodes (7): 1. Gaps in Settings Workspace Explorer, 2. Gaps in Locations & Bin Management, 3. Gaps in Item Detail Panel, Action Plan, Action Plan, Action Plan, PRD 05: Master Data Edit & Delete Refinements

### Community 174 - "PRD 06: Veda Platform Backports & Optimizations"
Cohesion: 0.25
Nodes (7): 1. Category Schema Inheritance & BOM Mode, 2. Dynamic Spec-Driven Floor Progress & Stage Indicators, 3. CSV Spec Option Auto-Creation, 4. Google Fonts Turbopack Build Patch, 5. Visual Funnels & Alert Queues, 6. Supervisor/Owner Notification triggers, PRD 06: Veda Platform Backports & Optimizations

### Community 207 - "customers.ts"
Cohesion: 0.29
Nodes (7): CustomersClient(), createCustomer(), CustomerInput, getCustomer(), importCustomersCsv(), listCustomers(), nextCustomerCode()

### Community 209 - "locations.ts"
Cohesion: 0.39
Nodes (7): NewLocation(), createLocation(), deleteLocation(), LocationKind, renameLocation(), revalidate(), setLocationKind()

### Community 210 - "combinations.ts"
Cohesion: 0.36
Nodes (5): COMBINATION_CAP, CombinationResult, expandCombinations(), MultiSelection, widestSelection()

### Community 213 - "Module Registry"
Cohesion: 0.29
Nodes (7): Dependency Rules, Disabling A Module, Entitlements, Lifecycle States, Module Registry, Registry Responsibilities, Required Module Definition

### Community 214 - "Modules, Packs, And Systems"
Cohesion: 0.29
Nodes (6): Client Configuration, Composition Rule, Module, Modules, Packs, And Systems, Pack, System Template

### Community 215 - "Packs"
Cohesion: 0.29
Nodes (6): Correct Usage, Incorrect Usage, Pack Rules, Pack vs System Template, Packs, Target Admin Flow

### Community 223 - "Migrations"
Cohesion: 0.29
Nodes (6): Adding a table, Migrations, Never on the live database, The short version, What is still true, and why `migrate dev` is still wrong, What was wrong, and what was fixed

### Community 224 - "Terminology"
Cohesion: 0.33
Nodes (5): Module vs Pack, Platform Terms, Tenancy Terms, Terminology, VEDA Terms

### Community 225 - "VEDA Legacy Context"
Cohesion: 0.33
Nodes (5): Current Repo Reality, Migration Rule, Reusable Candidates, VEDA Legacy Context, VEDA-Specific Candidates

### Community 226 - "Dynamic Dashboard"
Cohesion: 0.33
Nodes (5): Blank Tenant Behavior, Current State, Dynamic Dashboard, Target Resolution Flow, Widget Contract

### Community 227 - "System Builder"
Cohesion: 0.33
Nodes (5): Current Status, Deployment Rules, Preview Requirements, System Builder, Target Flow

### Community 228 - "Client Portal"
Cohesion: 0.33
Nodes (5): Client Portal, Direct Access Rule, Empty Workspace, Portal Inputs, Portal Outputs

### Community 229 - "Brand System"
Cohesion: 0.33
Nodes (5): Brand Direction, Brand System, Module UI Rules, Tagline, UI Rules From AGENTS.md

### Community 230 - "UI System"
Cohesion: 0.33
Nodes (5): Controls & Interaction, Hero Metric Cards, Layout & Aesthetics, Responsiveness & Viewports, UI System

### Community 231 - "Data Model"
Cohesion: 0.33
Nodes (5): Current Core Reality, Data Model, Module-Owned Tables, Rule, Target Core Entities

### Community 232 - "Security"
Cohesion: 0.33
Nodes (5): Audit Requirement, Current Tools, Forbidden Patterns, Required Backend Checks, Security

### Community 233 - "Target Architecture"
Cohesion: 0.33
Nodes (6): Dynamic Shell, Empty Tenant, Module Boundary, Security Boundary, Target Architecture, Target Layers

### Community 234 - "Current Extraction Map"
Cohesion: 0.33
Nodes (5): Core Candidate, Current Extraction Map, Manufacturing Module Candidate, Quality Split Candidate, Restaurant Module Candidate

### Community 235 - "Future Modules"
Cohesion: 0.33
Nodes (5): Commercial, Future Modules, Operations, People, Vertical Modules

### Community 236 - "Immediate Priorities"
Cohesion: 0.33
Nodes (6): Immediate Priorities, P0: Dashboard Composition, P0: Make Module Disable Real, P0: Prove Blank Tenant, P1: Module SDK Pilot, P1: VEDA Extraction

### Community 237 - "AI And Agent Implementation Rules"
Cohesion: 0.33
Nodes (5): AI And Agent Implementation Rules, Before Editing, Common Failure, Completion Claims, Preferred Fix Shape

### Community 238 - "storage.ts"
Cohesion: 0.47
Nodes (3): CheckpointPhoto(), SpecFileInput(), uploadStorageImage()

### Community 239 - "Verity Principles"
Cohesion: 0.40
Nodes (5): Anti-Patterns, Decision Order For New Requirements, Engineering Principles, Product Principles, Verity Principles

### Community 240 - "Events And Workflows"
Cohesion: 0.40
Nodes (4): Current State, Event Principles, Events And Workflows, Workflow Principles

### Community 241 - "Module Lifecycle"
Cohesion: 0.40
Nodes (4): Custom Module Ownership, Module Lifecycle, States, Versioning

### Community 242 - "RBAC And Capability Authorization"
Cohesion: 0.40
Nodes (4): Backend Rules, Current Implementation, Legacy State, RBAC And Capability Authorization

### Community 243 - "Verity Core"
Cohesion: 0.40
Nodes (5): Core Does Not Own, Core Invariant, Core Owns, Current Code Anchors, Verity Core

### Community 244 - "Configuration vs Customization"
Cohesion: 0.40
Nodes (4): Client-Specific Code Requirements, Configuration vs Customization, Decision Ladder, Examples

### Community 245 - "System Templates"
Cohesion: 0.40
Nodes (4): Example, Rule, System Templates, Template Contents

### Community 246 - "Client Provisioning"
Cohesion: 0.40
Nodes (4): Client Provisioning, Current Code, Target Blank Tenant, Target Provisioning Flow

### Community 247 - "Module Library"
Cohesion: 0.40
Nodes (4): Module Library, Required Actions, Required Columns, Rule

### Community 248 - "Dynamic Navigation"
Cohesion: 0.40
Nodes (4): Blank Tenant, Dynamic Navigation, Resolution Flow, Rules

### Community 249 - "Kent's Module Map"
Cohesion: 0.40
Nodes (4): Candidate Modules, Configuration Areas, Kent's Module Map, Rule

### Community 250 - "Testing"
Cohesion: 0.40
Nodes (4): Blank Tenant Tests, Current Commands, Required Module Tests, Testing

### Community 251 - "Current State"
Cohesion: 0.40
Nodes (4): Built Or Partially Built, Current State, Not Complete, Source Audit

### Community 252 - "Verification Checklist"
Cohesion: 0.40
Nodes (4): Documentation Verification, Runtime/Behavior Verification, Static Verification, Verification Checklist

### Community 253 - "Verity Documentation"
Cohesion: 0.40
Nodes (5): Current Truth, Documentation Map, Non-Negotiable Rules, Read First, Verity Documentation

### Community 254 - "Admin Control Center"
Cohesion: 0.50
Nodes (3): Admin Control Center, Admin Responsibilities, Current Code

### Community 255 - "Role-Based Experience"
Cohesion: 0.50
Nodes (3): Examples, Principles, Role-Based Experience

### Community 256 - "Current Architecture"
Cohesion: 0.50
Nodes (4): Current Architecture, Current Gaps, Existing Platform Foundations, Stack

### Community 257 - "Client Implementations"
Cohesion: 0.50
Nodes (3): Client Implementations, Required Client Files, Rules

### Community 258 - "Verity PRDs"
Cohesion: 0.50
Nodes (4): Current State vs Target, Documents, PRD Rule, Verity PRDs

## Knowledge Gaps
- **1187 isolated node(s):** `extends`, `next/core-web-vitals`, `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-unused-vars`, `@next/next/no-img-element` (+1182 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **59 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getOwnerUser` connect `getOwnerUser` to `server/permissions.ts`, `owner.ts`, `AddMasterDataClient.tsx`, `pricing.ts`, `guardModuleWrite`, `itemsFromSpec.ts`, `ProjectDetailClient.tsx`, `packs.ts`, `ColumnStrip.tsx`, `seed-carxen.ts`, `queries/spec.ts`, `SpecStudioClient.tsx`, `getUserSession`, `guardModuleAction`, `hashPin`, `settings/client.tsx`, `booking/client.tsx`, `server/auth.ts`, `purchase.ts`, `resolve.ts`, `primitives.tsx`, `cn`, `DepartmentsClient.tsx`, `jobCardAdapter.ts`, `toast.tsx`, `bomTemplates.ts`, `production/client.tsx`, `SpecDataGrid.tsx`, `seed.ts`, `actions/scheduling.ts`, `events.ts`, `orders.ts`, `ItemsTree.tsx`, `ChecklistBuilder.tsx`, `ItemUnitsEditor.tsx`, `actions/projects.ts`, `customers.ts`, `worker/layout.tsx`, `locations.ts`, `actions/billing.ts`, `integrations.ts`, `onboarding/page.tsx`, `specFields.ts`, `ItemSearchInput.tsx`, `retype.ts`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `hq.ts`, `owner.ts`, `actions/stages.ts`, `ProjectDetailClient.tsx`, `prisma.ts`, `hashPin`, `getUserSession`, `settings/client.tsx`, `owner-shell.tsx`, `server/auth.ts`, `primitives.tsx`, `getActiveSessionUser`, `jobCardAdapter.ts`, `toast.tsx`, `ItemsTree.tsx`, `VariantDescInput.tsx`, `markdown.ts`, `OrderReviewDossier.tsx`, `onboarding/page.tsx`, `ItemSearchInput.tsx`, `language-provider.tsx`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `getUserSession()` connect `getUserSession` to `getOwnerUser`, `language-provider.tsx`, `server/auth.ts`, `actions/scheduling.ts`, `owner.ts`, `actions/stages.ts`, `ChecklistBuilder.tsx`, `getActiveSessionUser`, `AddMasterDataClient.tsx`, `jobCardAdapter.ts`, `prisma.ts`, `worker/layout.tsx`, `phoneKey`, `qc-video.ts`, `assignments.ts`, `history.ts`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `extends`, `next/core-web-vitals`, `@typescript-eslint/no-explicit-any` to the rest of the system?**
  _1187 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `getOwnerUser` be split into smaller, more focused modules?**
  _Cohesion score 0.0853302162478083 - nodes in this community are weakly interconnected._
- **Should `00000000000000_baseline/migration.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.0526006464883926 - nodes in this community are weakly interconnected._
- **Should `20260727000000_init/migration.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.051791629027401385 - nodes in this community are weakly interconnected._