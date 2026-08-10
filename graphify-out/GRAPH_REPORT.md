# Graph Report - /Users/naksh/Downloads/verity  (2026-08-10)

## Corpus Check
- 458 files · ~350,954 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2507 nodes · 6675 edges · 189 communities (126 shown, 63 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.59)
- Token cost: 62,000 input · 4,200 output

## Community Hubs (Navigation)
- Assets Module UI
- Baseline Prisma Migration
- Init Prisma Migration
- Workspace Shell and Guide
- Departments and Live API
- Error and Offline Pages
- Carxen Tenant Seed
- Spec Column Editors
- Dashboards and Floor Stats
- Worker and Supervisor Stages
- Structured Variant Forms
- BOM Edits and Backfills
- Prisma Seed and E2E Setup
- Inspector Profiles and Auth Roles
- Master Data Workspace
- BOM Template Editors
- Provisioning and Role Grants
- QC Floor and Production
- Owner Orders and Blueprints
- Storage Config and QC Video
- Notifications and Checklists
- Catalog Master Data Actions
- Product Descriptor Platform
- Spec Resolution and Demo Seed
- BOM Resolution Library
- Inspection Review Flow
- Settings Items Tree
- Billing and Payroll UI
- Helpdesk and Service Work Orders
- Purchase Module
- HQ Clients Console
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Module Entitlement Guard
- Community 40
- Community 41
- Session Auth Core
- Community 43
- Community 44
- Community 45
- Community 46
- HQ Client Detail UI
- Community 48
- Session Payload and Job Card Access
- Service Modules Spec
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Logout Action
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- HQ Operator Allowlist
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Docs Generator Script
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Login Verification Script
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 106
- Community 107
- HQ Access Check Script
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114
- Community 115
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- Community 123
- Community 124
- Community 125
- Community 126
- Community 127
- Community 128
- Community 129
- Community 130
- Community 131
- Community 132
- Community 133
- Community 134
- Community 135
- Community 136
- Community 137
- Community 138
- Community 139
- Community 140
- Community 141
- Community 142
- Community 143
- Community 144
- Community 145
- Community 146
- Community 147
- Community 148
- Community 149
- Community 150
- Community 151
- Community 152
- Community 171
- Community 172
- Community 173
- Community 174
- Community 176
- Community 177
- Community 180
- Community 181
- Community 182
- Community 186
- Community 188

## God Nodes (most connected - your core abstractions)
1. `getOwnerUser` - 366 edges
2. `getUserSession()` - 108 edges
3. `cn()` - 97 edges
4. `guardModuleAction()` - 79 edges
5. `Button()` - 62 edges
6. `toast` - 50 edges
7. `Select()` - 37 edges
8. `Input()` - 36 edges
9. `Surface()` - 32 edges
10. `confirmDialog()` - 31 edges

## Surprising Connections (you probably didn't know these)
- `describeSpecDetails()` --indirect_call--> `v()`  [INFERRED]
  src/lib/server/specUtils.ts → scripts/seed_all_specs.mjs
- `make()` --calls--> `createItemFromSpecFor()`  [EXTRACTED]
  prisma/seed-carxen.ts → src/server/internal/itemEngine.ts
- `makeItem()` --calls--> `specHash()`  [EXTRACTED]
  scripts/seed_demo_items.mts → src/lib/spec/hash.ts
- `globalSetup()` --references--> `@prisma/client`  [EXTRACTED]
  e2e/global-setup.ts → package.json
- `main()` --references--> `@prisma/client`  [EXTRACTED]
  scripts/provision-trial.ts → package.json

## Import Cycles
- None detected.

## Communities (189 total, 63 thin omitted)

### Community 0 - "Assets Module UI"
Cohesion: 0.06
Nodes (83): AssetRow, AssetsClient(), BLANK, STATUSES, Asset, AssetDetailClient(), Log, Schedule (+75 more)

### Community 1 - "Baseline Prisma Migration"
Cohesion: 0.05
Nodes (82): "Agreement", "Approval", "Attachment", "AttendanceLog", "AuditLog", "BinBalance", "Blueprint", "BlueprintRouteStep" (+74 more)

