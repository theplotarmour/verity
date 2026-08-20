# Graph Report - verity  (2026-08-20)

## Corpus Check
- 477 files · ~352,401 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2654 nodes · 6353 edges · 226 communities (139 shown, 87 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.6)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b7a97063`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- masterData.ts
- 00000000000000_baseline/migration.sql
- 20260727000000_init/migration.sql
- actions/helpdesk.ts
- hashPin
- hq.ts
- owner.ts
- Product Readiness Audit: Verity Composable Operating Platform
- hasModule
- pricing.ts
- guardModuleWrite
- orderItemResolver.ts
- BillingClient.tsx
- packs.ts
- ProjectDetailClient.tsx
- context.ts
- registry.ts
- WorkerSettingsClient.tsx
- ModuleKey
- entitlements.ts
- seed-carxen.ts
- allModules
- 2. Immediate Priorities: Cleansing & Core Furnishing
- Phase A: Composable Platform Alpha — **built**
- getUserSession
- guardModuleAction
- upload.ts
- primitives.tsx
- owner-shell.tsx
- booking/client.tsx
- 3. The Four Worlds UX Shells
- "Product"
- actions/booking.ts
- descriptor.ts
- server/auth.ts
- getOwnerUser
- bom-mode.ts
- seed_demo_items.mts
- reactions.ts
- FacilityManagementDashboard.tsx
- cn
- Architecture Manifesto
- DepartmentsClient.tsx
- provision.ts
- actions/portal.ts
- dashboard.test.ts
- schema.ts
- InventoryClient.tsx
- seed.ts
- bootstrap_seed.mjs
- EvidenceLightbox.tsx
- lib/types.ts
- phoneKey
- domains.ts
- integrations.ts
- mock_seed.mjs
- verify-seed.mts
- actions/scheduling.ts
- events.ts
- devDependencies
- live-bus.ts
- orders.ts
- book/client.tsx
- FactoryFeed.tsx
- Verity User Guide
- groq-sdk
- dependencies
- worker/layout.tsx
- assistant/route.ts
- anomalies.ts
- scripts
- actions/auth.ts
- backfill_fabric_answers.mts
- itemUnits.ts
- backfill_item_blueprints.mts
- rebuild_item_blueprints.mts
- Documentation Pillars
- compilerOptions
- seed_designs.ts
- markdown.ts
- gen_rls_migration.mjs
- Input
- "Blueprint"
- "BlueprintRouteStep"
- "BlueprintVersion"
- guard-coverage.test.ts
- "BOM"
- "BomContribution"
- "BOMItem"
- backfill-role-permissions.ts
- "CheckpointSubmission"
- "FactoryDocument"
- prisma.ts
- "ImageEvidence"
- language-provider.tsx
- "Inspection"
- tenant-isolation.test.ts
- enrich_seed.ts
- seed_all_specs.mjs
- seed_plotarmour.mjs
- "ItemBomOverride"
- "_ItemGroupDefaultChecklist"
- rules
- generate_verity_docs.py
- "ItemMaster"
- enrich_usage.ts
- 3. Generative Role-Specific UX Layer (The Four Worlds)
- write-guard.test.ts
- package.json
- vercel.json
- repair-legacy-pin-hashes.ts
- "JobCard"
- worker/page.tsx
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
- "ProductionPlan"
- Semantic Theme Tokens
- dayjs
- "QualityApproval"
- eslint.config.mjs
- bus.ts
- @fontsource/noto-sans-devanagari
- actions/notifications.ts
- gsap
- Verity — Claude Code Project Memory
- BookingWidgets.tsx
- "QualityReport"
- next
- next-themes
- "ReworkRecord"
- "StageEntry"
- "WorkOrder"
- react
- internal/portal.ts
- @sentry/nextjs
- tally/route.ts
- assistantTools.ts
- tailwindcss-animate
- @types/papaparse
- Customer Portal Specification (B2C World 1)
- getActiveSessionUser
- VerityLogo.tsx
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
- useLanguage
- OrderSpecCard.tsx
- @aws-sdk/s3-request-presigner
- app icon.png
- Original MasterSheetView snapshot
- Item tree root groups snippet
- CustomersTree.tsx
- "Product"
- "Supplier"
- "Warehouse"
- clsx
- framer-motion
- inngest
- serwist
- @supabase/ssr
- "User"

## God Nodes (most connected - your core abstractions)
1. `getOwnerUser` - 288 edges
2. `guardModuleWrite()` - 110 edges
3. `cn()` - 80 edges
4. `guardModuleAction()` - 68 edges
5. `Button()` - 52 edges
6. `getUserSession()` - 48 edges
7. `guardModulePage()` - 44 edges
8. `ModuleKey` - 43 edges
9. `hasModule()` - 42 edges
10. `Input()` - 36 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `hashPin()`  [EXTRACTED]
  scripts/onboard_jmd_impex.ts → src/lib/server/hash.ts
- `Trial` --references--> `ModuleKey`  [EXTRACTED]
  scripts/provision-trial.ts → src/platform/modules/registry.ts
- `describeSpecDetails()` --indirect_call--> `v()`  [INFERRED]
  src/lib/server/specUtils.ts → scripts/seed_all_specs.mjs
- `main()` --calls--> `allModules()`  [EXTRACTED]
  scripts/setup-operator-org.ts → src/platform/modules/registry.ts
- `main()` --calls--> `withDependencies()`  [EXTRACTED]
  scripts/setup-operator-org.ts → src/platform/modules/registry.ts

## Import Cycles
- 3-file cycle: `src/platform/modules/definitions/projects.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/projects.ts`
- 3-file cycle: `src/platform/modules/definitions/sites.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/sites.ts`
- 3-file cycle: `src/platform/modules/definitions/inventory.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/inventory.ts`
- 3-file cycle: `src/platform/modules/definitions/assets.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/assets.ts`
- 3-file cycle: `src/platform/modules/definitions/billing.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/billing.ts`
- 3-file cycle: `src/platform/modules/definitions/booking.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/booking.ts`
- 3-file cycle: `src/platform/modules/definitions/catalog.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/catalog.ts`
- 3-file cycle: `src/platform/modules/definitions/core.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/core.ts`
- 3-file cycle: `src/platform/modules/definitions/crm.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/crm.ts`
- 3-file cycle: `src/platform/modules/definitions/finance.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/finance.ts`
- 3-file cycle: `src/platform/modules/definitions/helpdesk.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/helpdesk.ts`
- 3-file cycle: `src/platform/modules/definitions/hr.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/hr.ts`
- 3-file cycle: `src/platform/modules/definitions/procurement.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/procurement.ts`
- 3-file cycle: `src/platform/modules/definitions/quality.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/quality.ts`
- 3-file cycle: `src/platform/modules/definitions/sales.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/sales.ts`
- 3-file cycle: `src/platform/modules/definitions/scheduling.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/scheduling.ts`

## Communities (226 total, 87 thin omitted)

### Community 0 - "masterData.ts"
Cohesion: 0.05
Nodes (74): Category, emptyForm(), Field(), FieldDef, Form, Item, ItemsTree(), DEFAULT_MATERIAL_CATEGORY (+66 more)

### Community 1 - "00000000000000_baseline/migration.sql"
Cohesion: 0.05
Nodes (82): "Agreement", "Approval", "Attachment", "AttendanceLog", "AuditLog", "BinBalance", "Blueprint", "BlueprintRouteStep" (+74 more)

### Community 2 - "20260727000000_init/migration.sql"
Cohesion: 0.05
Nodes (81): "Agreement", "Approval", "Attachment", "AttendanceLog", "AuditLog", "BinBalance", "Blueprint", "BlueprintRouteStep" (+73 more)

### Community 3 - "actions/helpdesk.ts"
Cohesion: 0.11
Nodes (28): Comment, STATUSES, Ticket, TicketDetailClient(), WorkOrder, Job, timeFmt, addTicketComment() (+20 more)

### Community 4 - "hashPin"
Cohesion: 0.12
Nodes (35): main(), prisma, STAGES, SettingsClient(), OwnerSettingsPage(), PermissionMatrixCard(), ROLE_LABELS, ROLES (+27 more)

### Community 5 - "hq.ts"
Cohesion: 0.09
Nodes (45): BLANK, Client, ClientsClient(), Issued, Pack, Brand, Factory, Module (+37 more)

### Community 6 - "owner.ts"
Cohesion: 0.09
Nodes (37): AssetDetailPage(), AssetsPage(), InvoiceDetailPage(), TicketDetailPage(), HelpdeskPage(), Item, ItemLabelSheet(), InventoryLabelsPage() (+29 more)

### Community 7 - "Product Readiness Audit: Verity Composable Operating Platform"
Cohesion: 0.10
Nodes (20): 1. Product Maturity Dashboard, 1. The Manager Test, 2. Module Operational Gap Matrix, 2. The Deskless Worker Test, 3. Deep-Dive Module Gaps, 3. The B2C Customer Test, 4. Platform Engine & Control Plane Gaps, 5. The Composable System Test Protocol (+12 more)

### Community 8 - "hasModule"
Cohesion: 0.22
Nodes (18): BillingPage(), DraftInvoiceInput, draftServiceInvoice(), LineItemInput, priceLines(), round2(), hasModule(), buildInvoiceFromWork() (+10 more)

### Community 9 - "pricing.ts"
Cohesion: 0.09
Nodes (36): TenantBillingPage(), ChargeLine, GeneratedInvoice, generateInvoice(), intendedLines(), monthPeriod(), nextInvoiceNumber(), PLATFORM_LINE (+28 more)

### Community 10 - "guardModuleWrite"
Cohesion: 0.11
Nodes (45): ProjectDetailClient(), createWithDocNumber(), formatDocNumber(), guardModuleWrite(), AssetInput, createAsset(), createMaintenanceSchedule(), deleteAsset() (+37 more)

### Community 11 - "orderItemResolver.ts"
Cohesion: 0.50
Nodes (3): prisma, OrderSpec, resolveOrderItem()

### Community 12 - "BillingClient.tsx"
Cohesion: 0.06
Nodes (78): AssetRow, AssetsClient(), BLANK, STATUSES, Asset, AssetDetailClient(), Log, Schedule (+70 more)

### Community 13 - "packs.ts"
Cohesion: 0.11
Nodes (28): checkDashboardRouting(), fail(), main(), pass(), prisma, reportIngestCoverage(), ROUTE, DASHBOARDS (+20 more)

### Community 14 - "ProjectDetailClient.tsx"
Cohesion: 0.11
Nodes (13): BLANK_TASK, BLANK_TIME, PRIORITIES, Project, PROJECT_STATUSES, Tab, TABS, TASK_STATUSES (+5 more)

### Community 16 - "registry.ts"
Cohesion: 0.12
Nodes (20): assetsModule, billingModule, bookingModule, catalogModule, coreModule, crmModule, financeModule, helpdeskModule (+12 more)

### Community 17 - "WorkerSettingsClient.tsx"
Cohesion: 0.35
Nodes (7): WorkerSettingsClient(), NotificationPrefsCard(), changeOwnPin(), getNotificationSettings(), supportedLanguages, updateNotificationSettings(), updateUserLanguage()

### Community 18 - "ModuleKey"
Cohesion: 0.09
Nodes (26): hashPin(), main(), prisma, Trial, TRIALS, CLIENT_OWNER, hashPin(), main() (+18 more)

### Community 19 - "entitlements.ts"
Cohesion: 0.10
Nodes (41): entitledModules(), main(), prisma, OnboardingPage(), OwnerDashboard(), OwnerLayout(), OnboardingWizard(), Suggestion (+33 more)

### Community 20 - "seed-carxen.ts"
Cohesion: 0.11
Nodes (42): cleanStructure(), COLOURS, created, Ctx, CUSTOMERS, DEFAULT_ROUTE, DEPARTMENTS, DESIGNS (+34 more)

### Community 21 - "allModules"
Cohesion: 0.25
Nodes (15): isLegacyPermissionActive(), isRegistryPermissionActive(), LEGACY_PERMISSION_MODULE, legacyPermissionModule(), registryPermissionModule(), ScopedPermissionGroup, scopedPermissionGroups(), scopedPermissionKeys() (+7 more)

### Community 22 - "2. Immediate Priorities: Cleansing & Core Furnishing"
Cohesion: 0.17
Nodes (11): 1. Accomplished Phases, 2. Immediate Priorities: Cleansing & Core Furnishing, 3. Future Module Expansions, Development & Product Roadmaps, Phase 1: Composable Platform Base, Phase 2: Decoupled Workflow Bus, Phase 3: Global Glassmorphic UI, Task 1: Manufacturing Purge — **done** (+3 more)

### Community 23 - "Phase A: Composable Platform Alpha — **built**"
Cohesion: 0.10
Nodes (19): 1. User Review Required, 2. Proposed Changes, 3. Verification Plan, Composable System Tests, Implementation Plan — Complete Launch Ready State, [MODIFY] [HQ builder](file:///D:/Code/verity/src/app/verity/clients/[id]/ClientDetailClient.tsx), [MODIFY] [module resolver](file:///D:/Code/verity/src/platform/modules/registry.ts), [MODIFY] [worker dashboard](file:///D:/Code/verity/src/app/worker/page.tsx) (+11 more)

### Community 24 - "getUserSession"
Cohesion: 0.17
Nodes (16): dynamic, GET(), runtime, GET(), POST(), getUserSession(), addCheckpointAction(), addSectionAction() (+8 more)

### Community 25 - "guardModuleAction"
Cohesion: 0.13
Nodes (26): InventoryClient(), InventoryPage(), STOCK_STATUS_FIELD, STOCK_STATUS_LABEL, STOCK_STATUSES, StockStatus, guardModuleAction(), createDispatch() (+18 more)

### Community 26 - "upload.ts"
Cohesion: 0.14
Nodes (15): StorageDiagnosticsPage(), STORAGE_ALLOWED_EXTENSIONS, STORAGE_ALLOWED_MIME_TYPES, STORAGE_BUCKET, STORAGE_MAX_BYTES, VIDEO_ALLOWED_EXTENSIONS, VIDEO_ALLOWED_MIME_TYPES, VIDEO_MAX_BYTES (+7 more)

### Community 27 - "primitives.tsx"
Cohesion: 0.06
Nodes (26): Checkpoint, Inspection, ServiceInspectionClient(), ApiKey, Delivery, Endpoint, AddEmployeeForm(), RemoveEmployeeButton() (+18 more)

### Community 28 - "owner-shell.tsx"
Cohesion: 0.12
Nodes (24): AssistantPanel(), Message, MobileTab(), NAV_ICONS, NotificationItem, OwnerShell(), ShellNavItem, withIcon() (+16 more)

### Community 29 - "booking/client.tsx"
Cohesion: 0.14
Nodes (17): BookingCard(), BookingClient(), dateFmt, dayKeyFmt, instantOf(), keyOf(), NewBookingSheet(), shiftKey() (+9 more)

### Community 30 - "3. The Four Worlds UX Shells"
Cohesion: 0.20
Nodes (9): 1. Customer Portal (Mobile-First White-Label), 1. Glassmorphism Tokens & Contrast Rules, 2. Employee Shell (Action-First Deskless), 2. Layout Geometry, 3. Owner/Manager Shell (Command Center), 3. The Four Worlds UX Shells, 4. Verity HQ Admin Portal (Control Plane), Design System Guide (+1 more)

### Community 31 - ""Product""
Cohesion: 0.25
Nodes (8): "BinBalance", "MaterialReservation", "Product", "PurchaseOrderItem", "SalesOrder", "SalesOrderItem", "StockLedgerEntry", "UOMConversion"

### Community 32 - "actions/booking.ts"
Cohesion: 0.19
Nodes (14): BookingPage(), APPOINTMENT_STATUSES, bookingDayRange(), bookingWeekRange(), istDayStart(), LIVE_APPOINTMENT_STATUSES, ActionResult, appointmentsInRange() (+6 more)

### Community 33 - "descriptor.ts"
Cohesion: 0.08
Nodes (26): contrast(), CSS, relativeLuminance(), token(), DescriptorSpec, DescriptorValues, FieldSpec, FieldValue (+18 more)

### Community 34 - "server/auth.ts"
Cohesion: 0.17
Nodes (12): POST(), clearUserSession(), createUserSession(), decrypt(), encodedKey, encrypt(), getUserSessionFromRequest(), SessionPayload (+4 more)

### Community 35 - "getOwnerUser"
Cohesion: 0.13
Nodes (31): PurchasePage(), PurchaseClient(), ServiceWorkOrdersPage(), EmployeeProfilePage(), getOwnerUser, getServiceWorkOrdersData(), approveSalesOrder(), getMasterData() (+23 more)

### Community 36 - "bom-mode.ts"
Cohesion: 0.36
Nodes (6): bomEnabled(), BomModeNode, BomModeValue, DEFAULT_BOM_MODE, resolveBomModeFromTree(), tree

### Community 38 - "reactions.ts"
Cohesion: 0.24
Nodes (19): emitEvent(), ownerRecipients(), EventPayload, appointmentInvoiceMarker(), AppointmentPayload, auditAppointment(), billAppointment(), billWorkOrder() (+11 more)

### Community 39 - "FacilityManagementDashboard.tsx"
Cohesion: 0.24
Nodes (10): FacilityManagementDashboard(), BarRow(), FunnelStage, hoursLabel(), Nothing(), Panel(), StatRow(), Tone (+2 more)

### Community 40 - "cn"
Cohesion: 0.06
Nodes (36): TeamClient(), UserWithStats, Table, TableBody, TableCell, TableHead, TableHeader, TableRow (+28 more)

### Community 41 - "Architecture Manifesto"
Cohesion: 0.29
Nodes (6): 1. Composable Module Pattern, 2. Decoupled Event Bus Workflows, 3. Tenancy & Isolation Scoping, Architecture Manifesto, Composition Rules, Static Registrations

### Community 42 - "DepartmentsClient.tsx"
Cohesion: 0.14
Nodes (21): DepartmentModal(), DepartmentsClient(), Dept, Member, ROSTER_ROLES, RosterModal(), Template, UserRow (+13 more)

### Community 43 - "provision.ts"
Cohesion: 0.22
Nodes (15): GET(), hashPassword(), GET(), requireMaintenanceToken(), DEFAULT_MODULES, ProvisionResult, provisionTenant(), ROLE_LABELS (+7 more)

### Community 44 - "actions/portal.ts"
Cohesion: 0.21
Nodes (15): BookedRange, DEFAULT_SLOT_RULES, freeSlots(), isSlotFree(), istWallClock(), normaliseSlotRules(), SlotRules, at() (+7 more)

### Community 45 - "dashboard.test.ts"
Cohesion: 0.50
Nodes (4): ALL_MODULES, permissive, allDashboardWidgets(), resolveDashboardWidgets()

### Community 47 - "schema.ts"
Cohesion: 0.33
Nodes (7): CsvField, csvHeader(), csvOptionSheet(), csvSampleRow(), FIXED, parseCsvRow(), fields

### Community 48 - "InventoryClient.tsx"
Cohesion: 0.07
Nodes (25): NewLocation(), STOCK_MODAL_COPY, StockModalType, Tab, TABS, FreeTextInput(), ItemCombobox(), Props (+17 more)

### Community 49 - "seed.ts"
Cohesion: 0.28
Nodes (7): BlueprintSeed, CODE_PREFIX, codeCounters, hashPin(), main(), prisma, seedItemGroups()

### Community 50 - "bootstrap_seed.mjs"
Cohesion: 0.09
Nodes (15): colorNames, customerNames, DEFAULT_DEPARTMENTS, designSpec, ensureVariant(), fabricItems, firstNames, item() (+7 more)

### Community 52 - "lib/types.ts"
Cohesion: 0.08
Nodes (24): AppData, AssignmentDraft, AssignmentStatus, AuditLog, BootstrapPayload, Checkpoint, CheckpointResponse, Customer (+16 more)

### Community 53 - "phoneKey"
Cohesion: 0.18
Nodes (14): main(), prisma, HqLayout(), parsePhoneList(), phoneKey(), samePhone(), allowlist(), Denial (+6 more)

### Community 54 - "domains.ts"
Cohesion: 0.50
Nodes (3): MASTER_DATA_DOMAIN_LABELS, MASTER_DATA_DOMAINS, MasterDataDomainId

### Community 55 - "integrations.ts"
Cohesion: 0.06
Nodes (64): dynamic, handled(), POST(), runtime, dynamic, json(), POST(), runtime (+56 more)

### Community 56 - "mock_seed.mjs"
Cohesion: 0.11
Nodes (13): colorNames, customerNames, designSpec, ensureVariant(), fabricItems, firstNames, item(), lastNames (+5 more)

### Community 58 - "actions/scheduling.ts"
Cohesion: 0.21
Nodes (16): SchedulingPage(), isoDay(), SchedulingClient(), dynamic, WorkerSchedulePage(), copyWeek(), deleteSchedule(), getMySchedule() (+8 more)

### Community 59 - "events.ts"
Cohesion: 0.25
Nodes (7): escapeHtml(), EventKey, EVENTS, Prefs, sendEmail(), sendWhatsApp(), WHATSAPP_EVENTS

### Community 60 - "devDependencies"
Cohesion: 0.07
Nodes (27): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, @playwright/test, prisma, tailwindcss (+19 more)

### Community 61 - "live-bus.ts"
Cohesion: 0.50
Nodes (4): channel(), g, LiveChange, subscribeChange()

### Community 62 - "orders.ts"
Cohesion: 0.16
Nodes (16): publishChange(), salesOrderInclude, toLegacyOrder(), Db, DEFAULT_STAGES, recordTimeline(), allocateFinishedStock(), assessOnOrderStock() (+8 more)

### Community 63 - "book/client.tsx"
Cohesion: 0.15
Nodes (9): BookClient(), dayKeyFmt, dayLabelFmt, labelOf(), nextDays(), Service, Staff, Step (+1 more)

### Community 65 - "Verity User Guide"
Cohesion: 0.33
Nodes (6): Module Entitlements, Phone + 4-digit PIN login, Site, Verity Platform, Verity README, Verity User Guide

### Community 67 - "dependencies"
Cohesion: 0.07
Nodes (29): @aws-sdk/client-s3, @fontsource/inter, idb, jose, lucide-react, dependencies, @aws-sdk/client-s3, @fontsource/inter (+21 more)

### Community 68 - "worker/layout.tsx"
Cohesion: 0.06
Nodes (33): contentType, size, contrastOn(), PortalLayout(), contentType, size, metadata, viewport (+25 more)

### Community 69 - "assistant/route.ts"
Cohesion: 0.24
Nodes (13): POST(), SYSTEM_PROMPT, ASSISTANT_TOKEN_CAP, BudgetVerdict, checkAssistantBudget(), recordAssistantTokens(), contextToPrompt(), assistantToolSpecs() (+5 more)

### Community 70 - "anomalies.ts"
Cohesion: 0.12
Nodes (19): GET(), dynamic, GET(), runtime, dynamic, GET(), runtime, Anomaly (+11 more)

### Community 71 - "scripts"
Cohesion: 0.12
Nodes (16): scripts, build, build:analyze, db:migrate, db:reset, db:sync, dev, lint (+8 more)

### Community 72 - "actions/auth.ts"
Cohesion: 0.28
Nodes (9): HomeClient(), TAP_SPRING, HomePage(), legacyHashPin(), getSessionDepartment(), getSessionHomePath(), signingSecret(), authenticateUser() (+1 more)

### Community 74 - "itemUnits.ts"
Cohesion: 0.27
Nodes (8): NormalisedUnits, normaliseUnit(), normaliseUnits(), UnitInput, getItemUnits(), ItemUnits, listUsedUnits(), setItemUnits()

### Community 77 - "Documentation Pillars"
Cohesion: 0.20
Nodes (9): 1. [Platform Core Specification](file:///D:/Code/verity/docs/00-foundation/verity_platform_specification.md), 2. [Architecture Manifesto](file:///D:/Code/verity/docs/01-architecture/manifesto.md), 3. [Design System Guide](file:///D:/Code/verity/docs/02-design/design_system.md), 4. [Development & Product Roadmaps](file:///D:/Code/verity/docs/03-roadmap/roadmaps.md), 5. [Customer Portal Specification](file:///D:/Code/verity/docs/00-foundation/customer_portal_specification.md), 6. [Product Readiness Audit](file:///D:/Code/verity/docs/product_readiness_audit.md), 7. [Launch Implementation Plan](file:///D:/Code/verity/docs/implementation_plan.md), Documentation Pillars (+1 more)

### Community 78 - "compilerOptions"
Cohesion: 0.06
Nodes (34): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+26 more)

### Community 79 - "seed_designs.ts"
Cohesion: 0.16
Nodes (13): BOM_BY_FAMILY, CATALOGUE, CODE_PREFIX, COMMON_FINISHING, FABRIC_CONSUMPTION, ItemSpec, Line, main() (+5 more)

### Community 81 - "markdown.ts"
Cohesion: 0.22
Nodes (11): Contents(), GuideClient(), GuidePage(), metadata, escapeHtml(), GuideHeading, inline(), isTableDivider() (+3 more)

### Community 83 - "gen_rls_migration.mjs"
Cohesion: 0.21
Nodes (11): byName, counts, emit(), models, out, p(), parentLink(), parentLinkShallow() (+3 more)

### Community 84 - "Input"
Cohesion: 0.15
Nodes (8): MemberWithStats, PageHeader(), Sheet(), Surface(), CustomerOption, OrderFlow(), Badge(), Input()

### Community 88 - "guard-coverage.test.ts"
Cohesion: 0.24
Nodes (8): ACTION_FILES, ACTIONS_DIR, OWNER_DIR, PAGES, ACTION_OWNERSHIP, Ownership, requiresGuard(), ROUTE_OWNERSHIP

### Community 92 - "backfill-role-permissions.ts"
Cohesion: 0.25
Nodes (6): APPLY, prisma, AMBIGUOUS, RegistryKey, ROLE_REGISTRY_GRANTS, WITHHELD

### Community 95 - "prisma.ts"
Cohesion: 0.09
Nodes (20): CatalogPage(), POOL_LIMIT, pooledUrl(), prismaClientSingleton(), ActionResult, CatalogRow, CatalogUpdate, getCatalog() (+12 more)

### Community 97 - "language-provider.tsx"
Cohesion: 0.19
Nodes (12): dynamic, WorkerProfilePage(), LogoutButton(), LanguageContext, LanguageContextValue, LanguageProvider(), SectionHeading(), dictionaries (+4 more)

### Community 99 - "tenant-isolation.test.ts"
Cohesion: 0.28
Nodes (8): ACTIONS_DIR, argumentBlock(), Call, GUARDED_FILES, modelsWithFactoryId(), SCHEMA, SCOPE_OPENING, scopeOpeningCalls()

### Community 100 - "enrich_seed.ts"
Cohesion: 0.32
Nodes (7): CATALOGUE, CODE_PREFIX, ItemSpec, main(), nextCode(), prisma, uniqueSku()

### Community 101 - "seed_all_specs.mjs"
Cohesion: 0.17
Nodes (8): groupIds, o(), prisma, SPECS, v(), describeSpecDetails(), resolveText(), SpecDetail

### Community 102 - "seed_plotarmour.mjs"
Cohesion: 0.29
Nodes (7): DEPARTMENTS, GRANTS, hashPin(), main(), MODULES, prisma, ROLE_LABELS

### Community 105 - "rules"
Cohesion: 0.29
Nodes (6): extends, rules, @next/next/no-img-element, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, next/core-web-vitals

### Community 106 - "generate_verity_docs.py"
Cohesion: 0.48
Nodes (6): Path, build_docs(), dedent(), main(), reset_docs(), write()

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

### Community 115 - "worker/page.tsx"
Cohesion: 0.19
Nodes (12): JobClient(), dynamic, WorkerJobPage(), dayFmt, dayKeyFmt, dynamic, PRIORITY_STYLE, timeFmt (+4 more)

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

### Community 153 - "bus.ts"
Cohesion: 0.24
Nodes (10): __clearListeners(), emit(), EmitResult, EventListener, listenerCount(), on(), PlatformEvent, Registration (+2 more)

### Community 155 - "actions/notifications.ts"
Cohesion: 0.22
Nodes (7): relativeTime(), WarningRow, WarningsQueue(), WARNINGS_QUEUE_LIMIT, dismissAllNotifications(), dismissNotification(), listUnreadWarnings()

### Community 157 - "Verity — Claude Code Project Memory"
Cohesion: 0.22
Nodes (8): Core Rules (always apply), Design System, graphify, Headless API Layer, Key Files, Skills active in this project, Verity — Claude Code Project Memory, What this is

### Community 158 - "BookingWidgets.tsx"
Cohesion: 0.21
Nodes (8): MenuClient(), MenuItem, CatalogClient(), timeFmt, UpcomingBookingsWidget(), WidgetProps, formatPaise(), createPortalOrder()

### Community 166 - "internal/portal.ts"
Cohesion: 0.33
Nodes (9): BookPortalPage(), dynamic, dynamic, MenuPortalPage(), getPortalStaff(), PortalTenant, publishedCatalog(), resolvePortalTenant() (+1 more)

### Community 168 - "tally/route.ts"
Cohesion: 0.38
Nodes (8): dynamic, GET(), runtime, csvField(), TALLY_COLUMNS, tallyDate(), TallyRow, toTallyCsv()

### Community 169 - "assistantTools.ts"
Cohesion: 0.25
Nodes (8): ASSISTANT_TOOLS, AssistantTool, BY_NAME, runAssistantTool(), stripTenantKeys(), TENANT_KEYS, TENANT_KEYS, ToolRunResult

### Community 172 - "Customer Portal Specification (B2C World 1)"
Cohesion: 0.22
Nodes (8): 1. White-Label Brand Engine, 2. Service Booking Flow (`/book`), 3. Digital Menu / Catalog Flow (`/menu`), 4. Database Schema Scoping, Customer Portal Specification (B2C World 1), Flow Steps:, Flow Steps:, Styling Alphas & Variables

### Community 173 - "getActiveSessionUser"
Cohesion: 0.36
Nodes (5): POST(), CheckpointPhoto(), getActiveSessionUser, StorageUploadInput, uploadStorageImage()

### Community 174 - "VerityLogo.tsx"
Cohesion: 0.31
Nodes (3): CircularMarqueeLoader(), CircularMarqueeLoaderProps, VerityLogo()

### Community 187 - "useLanguage"
Cohesion: 0.42
Nodes (6): useLanguage(), BottomNav(), BottomNavItem, BottomNavProps, InspectorNav(), WorkerNav()

### Community 207 - "CustomersTree.tsx"
Cohesion: 0.16
Nodes (18): BLANK, CustomerRow, CustomersClient(), CustomersPage(), Customer, CustomersTree(), emptyForm(), Field() (+10 more)

## Knowledge Gaps
- **760 isolated node(s):** `extends`, `next/core-web-vitals`, `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-unused-vars`, `@next/next/no-img-element` (+755 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **87 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getOwnerUser` connect `getOwnerUser` to `masterData.ts`, `actions/helpdesk.ts`, `hashPin`, `owner.ts`, `hasModule`, `pricing.ts`, `guardModuleWrite`, `BillingClient.tsx`, `packs.ts`, `entitlements.ts`, `getUserSession`, `guardModuleAction`, `upload.ts`, `primitives.tsx`, `booking/client.tsx`, `actions/booking.ts`, `DepartmentsClient.tsx`, `InventoryClient.tsx`, `integrations.ts`, `actions/scheduling.ts`, `orders.ts`, `worker/layout.tsx`, `actions/auth.ts`, `itemUnits.ts`, `CustomersTree.tsx`, `Input`, `prisma.ts`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `masterData.ts`, `hashPin`, `hq.ts`, `owner.ts`, `actions/auth.ts`, `actions/notifications.ts`, `BillingClient.tsx`, `VerityLogo.tsx`, `CustomersTree.tsx`, `useLanguage`, `markdown.ts`, `Input`, `primitives.tsx`, `owner-shell.tsx`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `ModuleKey` connect `ModuleKey` to `hashPin`, `hq.ts`, `assistant/route.ts`, `reactions.ts`, `owner.ts`, `assistantTools.ts`, `pricing.ts`, `provision.ts`, `internal/portal.ts`, `packs.ts`, `registry.ts`, `entitlements.ts`, `allModules`, `guard-coverage.test.ts`, `owner-shell.tsx`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `extends`, `next/core-web-vitals`, `@typescript-eslint/no-explicit-any` to the rest of the system?**
  _760 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `masterData.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.050140056022408966 - nodes in this community are weakly interconnected._
- **Should `00000000000000_baseline/migration.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.0526006464883926 - nodes in this community are weakly interconnected._
- **Should `20260727000000_init/migration.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.051791629027401385 - nodes in this community are weakly interconnected._