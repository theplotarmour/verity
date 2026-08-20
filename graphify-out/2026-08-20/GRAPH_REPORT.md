# Graph Report - verity  (2026-08-20)

## Corpus Check
- 458 files · ~339,382 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2514 nodes · 6071 edges · 215 communities (131 shown, 84 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.6)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2981d232`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- getOwnerUser
- 00000000000000_baseline/migration.sql
- 20260727000000_init/migration.sql
- outbox.ts
- hashPin
- hq.ts
- owner.ts
- ClientDetailClient.tsx
- ItemCombobox.tsx
- pricing.ts
- guardModuleWrite
- orderIngest.ts
- ServiceWorkOrdersClient.tsx
- packs.ts
- ProjectDetailClient.tsx
- prisma.ts
- registry.ts
- profile/page.tsx
- ModuleKey
- entitlements.ts
- seed-carxen.ts
- allModules
- 1. Accomplished Phases
- BillingClient.tsx
- getUserSession
- guardModuleAction
- getActiveSessionUser
- primitives.tsx
- owner-shell.tsx
- booking/client.tsx
- 3. The Four Worlds UX Shells
- "Product"
- serviceQuality.ts
- descriptor.ts
- server/auth.ts
- PurchaseClient.tsx
- bom-mode.ts
- seed_demo_items.mts
- reactions.ts
- FacilityManagementDashboard.tsx
- cn
- Architecture Manifesto
- actions/departments.ts
- seed-owner/route.ts
- Input
- dashboard.test.ts
- schema.ts
- InventoryClient.tsx
- seed.ts
- bootstrap_seed.mjs
- EvidenceLightbox.tsx
- lib/types.ts
- phoneKey
- domains.ts
- api-keys.ts
- mock_seed.mjs
- verify-seed.mts
- actions/scheduling.ts
- events.ts
- devDependencies
- live-bus.ts
- orders.ts
- ItemsTree.tsx
- FactoryFeed.tsx
- Verity User Guide
- groq-sdk
- dependencies
- worker/layout.tsx
- assistant/route.ts
- anomalies.ts
- scripts
- settings/client.tsx
- backfill_fabric_answers.mts
- itemUnits.ts
- backfill_item_blueprints.mts
- rebuild_item_blueprints.mts
- Documentation Pillars
- compilerOptions
- seed_designs.ts
- root-providers.tsx
- gen_rls_migration.mjs
- DepartmentsClient.tsx
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
- itemSearch.ts
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
- url-guard.ts
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
- shopify/route.ts
- gsap
- Verity — Claude Code Project Memory
- jose
- "QualityReport"
- next
- next-themes
- "ReworkRecord"
- "StageEntry"
- "WorkOrder"
- react
- @sentry/nextjs
- tailwindcss-animate
- @types/papaparse
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
- "Supplier"
- "Warehouse"
- clsx
- framer-motion
- inngest
- serwist
- @supabase/ssr
- "User"

## God Nodes (most connected - your core abstractions)
1. `getOwnerUser` - 283 edges
2. `guardModuleWrite()` - 108 edges
3. `cn()` - 80 edges
4. `guardModuleAction()` - 66 edges
5. `Button()` - 50 edges
6. `getUserSession()` - 44 edges
7. `guardModulePage()` - 42 edges
8. `ModuleKey` - 42 edges
9. `Input()` - 35 edges
10. `toast` - 33 edges

## Surprising Connections (you probably didn't know these)
- `entitledModules()` --calls--> `getModule()`  [EXTRACTED]
  scripts/backfill-role-grants.ts → src/platform/modules/registry.ts
- `entitledModules()` --calls--> `withDependencies()`  [EXTRACTED]
  scripts/backfill-role-grants.ts → src/platform/modules/registry.ts
- `main()` --calls--> `hashPin()`  [EXTRACTED]
  scripts/onboard_jmd_impex.ts → src/lib/server/hash.ts
- `Trial` --references--> `ModuleKey`  [EXTRACTED]
  scripts/provision-trial.ts → src/platform/modules/registry.ts
- `describeSpecDetails()` --indirect_call--> `v()`  [INFERRED]
  src/lib/server/specUtils.ts → scripts/seed_all_specs.mjs

## Import Cycles
- 3-file cycle: `src/platform/modules/definitions/booking.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/booking.ts`
- 3-file cycle: `src/platform/modules/definitions/core.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/core.ts`
- 3-file cycle: `src/platform/modules/definitions/projects.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/projects.ts`
- 3-file cycle: `src/platform/modules/definitions/procurement.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/procurement.ts`
- 3-file cycle: `src/platform/modules/definitions/crm.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/crm.ts`
- 3-file cycle: `src/platform/modules/definitions/billing.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/billing.ts`
- 3-file cycle: `src/platform/modules/definitions/quality.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/quality.ts`
- 3-file cycle: `src/platform/modules/definitions/assets.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/assets.ts`
- 3-file cycle: `src/platform/modules/definitions/finance.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/finance.ts`
- 3-file cycle: `src/platform/modules/definitions/helpdesk.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/helpdesk.ts`
- 3-file cycle: `src/platform/modules/definitions/hr.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/hr.ts`
- 3-file cycle: `src/platform/modules/definitions/inventory.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/inventory.ts`
- 3-file cycle: `src/platform/modules/definitions/sales.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/sales.ts`
- 3-file cycle: `src/platform/modules/definitions/scheduling.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/scheduling.ts`
- 3-file cycle: `src/platform/modules/definitions/sites.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/sites.ts`

## Communities (215 total, 84 thin omitted)

### Community 0 - "getOwnerUser"
Cohesion: 0.09
Nodes (52): EmployeeProfilePage(), DEFAULT_MATERIAL_CATEGORY, FABRIC_CATEGORY, itemsInRootCategory(), getOwnerUser, guardDelete(), addCatalogItem(), addColor() (+44 more)

### Community 1 - "00000000000000_baseline/migration.sql"
Cohesion: 0.05
Nodes (82): "Agreement", "Approval", "Attachment", "AttendanceLog", "AuditLog", "BinBalance", "Blueprint", "BlueprintRouteStep" (+74 more)

### Community 2 - "20260727000000_init/migration.sql"
Cohesion: 0.05
Nodes (81): "Agreement", "Approval", "Attachment", "AttendanceLog", "AuditLog", "BinBalance", "Blueprint", "BlueprintRouteStep" (+73 more)

### Community 3 - "outbox.ts"
Cohesion: 0.20
Nodes (13): dynamic, json(), POST(), runtime, validate(), touchApiKey(), backoffMs(), Client (+5 more)

### Community 4 - "hashPin"
Cohesion: 0.09
Nodes (46): main(), prisma, STAGES, SettingsClient(), IntegrationsClient(), OwnerIntegrationsPage(), OwnerSettingsPage(), PermissionMatrixCard() (+38 more)

### Community 5 - "hq.ts"
Cohesion: 0.14
Nodes (33): ClientsClient(), IntegrationsPanel(), HqClientDetailPage(), HqClientsPage(), requireHqAction(), provisionTenant(), systemRoleId(), acceptAgreement() (+25 more)

### Community 6 - "owner.ts"
Cohesion: 0.10
Nodes (36): AssetDetailPage(), AssetsPage(), InvoiceDetailPage(), BillingPage(), CustomersPage(), TicketDetailPage(), HelpdeskPage(), Item (+28 more)

### Community 7 - "ClientDetailClient.tsx"
Cohesion: 0.12
Nodes (22): BLANK, Client, Issued, Pack, Brand, ClientDetailClient(), Factory, Module (+14 more)

### Community 8 - "ItemCombobox.tsx"
Cohesion: 0.22
Nodes (10): FreeTextInput(), ItemCombobox(), Props, ItemSelect(), Props, ItemOption, AnchorRect, computeDropdownPlacement() (+2 more)

### Community 9 - "pricing.ts"
Cohesion: 0.09
Nodes (36): TenantBillingPage(), ChargeLine, GeneratedInvoice, generateInvoice(), intendedLines(), monthPeriod(), nextInvoiceNumber(), PLATFORM_LINE (+28 more)

### Community 10 - "guardModuleWrite"
Cohesion: 0.06
Nodes (79): ProjectDetailClient(), createWithDocNumber(), formatDocNumber(), DraftInvoiceInput, draftServiceInvoice(), LineItemInput, priceLines(), round2() (+71 more)

### Community 11 - "orderIngest.ts"
Cohesion: 0.27
Nodes (8): prisma, enqueueWebhook(), OrderSpec, resolveOrderItem(), ingestExternalOrder(), IngestResult, matchItemByName(), ingest()

### Community 12 - "ServiceWorkOrdersClient.tsx"
Cohesion: 0.06
Nodes (73): AssetRow, AssetsClient(), BLANK, STATUSES, Asset, AssetDetailClient(), Log, Schedule (+65 more)

### Community 13 - "packs.ts"
Cohesion: 0.13
Nodes (27): checkDashboardRouting(), fail(), main(), pass(), prisma, reportIngestCoverage(), ROUTE, PackSuggestion (+19 more)

### Community 14 - "ProjectDetailClient.tsx"
Cohesion: 0.11
Nodes (14): BLANK_TASK, BLANK_TIME, PRIORITIES, Project, PROJECT_STATUSES, Tab, TABS, TASK_STATUSES (+6 more)

### Community 15 - "prisma.ts"
Cohesion: 0.22
Nodes (4): POOL_LIMIT, pooledUrl(), prismaClientSingleton(), TenantContext

### Community 16 - "registry.ts"
Cohesion: 0.12
Nodes (20): assetsModule, billingModule, bookingModule, coreModule, crmModule, financeModule, helpdeskModule, hrModule (+12 more)

### Community 17 - "profile/page.tsx"
Cohesion: 0.20
Nodes (11): dynamic, WorkerProfilePage(), WorkerSettingsClient(), LogoutButton(), NotificationPrefsCard(), SectionHeading(), changeOwnPin(), getNotificationSettings() (+3 more)

### Community 18 - "ModuleKey"
Cohesion: 0.08
Nodes (28): entitledModules(), main(), prisma, hashPin(), main(), prisma, Trial, TRIALS (+20 more)

### Community 19 - "entitlements.ts"
Cohesion: 0.19
Nodes (23): Entry, inflight, invalidate(), store, disableModule(), enableModules(), entitledModules, requireModule() (+15 more)

### Community 20 - "seed-carxen.ts"
Cohesion: 0.11
Nodes (42): cleanStructure(), COLOURS, created, Ctx, CUSTOMERS, DEFAULT_ROUTE, DEPARTMENTS, DESIGNS (+34 more)

### Community 21 - "allModules"
Cohesion: 0.26
Nodes (14): isLegacyPermissionActive(), isRegistryPermissionActive(), LEGACY_PERMISSION_MODULE, legacyPermissionModule(), registryPermissionModule(), ScopedPermissionGroup, scopedPermissionGroups(), scopedPermissionKeys() (+6 more)

### Community 22 - "1. Accomplished Phases"
Cohesion: 0.18
Nodes (10): 1. Accomplished Phases, 2. Immediate Priorities: Cleansing & Core Furnishing, 3. Future Module Expansions, Development & Product Roadmaps, Phase 1: Composable Platform Base, Phase 2: Decoupled Workflow Bus, Phase 3: Global Glassmorphic UI, Task 1: Manufacturing Purge — **done** (+2 more)

### Community 23 - "BillingClient.tsx"
Cohesion: 0.22
Nodes (9): BillingClient(), BLANK_LINE, INVOICE_STATUSES, InvoiceRow, Line, monthBounds(), PAYROLL_STATUSES, PayrollRow (+1 more)

### Community 24 - "getUserSession"
Cohesion: 0.23
Nodes (13): GET(), POST(), getUserSession(), addCheckpointAction(), addSectionAction(), deleteCheckpointAction(), deleteQCTemplate(), deleteSectionAction() (+5 more)

### Community 25 - "guardModuleAction"
Cohesion: 0.15
Nodes (25): InventoryPage(), LogisticsClient(), LogisticsPage(), STOCK_STATUS_FIELD, STOCK_STATUS_LABEL, STOCK_STATUSES, StockStatus, guardModuleAction() (+17 more)

### Community 26 - "getActiveSessionUser"
Cohesion: 0.06
Nodes (35): dynamic, GET(), runtime, POST(), StorageDiagnosticsPage(), relativeTime(), WarningRow, WarningsQueue() (+27 more)

### Community 27 - "primitives.tsx"
Cohesion: 0.10
Nodes (14): BLANK, SiteRow, STATUSES, AddEmployeeForm(), RemoveEmployeeButton(), ResetPinButton(), LaunchOutletDialog(), Button() (+6 more)

### Community 28 - "owner-shell.tsx"
Cohesion: 0.11
Nodes (26): AssistantPanel(), Message, MobileTab(), NAV_ICONS, NotificationItem, OwnerShell(), ShellNavItem, withIcon() (+18 more)

### Community 29 - "booking/client.tsx"
Cohesion: 0.08
Nodes (39): BookingCard(), BookingClient(), dateFmt, dayKeyFmt, instantOf(), keyOf(), NewBookingSheet(), shiftKey() (+31 more)

### Community 30 - "3. The Four Worlds UX Shells"
Cohesion: 0.20
Nodes (9): 1. Customer Portal (Mobile-First White-Label), 1. Glassmorphism Tokens & Contrast Rules, 2. Employee Shell (Action-First Deskless), 2. Layout Geometry, 3. Owner/Manager Shell (Command Center), 3. The Four Worlds UX Shells, 4. Verity HQ Admin Portal (Control Plane), Design System Guide (+1 more)

### Community 31 - ""Product""
Cohesion: 0.25
Nodes (8): "BinBalance", "MaterialReservation", "Product", "PurchaseOrderItem", "SalesOrder", "SalesOrderItem", "StockLedgerEntry", "UOMConversion"

### Community 32 - "serviceQuality.ts"
Cohesion: 0.43
Nodes (6): ServiceInspectionPage(), getServiceInspection(), recordServiceCheckpoint(), resolveServiceInspection(), revalidateInspectionPaths(), submitServiceInspection()

### Community 33 - "descriptor.ts"
Cohesion: 0.08
Nodes (26): contrast(), CSS, relativeLuminance(), token(), DescriptorSpec, DescriptorValues, FieldSpec, FieldValue (+18 more)

### Community 34 - "server/auth.ts"
Cohesion: 0.12
Nodes (21): POST(), HomeClient(), TAP_SPRING, HomePage(), clearUserSession(), createUserSession(), decrypt(), encodedKey (+13 more)

### Community 35 - "PurchaseClient.tsx"
Cohesion: 0.14
Nodes (23): PurchasePage(), PurchaseClient(), approvePurchaseOrder(), confirmPurchaseDelivery(), createPurchaseOrder(), createSupplier(), deletePurchaseOrder(), deleteSupplier() (+15 more)

### Community 36 - "bom-mode.ts"
Cohesion: 0.36
Nodes (6): bomEnabled(), BomModeNode, BomModeValue, DEFAULT_BOM_MODE, resolveBomModeFromTree(), tree

### Community 38 - "reactions.ts"
Cohesion: 0.24
Nodes (19): emitEvent(), ownerRecipients(), EventPayload, appointmentInvoiceMarker(), AppointmentPayload, auditAppointment(), billAppointment(), billWorkOrder() (+11 more)

### Community 39 - "FacilityManagementDashboard.tsx"
Cohesion: 0.20
Nodes (12): FacilityManagementDashboard(), BarRow(), FunnelStage, hoursLabel(), Nothing(), Panel(), StatRow(), Tone (+4 more)

### Community 40 - "cn"
Cohesion: 0.06
Nodes (34): UserWithStats, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, FactoryActivityFeed() (+26 more)

### Community 41 - "Architecture Manifesto"
Cohesion: 0.29
Nodes (6): 1. Composable Module Pattern, 2. Decoupled Event Bus Workflows, 3. Tenancy & Isolation Scoping, Architecture Manifesto, Composition Rules, Static Registrations

### Community 42 - "actions/departments.ts"
Cohesion: 0.19
Nodes (16): DepartmentModal(), DepartmentsClient(), RosterModal(), DepartmentsPage(), Db, DEFAULT_DEPARTMENTS, DEFAULT_NAMES, ensureFactoryDepartments() (+8 more)

### Community 43 - "seed-owner/route.ts"
Cohesion: 0.52
Nodes (4): GET(), hashPassword(), GET(), requireMaintenanceToken()

### Community 44 - "Input"
Cohesion: 0.11
Nodes (13): ApiKey, Delivery, Endpoint, CustomerOption, Customer, Field(), Form, TAG_OPTIONS (+5 more)

### Community 45 - "dashboard.test.ts"
Cohesion: 0.50
Nodes (4): ALL_MODULES, permissive, allDashboardWidgets(), resolveDashboardWidgets()

### Community 47 - "schema.ts"
Cohesion: 0.33
Nodes (7): CsvField, csvHeader(), csvOptionSheet(), csvSampleRow(), FIXED, parseCsvRow(), fields

### Community 48 - "InventoryClient.tsx"
Cohesion: 0.08
Nodes (21): InventoryClient(), NewLocation(), STOCK_MODAL_COPY, StockModalType, Tab, TABS, ADJUSTMENT_TYPES, createDispatch() (+13 more)

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
Cohesion: 0.07
Nodes (30): main(), prisma, Contents(), GuideClient(), GuidePage(), metadata, OnboardingPage(), HqLayout() (+22 more)

### Community 54 - "domains.ts"
Cohesion: 0.50
Nodes (3): MASTER_DATA_DOMAIN_LABELS, MASTER_DATA_DOMAINS, MasterDataDomainId

### Community 55 - "api-keys.ts"
Cohesion: 0.24
Nodes (15): headers(), hashToken(), IssuedKey, issueKeyMaterial(), MAX_SKEW_SECONDS, safeEqual(), SignatureVerdict, signPayload() (+7 more)

### Community 56 - "mock_seed.mjs"
Cohesion: 0.11
Nodes (13): colorNames, customerNames, designSpec, ensureVariant(), fabricItems, firstNames, item(), lastNames (+5 more)

### Community 58 - "actions/scheduling.ts"
Cohesion: 0.19
Nodes (18): isoDay(), SchedulingClient(), dynamic, WorkerHome(), dynamic, WorkerSchedulePage(), getDictionary(), enforceRole() (+10 more)

### Community 59 - "events.ts"
Cohesion: 0.22
Nodes (8): escapeHtml(), EventKey, EVENTS, Prefs, sendEmail(), sendWhatsApp(), WHATSAPP_EVENTS, notifyLowStock()

### Community 60 - "devDependencies"
Cohesion: 0.07
Nodes (27): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, @playwright/test, prisma, tailwindcss (+19 more)

### Community 61 - "live-bus.ts"
Cohesion: 0.28
Nodes (7): dynamic, GET(), runtime, channel(), g, LiveChange, subscribeChange()

### Community 62 - "orders.ts"
Cohesion: 0.14
Nodes (18): publishChange(), salesOrderInclude, toLegacyOrder(), Db, DEFAULT_STAGES, recordTimeline(), allocateFinishedStock(), approveSalesOrder() (+10 more)

### Community 63 - "ItemsTree.tsx"
Cohesion: 0.09
Nodes (30): Category, emptyForm(), Field(), FieldDef, Form, Item, ItemsTree(), deriveItemType() (+22 more)

### Community 65 - "Verity User Guide"
Cohesion: 0.33
Nodes (6): Module Entitlements, Phone + 4-digit PIN login, Site, Verity Platform, Verity README, Verity User Guide

### Community 67 - "dependencies"
Cohesion: 0.07
Nodes (29): @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, @fontsource/inter, idb, lucide-react, dependencies, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner (+21 more)

### Community 68 - "worker/layout.tsx"
Cohesion: 0.11
Nodes (20): contentType, size, contentType, size, OwnerLayout(), WorkerLayout(), InstallPromptBanner(), AutoRefresh() (+12 more)

### Community 69 - "assistant/route.ts"
Cohesion: 0.12
Nodes (25): POST(), SYSTEM_PROMPT, ASSISTANT_TOKEN_CAP, BudgetVerdict, checkAssistantBudget(), recordAssistantTokens(), AssistantContext, buildAssistantContext() (+17 more)

### Community 70 - "anomalies.ts"
Cohesion: 0.14
Nodes (19): GET(), dynamic, GET(), runtime, dynamic, GET(), runtime, Anomaly (+11 more)

### Community 71 - "scripts"
Cohesion: 0.12
Nodes (16): scripts, build, build:analyze, db:migrate, db:reset, db:sync, dev, lint (+8 more)

### Community 72 - "settings/client.tsx"
Cohesion: 0.24
Nodes (6): ConfirmDialog(), ConfirmDialogProps, components, layouts, tokens, typography

### Community 74 - "itemUnits.ts"
Cohesion: 0.27
Nodes (8): NormalisedUnits, normaliseUnit(), normaliseUnits(), UnitInput, getItemUnits(), ItemUnits, listUsedUnits(), setItemUnits()

### Community 77 - "Documentation Pillars"
Cohesion: 0.29
Nodes (6): 1. [Platform Core Specification](file:///D:/Code/verity/docs/00-foundation/verity_platform_specification.md), 2. [Architecture Manifesto](file:///D:/Code/verity/docs/01-architecture/manifesto.md), 3. [Design System Guide](file:///D:/Code/verity/docs/02-design/design_system.md), 4. [Development & Product Roadmaps](file:///D:/Code/verity/docs/03-roadmap/roadmaps.md), Documentation Pillars, Verity Documentation Index

### Community 78 - "compilerOptions"
Cohesion: 0.06
Nodes (34): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+26 more)

### Community 79 - "seed_designs.ts"
Cohesion: 0.16
Nodes (13): BOM_BY_FAMILY, CATALOGUE, CODE_PREFIX, COMMON_FINISHING, FABRIC_CONSUMPTION, ItemSpec, Line, main() (+5 more)

### Community 81 - "root-providers.tsx"
Cohesion: 0.13
Nodes (12): metadata, viewport, InstallAction(), BeforeInstallPromptEvent, PwaContext, PwaContextValue, PwaProvider(), usePwa() (+4 more)

### Community 83 - "gen_rls_migration.mjs"
Cohesion: 0.21
Nodes (11): byName, counts, emit(), models, out, p(), parentLink(), parentLinkShallow() (+3 more)

### Community 84 - "DepartmentsClient.tsx"
Cohesion: 0.10
Nodes (12): Dept, Member, ROSTER_ROLES, Template, UserRow, MemberWithStats, TeamClient(), PageHeader() (+4 more)

### Community 88 - "guard-coverage.test.ts"
Cohesion: 0.24
Nodes (8): ACTION_FILES, ACTIONS_DIR, OWNER_DIR, PAGES, ACTION_OWNERSHIP, Ownership, requiresGuard(), ROUTE_OWNERSHIP

### Community 92 - "backfill-role-permissions.ts"
Cohesion: 0.25
Nodes (6): APPLY, prisma, AMBIGUOUS, RegistryKey, ROLE_REGISTRY_GRANTS, WITHHELD

### Community 95 - "itemSearch.ts"
Cohesion: 0.33
Nodes (4): countFinishedGoods(), ItemSearchResult, PRODUCIBLE_WHERE, searchFinishedGoods()

### Community 97 - "language-provider.tsx"
Cohesion: 0.19
Nodes (13): LanguageContext, LanguageContextValue, LanguageProvider(), useLanguage(), BottomNav(), BottomNavItem, BottomNavProps, InspectorNav() (+5 more)

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

### Community 115 - "url-guard.ts"
Cohesion: 0.54
Nodes (6): assertDeliverable(), checkWebhookUrl(), isBlockedAddress(), isBlockedIPv4(), isBlockedIPv6(), UrlVerdict

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
Cohesion: 0.18
Nodes (12): __clearListeners(), emit(), EmitResult, EventListener, listenerCount(), on(), PlatformEvent, Registration (+4 more)

### Community 155 - "shopify/route.ts"
Cohesion: 0.19
Nodes (14): dynamic, handled(), POST(), runtime, verifyShopifySignature(), IngestLine, attributes(), customerName() (+6 more)

### Community 157 - "Verity — Claude Code Project Memory"
Cohesion: 0.22
Nodes (8): Core Rules (always apply), Design System, graphify, Headless API Layer, Key Files, Skills active in this project, Verity — Claude Code Project Memory, What this is

### Community 207 - "customers.ts"
Cohesion: 0.20
Nodes (14): BLANK, CustomerRow, CustomersClient(), CustomersTree(), emptyForm(), row(), createCustomer(), CustomerInput (+6 more)

## Knowledge Gaps
- **697 isolated node(s):** `extends`, `next/core-web-vitals`, `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-unused-vars`, `@next/next/no-img-element` (+692 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **84 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getOwnerUser` connect `getOwnerUser` to `hashPin`, `owner.ts`, `pricing.ts`, `guardModuleWrite`, `packs.ts`, `BillingClient.tsx`, `getUserSession`, `guardModuleAction`, `getActiveSessionUser`, `primitives.tsx`, `booking/client.tsx`, `serviceQuality.ts`, `server/auth.ts`, `PurchaseClient.tsx`, `actions/departments.ts`, `InventoryClient.tsx`, `phoneKey`, `actions/scheduling.ts`, `events.ts`, `orders.ts`, `ItemsTree.tsx`, `worker/layout.tsx`, `itemUnits.ts`, `customers.ts`, `itemSearch.ts`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `language-provider.tsx`, `server/auth.ts`, `hashPin`, `owner.ts`, `ClientDetailClient.tsx`, `settings/client.tsx`, `ServiceWorkOrdersClient.tsx`, `Input`, `customers.ts`, `DepartmentsClient.tsx`, `phoneKey`, `getActiveSessionUser`, `primitives.tsx`, `owner-shell.tsx`, `ItemsTree.tsx`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `Button()` connect `primitives.tsx` to `PurchaseClient.tsx`, `hashPin`, `worker/layout.tsx`, `FacilityManagementDashboard.tsx`, `settings/client.tsx`, `cn`, `ServiceWorkOrdersClient.tsx`, `Input`, `ProjectDetailClient.tsx`, `InventoryClient.tsx`, `profile/page.tsx`, `root-providers.tsx`, `DepartmentsClient.tsx`, `BillingClient.tsx`, `actions/scheduling.ts`, `booking/client.tsx`, `ItemsTree.tsx`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `extends`, `next/core-web-vitals`, `@typescript-eslint/no-explicit-any` to the rest of the system?**
  _697 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `getOwnerUser` be split into smaller, more focused modules?**
  _Cohesion score 0.08959899749373433 - nodes in this community are weakly interconnected._
- **Should `00000000000000_baseline/migration.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.0526006464883926 - nodes in this community are weakly interconnected._
- **Should `20260727000000_init/migration.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.051791629027401385 - nodes in this community are weakly interconnected._