### Community 2 - "Init Prisma Migration"
Cohesion: 0.05
Nodes (81): "Agreement", "Approval", "Attachment", "AttendanceLog", "AuditLog", "BinBalance", "Blueprint", "BlueprintRouteStep" (+73 more)

### Community 3 - "Workspace Shell and Guide"
Cohesion: 0.04
Nodes (53): HomeClient(), Key(), Slot(), TAP_SPRING, Workspace, WORKSPACES, Contents(), Dept (+45 more)

### Community 4 - "Departments and Live API"
Cohesion: 0.06
Nodes (49): dynamic, GET(), runtime, DepartmentModal(), DepartmentsClient(), Dept, Member, ROSTER_ROLES (+41 more)

### Community 5 - "Error and Offline Pages"
Cohesion: 0.07
Nodes (24): react, react, DepartmentFloorClient(), JobRow(), specLine(), StatCard(), statusTone(), AddEmployeeForm() (+16 more)

### Community 6 - "Carxen Tenant Seed"
Cohesion: 0.09
Nodes (47): cleanStructure(), COLOURS, created, Ctx, CUSTOMERS, DEFAULT_ROUTE, DEPARTMENTS, DESIGNS (+39 more)

### Community 7 - "Spec Column Editors"
Cohesion: 0.09
Nodes (36): ColumnCard(), ColumnStrip(), SchemaEditor(), StripGroup, BUILTIN_COLUMNS, BuiltinColumnId, BY_ID, classifyFields() (+28 more)

### Community 8 - "Dashboards and Floor Stats"
Cohesion: 0.09
Nodes (17): dynamic, Tab, TABS, SearchResults, MemberWithStats, TeamClient(), Metric(), PageHeader() (+9 more)

### Community 9 - "Worker and Supervisor Stages"
Cohesion: 0.13
Nodes (38): ApproveActions(), dynamic, SupervisorStagePage(), ChecklistRow(), ChecklistState, idbDel(), idbGet(), idbPut() (+30 more)

### Community 10 - "Structured Variant Forms"
Cohesion: 0.10
Nodes (30): AddMasterDataClient(), panelOf(), StructuredValue, StructuredVariantForm(), EditableSpecCell(), FreeTextInput(), Props, SpecCombobox() (+22 more)

### Community 11 - "BOM Edits and Backfills"
Cohesion: 0.12
Nodes (31): prisma, prisma, BomEdit, isAttributeGroup(), writeBomEdits(), specHash(), identityOf(), isEmptyAnswer() (+23 more)

### Community 12 - "Prisma Seed and E2E Setup"
Cohesion: 0.06
Nodes (29): globalSetup(), @prisma/client, @prisma/client, BlueprintSeed, CODE_PREFIX, codeCounters, hashPin(), main() (+21 more)

### Community 13 - "Inspector Profiles and Auth Roles"
Cohesion: 0.10
Nodes (28): InspectorInboxPage(), dynamic, InspectorProfilePage(), dynamic, SupervisorHome(), dynamic, WorkerHome(), dynamic (+20 more)

### Community 14 - "Master Data Workspace"
Cohesion: 0.11
Nodes (29): CustomersPage(), MasterDataWorkspacePage(), SettingsClient(), AddMasterDataPage(), ItemDetailPage(), SpecStudioClient(), OwnerSettingsPage(), PermissionMatrixCard() (+21 more)

### Community 15 - "BOM Template Editors"
Cohesion: 0.14
Nodes (31): BomTemplateEditor(), ContributionEditor(), ItemBomEditor(), sourceStyle, addContribution(), ContributionOwner, ContributionRow, countItemsUsingOwner() (+23 more)

### Community 16 - "Provisioning and Role Grants"
Cohesion: 0.11
Nodes (30): entitledModules(), main(), prisma, hashPin(), main(), prisma, Trial, TRIALS (+22 more)

### Community 17 - "QC Floor and Production"
Cohesion: 0.12
Nodes (21): dynamic, InspectorRejectedPage(), QCFloorClient(), QCFloorPage(), SearchPage(), TeamPage(), POOL_LIMIT, pooledUrl() (+13 more)

### Community 18 - "Owner Orders and Blueprints"
Cohesion: 0.11
Nodes (29): OwnerDashboard(), DepartmentFloorPage(), FloorPage(), OrderTakingPage(), OwnerOrdersPage(), BlueprintPage(), StorageDiagnosticsPage(), EmployeeProfilePage() (+21 more)

### Community 19 - "Storage Config and QC Video"
Cohesion: 0.16
Nodes (23): QcVideoCapture(), readDuration(), STORAGE_ALLOWED_EXTENSIONS, STORAGE_ALLOWED_MIME_TYPES, STORAGE_BUCKET, STORAGE_MAX_BYTES, VIDEO_ALLOWED_EXTENSIONS, VIDEO_ALLOWED_MIME_TYPES (+15 more)

### Community 20 - "Notifications and Checklists"
Cohesion: 0.12
Nodes (25): GET(), POST(), InspectorVerifiedPage(), ChecklistBuilder(), CheckpointInput, referenceImagePath(), SectionInput, TemplateInput (+17 more)

### Community 21 - "Catalog Master Data Actions"
Cohesion: 0.13
Nodes (31): DEFAULT_MATERIAL_CATEGORY, FABRIC_CATEGORY, createItemInRootCategory(), guardDelete(), addCatalogItem(), addColor(), addMaterial(), addSupplier() (+23 more)

### Community 22 - "Product Descriptor Platform"
Cohesion: 0.09
Nodes (29): DescriptorSpec, DescriptorValues, ALL, ARMRESTS, BRANDS, DESIGNS, FABRICS, GENERATIONS (+21 more)

### Community 23 - "Spec Resolution and Demo Seed"
Cohesion: 0.15
Nodes (24): groupByName, makeItem(), prisma, descendantIds(), FieldLike, FieldShape, findLinkColumn(), groupChain() (+16 more)

### Community 24 - "BOM Resolution Library"
Cohesion: 0.11
Nodes (26): BomContributionShape, BomLine, BomOverrideShape, BomSource, BomTemplateLineShape, expandBomTemplate(), ResolvedBomLine, resolveItemBom() (+18 more)

### Community 25 - "Inspection Review Flow"
Cohesion: 0.15
Nodes (25): dynamic, ReviewInspectionPage(), ReviewCheckpoints(), OwnerReviewInspectionPage(), DepartmentKind, loadAssignedWorkers(), orderItemInclude, approveInspection() (+17 more)

### Community 26 - "Settings Items Tree"
Cohesion: 0.12
Nodes (26): Category, emptyForm(), Field(), FieldDef, Form, Item, ItemsTree(), deriveItemType() (+18 more)

### Community 27 - "Billing and Payroll UI"
Cohesion: 0.16
Nodes (24): BillingClient(), BLANK_LINE, INVOICE_STATUSES, InvoiceRow, Line, monthBounds(), PAYROLL_STATUSES, PayrollRow (+16 more)

### Community 28 - "Helpdesk and Service Work Orders"
Cohesion: 0.17
Nodes (25): TicketDetailPage(), ServiceWorkOrdersPage(), guardModuleAction(), addTicketComment(), assignServiceWorkOrder(), assignTicket(), CLOSED_TICKET_STATES, CLOSED_WO_STATES (+17 more)

### Community 29 - "Purchase Module"
Cohesion: 0.16
Nodes (21): PurchasePage(), PurchaseClient(), approvePurchaseOrder(), confirmPurchaseDelivery(), createPurchaseOrder(), createSupplier(), deletePurchaseOrder(), deleteSupplier() (+13 more)

### Community 30 - "HQ Clients Console"
Cohesion: 0.17
Nodes (25): ClientsClient(), ClientDetailClient(), HqClientDetailPage(), HqClientsPage(), hashPin(), requireHqAction(), modulesForPack(), systemRoleId() (+17 more)

### Community 31 - "Community 31"
Cohesion: 0.10
Nodes (16): Section, Invoice, STATUSES, Total(), checklistFor(), ChecklistItem, DeptRow(), OrderReviewDossier() (+8 more)

### Community 32 - "Community 32"
Cohesion: 0.13
Nodes (19): getColorIndicator(), OrdersClient(), OrdersClientProps, PipelineBadge(), StatusBadge(), SearchClient(), UserWithStats, Table (+11 more)

### Community 33 - "Community 33"
Cohesion: 0.13
Nodes (18): Group, NamePreviewBar(), BomTweak, InheritedLine, VariantBomModal(), Props, VariantGrid(), MASTER_DATA_DOMAIN_LABELS (+10 more)

### Community 34 - "Community 34"
Cohesion: 0.12
Nodes (15): InventoryClient(), NewLocation(), STOCK_MODAL_COPY, StockModalType, Tab, TABS, ADJUSTMENT_TYPES, createDispatch() (+7 more)

### Community 35 - "Community 35"
Cohesion: 0.18
Nodes (21): ProjectDetailPage(), ProjectDetailClient(), createWithDocNumber(), formatDocNumber(), approveTimesheet(), createProject(), createTask(), deleteProject() (+13 more)

### Community 36 - "Community 36"
Cohesion: 0.16
Nodes (18): Group, MobileGroupRail(), Group, TemplateEditor(), SubTree(), TreeGroup, CategorySettings(), KIND_HINTS (+10 more)

### Community 37 - "Community 37"
Cohesion: 0.08
Nodes (23): AppData, AssignmentDraft, AuditLog, BootstrapPayload, Checkpoint, CheckpointResponse, Customer, CustomerDraft (+15 more)

### Community 38 - "Community 38"
Cohesion: 0.09
Nodes (15): colorNames, customerNames, DEFAULT_DEPARTMENTS, designSpec, ensureVariant(), fabricItems, firstNames, item() (+7 more)

### Community 39 - "Module Entitlement Guard"
Cohesion: 0.17
Nodes (15): AssetDetailPage(), AssetsPage(), InvoiceDetailPage(), HelpdeskPage(), ProjectsPage(), SiteDetailPage(), SitesPage(), guardModulePage() (+7 more)

### Community 40 - "Community 40"
Cohesion: 0.19
Nodes (18): SpecDataGrid(), SpecRow, CsvField, csvHeader(), csvOptionSheet(), csvSampleRow(), FIXED, parseCsvRow() (+10 more)

### Community 41 - "Community 41"
Cohesion: 0.18
Nodes (19): InventoryPage(), STOCK_STATUS_FIELD, STOCK_STATUS_LABEL, STOCK_STATUSES, StockStatus, dispatchOrder(), getInventoryOverview(), getItemBatches() (+11 more)

### Community 42 - "Session Auth Core"
Cohesion: 0.20
Nodes (14): POST(), HomePage(), clearUserSession(), createUserSession(), decrypt(), encodedKey, encrypt(), getUserSessionFromRequest() (+6 more)

### Community 43 - "Community 43"
Cohesion: 0.17
Nodes (17): OwnerLayout(), cached(), Entry, inflight, invalidate(), store, disableModule(), enableModules() (+9 more)

### Community 44 - "Community 44"
Cohesion: 0.20
Nodes (18): SchedulingPage(), isoDay(), SchedulingClient(), dynamic, WorkerSchedulePage(), hasModule(), requireModule(), copyWeek() (+10 more)

### Community 45 - "Community 45"
Cohesion: 0.11
Nodes (13): colorNames, customerNames, designSpec, ensureVariant(), fabricItems, firstNames, item(), lastNames (+5 more)

### Community 46 - "Community 46"
Cohesion: 0.18
Nodes (17): BLANK, CustomerRow, CustomersClient(), Customer, CustomersTree(), emptyForm(), Field(), Form (+9 more)

### Community 47 - "HQ Client Detail UI"
Cohesion: 0.17
Nodes (16): BLANK, Client, Issued, Pack, Factory, Module, Pack, STATUSES (+8 more)

### Community 48 - "Community 48"
Cohesion: 0.11
Nodes (19): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, tsx, @types/node (+11 more)

### Community 49 - "Session Payload and Job Card Access"
Cohesion: 0.15
Nodes (15): dynamic, SupervisorHistoryPage(), Bucket, BUCKET_LABEL, BUCKET_TONE, HistoryClient(), TABS, dynamic (+7 more)

### Community 50 - "Service Modules Spec"
Cohesion: 0.12
Nodes (18): /verity HQ Console, Module Entitlements, Phone + 4-digit PIN login, requireHqAction guard, Server Action Auth Surface, Site, Tenant Scoping by factoryId, Verity Core Data Model (+10 more)

### Community 51 - "Community 51"
Cohesion: 0.18
Nodes (17): DesignOption, matchesAll(), Option, Segment, segmentsFromValue(), SpecConstraint, Stage, stagesFor() (+9 more)

### Community 52 - "Community 52"
Cohesion: 0.17
Nodes (16): couldBeSpecToken(), FIELD_WEIGHTS, formatVariant(), formatVariantCompact(), HEADREST_COUNTS, listVariantBases(), matchesQuery(), scoreDescriptor() (+8 more)

### Community 53 - "Community 53"
Cohesion: 0.12
Nodes (17): @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, clsx, framer-motion, lucide-react, dependencies, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner (+9 more)

### Community 54 - "Community 54"
Cohesion: 0.13
Nodes (12): contentType, size, contentType, size, BRAND_ACCENT, BRAND_ACCENT_DARK, BRAND_BACKGROUND, BRAND_DESCRIPTION (+4 more)

### Community 55 - "Community 55"
Cohesion: 0.12
Nodes (16): scripts, build, build:analyze, db:migrate, db:reset, db:sync, dev, lint (+8 more)

### Community 56 - "Community 56"
Cohesion: 0.23
Nodes (11): ItemUnitsEditor(), UnitCell(), Units, NormalisedUnits, normaliseUnit(), normaliseUnits(), UnitInput, getItemUnits() (+3 more)

### Community 57 - "Community 57"
Cohesion: 0.19
Nodes (8): QualityPassportPage(), PassportCard(), VerificationPanel(), VerifiedMoment(), DesignReference(), EvidenceItem, EvidenceLightbox(), getPassportData()

### Community 58 - "Community 58"
Cohesion: 0.23
Nodes (9): Answer, getDB(), InspectionClient(), dynamic, WorkerInspectionPage(), OrderSpecCard(), uploadStorageImage(), getInspectionData() (+1 more)

### Community 59 - "Community 59"
Cohesion: 0.13
Nodes (15): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, module, moduleResolution (+7 more)

### Community 60 - "Community 60"
Cohesion: 0.16
Nodes (13): BOM_BY_FAMILY, CATALOGUE, CODE_PREFIX, COMMON_FINISHING, FABRIC_CONSUMPTION, ItemSpec, Line, main() (+5 more)

### Community 61 - "Community 61"
Cohesion: 0.26
Nodes (10): GET(), hashPassword(), GET(), requireMaintenanceToken(), DEFAULT_MODULES, ProvisionResult, provisionTenant(), ROLE_LABELS (+2 more)

### Community 62 - "Logout Action"
Cohesion: 0.34
Nodes (6): WorkerLayout(), AutoRefresh(), isUserBusy(), IdleLogout(), LiveRefresh(), logoutUser()

### Community 63 - "Community 63"
Cohesion: 0.19
Nodes (8): inter, metadata, notoSansDevanagari, sora, viewport, RootProviders(), ThemeProvider(), initPostHog()

### Community 64 - "Community 64"
Cohesion: 0.21
Nodes (11): byName, counts, emit(), models, out, p(), parentLink(), parentLinkShallow() (+3 more)

### Community 65 - "Community 65"
Cohesion: 0.23
Nodes (10): GuideClient(), GuidePage(), metadata, escapeHtml(), GuideHeading, inline(), isTableDivider(), RenderedGuide (+2 more)

### Community 66 - "Community 66"
Cohesion: 0.23
Nodes (8): Item, ItemLabelSheet(), InventoryLabelsPage(), OwnerReportsPage(), download(), ReportsPackClient(), dayKey(), getReportsData()

### Community 67 - "Community 67"
Cohesion: 0.29
Nodes (10): LogisticsClient(), LogisticsPage(), deriveProductionStatus(), isDispatchReady(), confirmDelivery(), ensureDefaultBin(), getDispatchableOrders(), getDispatchDestinations() (+2 more)

### Community 68 - "Community 68"
Cohesion: 0.26
Nodes (8): ProductionLabelPage(), OrderInfo, ProductionLabel(), ensureProductionLabel(), getMaterialRequirement(), MaterialLine, MaterialRequirement, round2()

### Community 69 - "Community 69"
Cohesion: 0.47
Nodes (11): MemberDetailClient(), can(), generateRandomPin(), inviteMember(), logAudit(), removeMember(), resetMemberPin(), setMemberPin() (+3 more)

### Community 70 - "Community 70"
Cohesion: 0.35
Nodes (11): AssetInput, createAsset(), createMaintenanceSchedule(), deleteAsset(), deleteMaintenanceSchedule(), logMaintenance(), parseDate(), revalidateAssetPaths() (+3 more)

### Community 71 - "Community 71"
Cohesion: 0.22
Nodes (8): Reassign(), AssignmentRow(), Db, DEFAULT_STAGES, getDepartmentRoster(), isOwnerRole(), reassignJobCard(), revalidateAssignmentPaths()

### Community 72 - "Community 72"
Cohesion: 0.27
Nodes (7): dynamic, SupervisorHistoryDetailPage(), HistoryDetailClient(), OUTCOME_TONE, dynamic, WorkerHistoryDetailPage(), getHistoryDetail()

### Community 73 - "Community 73"
Cohesion: 0.36
Nodes (10): createSite(), deleteSite(), deployStaff(), endDeployment(), parseDate(), removeDeployment(), revalidateSitePaths(), setSiteStatus() (+2 more)

### Community 74 - "HQ Operator Allowlist"
Cohesion: 0.36
Nodes (8): HqLayout(), allowlist(), Denial, deny(), HqOperator, HqRefusal, isOperator(), requireHqPage()

### Community 75 - "Community 75"
Cohesion: 0.29
Nodes (7): InstallAction(), InstallPromptBanner(), BeforeInstallPromptEvent, PwaContext, PwaContextValue, PwaProvider(), usePwa()

### Community 76 - "Community 76"
Cohesion: 0.31
Nodes (8): ancestry(), buildLinkTargets(), GroupNode, LinkTarget, linkTargetIdOf(), lower(), SYSTEM_LINK_TARGETS, groups

### Community 77 - "Community 77"
Cohesion: 0.22
Nodes (8): prisma, prisma, node_modules, playwright, playwright.config.ts, scripts, tmp_backup_verity, exclude

### Community 78 - "Community 78"
Cohesion: 0.36
Nodes (6): ItemSearchInput(), Props, countFinishedGoods(), ItemSearchResult, PRODUCIBLE_WHERE, searchFinishedGoods()

### Community 79 - "Community 79"
Cohesion: 0.42
Nodes (6): useLanguage(), BottomNav(), BottomNavItem, BottomNavProps, InspectorNav(), WorkerNav()

### Community 80 - "Community 80"
Cohesion: 0.31
Nodes (8): ACTIONS_DIR, argumentBlock(), Call, GUARDED_FILES, modelsWithFactoryId(), SCHEMA, SCOPE_OPENING, scopeOpeningCalls()

### Community 81 - "Community 81"
Cohesion: 0.25
Nodes (5): groupIds, o(), prisma, SPECS, v()

### Community 82 - "Community 82"
Cohesion: 0.29
Nodes (7): DEPARTMENTS, GRANTS, hashPin(), main(), MODULES, prisma, ROLE_LABELS

### Community 83 - "Community 83"
Cohesion: 0.43
Nodes (6): ServiceInspectionPage(), getServiceInspection(), recordServiceCheckpoint(), resolveServiceInspection(), revalidateInspectionPaths(), submitServiceInspection()

### Community 84 - "Community 84"
Cohesion: 0.29
Nodes (7): KIND_STATUS, PRODUCTION_STATUS_LABELS, PRODUCTION_STATUSES, ProductionStatus, productionStatusIndex(), StatusInput, StatusJobCard

### Community 85 - "Community 85"
Cohesion: 0.46
Nodes (6): asRecord(), AUTOMOTIVE_KEYS, LegacyOrderColumns, PREFER_DYNAMIC, readOrderFields(), writeOrderFields()

### Community 86 - "Community 86"
Cohesion: 0.29
Nodes (6): extends, rules, @next/next/no-img-element, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, next/core-web-vitals

### Community 87 - "Docs Generator Script"
Cohesion: 0.48
Nodes (6): Path, build_docs(), dedent(), main(), reset_docs(), write()

### Community 88 - "Community 88"
Cohesion: 0.29
Nodes (7): **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, **/*.ts, **/*.tsx, include

### Community 89 - "Community 89"
Cohesion: 0.29
Nodes (5): BOM_RECIPES, DEPT_CHECKLISTS, prisma, PRODUCT_QC, PRODUCT_TYPE_FIELDS

### Community 90 - "Community 90"
Cohesion: 0.33
Nodes (5): name, prisma, seed, private, version

### Community 91 - "Community 91"
Cohesion: 0.53
Nodes (5): current(), main(), prisma, SEEDED_PINS, stale()

### Community 92 - "Community 92"
Cohesion: 0.40
Nodes (4): bom1, framework, regions, $schema

### Community 93 - "Community 93"
Cohesion: 0.40
Nodes (5): dom, dom.iterable, esnext, webworker, lib

### Community 94 - "Community 94"
Cohesion: 0.40
Nodes (4): fcols, names, phase0, prisma

### Community 95 - "Community 95"
Cohesion: 0.40
Nodes (4): byName, CHAIN, prisma, route

### Community 97 - "Community 97"
Cohesion: 0.40
Nodes (4): p, t0, t1, t2

### Community 100 - "Community 100"
Cohesion: 0.50
Nodes (3): configuration, p, records

### Community 103 - "Community 103"
Cohesion: 0.67
Nodes (3): config, middleware(), PROTECTED

## Knowledge Gaps
- **640 isolated node(s):** `config`, `"TimelineEvent"`, `"Comment"`, `"Attachment"`, `"AuditLog"` (+635 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **63 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getOwnerUser` connect `Owner Orders and Blueprints` to `Departments and Live API`, `Error and Offline Pages`, `Carxen Tenant Seed`, `Spec Column Editors`, `Dashboards and Floor Stats`, `Structured Variant Forms`, `BOM Edits and Backfills`, `Prisma Seed and E2E Setup`, `Master Data Workspace`, `BOM Template Editors`, `QC Floor and Production`, `Notifications and Checklists`, `Catalog Master Data Actions`, `Spec Resolution and Demo Seed`, `BOM Resolution Library`, `Inspection Review Flow`, `Settings Items Tree`, `Billing and Payroll UI`, `Helpdesk and Service Work Orders`, `Purchase Module`, `Community 32`, `Community 33`, `Community 34`, `Community 35`, `Community 36`, `Module Entitlement Guard`, `Community 40`, `Community 41`, `Community 43`, `Community 44`, `Community 46`, `Community 56`, `Logout Action`, `Community 66`, `Community 67`, `Community 69`, `Community 70`, `Community 73`, `Community 78`, `Community 83`?**
  _High betweenness centrality (0.123) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 53` to `Community 128`, `Community 129`, `Community 130`, `Community 131`, `Community 132`, `Error and Offline Pages`, `Community 133`, `Community 134`, `Community 135`, `Community 136`, `Community 137`, `Community 138`, `Prisma Seed and E2E Setup`, `Community 139`, `Community 90`, `Community 120`, `Community 122`, `Community 123`, `Community 124`, `Community 125`, `Community 126`, `Community 127`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Why does `react` connect `Error and Offline Pages` to `Assets Module UI`, `Structured Variant Forms`, `Community 53`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **What connects `config`, `"TimelineEvent"`, `"Comment"` to the rest of the system?**
  _640 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Assets Module UI` be split into smaller, more focused modules?**
  _Cohesion score 0.057852844107940206 - nodes in this community are weakly interconnected._
- **Should `Baseline Prisma Migration` be split into smaller, more focused modules?**
  _Cohesion score 0.05171907140758154 - nodes in this community are weakly interconnected._
- **Should `Init Prisma Migration` be split into smaller, more focused modules?**
  _Cohesion score 0.051189400782896716 - nodes in this community are weakly interconnected._