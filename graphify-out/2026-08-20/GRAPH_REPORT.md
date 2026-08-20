# Graph Report - D:\Code\verity  (2026-08-20)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 3285 nodes · 9208 edges · 223 communities (151 shown, 72 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.69)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9cabe29f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- masterData.ts
- 00000000000000_baseline/migration.sql
- 20260727000000_init/migration.sql
- api-keys.ts
- canUser
- hq.ts
- owner.ts
- actions/stages.ts
- AddMasterDataClient.tsx
- pricing.ts
- guardModuleWrite
- itemsFromSpec.ts
- ServiceWorkOrdersClient.tsx
- packs.ts
- ColumnStrip.tsx
- worker.ts
- registry.ts
- getOwnerUser
- ModuleKey
- entitlements.ts
- seed-carxen.ts
- resolveAccess
- queries/spec.ts
- SpecStudioClient.tsx
- getUserSession
- guardModuleAction
- qc-video.ts
- primitives.tsx
- owner-shell.tsx
- booking/client.tsx
- inspector.ts
- history.ts
- dining.ts
- descriptor.equivalence.test.ts
- server/auth.ts
- purchase.ts
- RestaurantWidgets.tsx
- resolve.ts
- BillingClient.tsx
- PageHeader.tsx
- cn
- ManufacturingWidgets.tsx
- DepartmentsClient.tsx
- jobCardAdapter.ts
- dialog-service.tsx
- bomTemplates.ts
- production/client.tsx
- SpecDataGrid.tsx
- InventoryClient.tsx
- seed.ts
- bootstrap_seed.mjs
- Surface.tsx
- lib/types.ts
- phoneKey
- prisma.ts
- diningOrders.ts
- mock_seed.mjs
- AssetDetailClient.tsx
- hasModule
- events.ts
- devDependencies
- assignments.ts
- orders.ts
- toast.tsx
- VariantDescInput.tsx
- VERITY_HQ_PHONES
- ReportsPackClient.tsx
- dependencies
- brand.ts
- assistantTools.ts
- variant-descriptor.ts
- scripts
- Input
- production-status.ts
- ItemUnitsEditor.tsx
- utils.ts
- markdown.ts
- kitchen/client.tsx
- compilerOptions
- seed_designs.ts
- worker/layout.tsx
- root-providers.tsx
- actions/billing.ts
- gen_rls_migration.mjs
- verify/[id]/page.tsx
- ProjectDetailClient.tsx
- ContributionEditor.tsx
- tally/route.ts
- guard-coverage.test.ts
- OrderReviewDossier.tsx
- link-targets.ts
- exclude
- backfill-role-permissions.ts
- VerityLogo.tsx
- SiteDetailClient.tsx
- ItemSearchInput.tsx
- InstallPromptBanner.tsx
- useLanguage
- kitchen.test.ts
- tenant-isolation.test.ts
- enrich_seed.ts
- seed_all_specs.mjs
- seed_plotarmour.mjs
- contrast.test.ts
- orderFields.ts
- rules
- generate_verity_docs.py
- include
- enrich_usage.ts
- DepartmentFloorClient.tsx
- write-guard.test.ts
- package.json
- vercel.json
- repair-legacy-pin-hashes.ts
- FloorClient.tsx
- lib
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
- eslint-config-next
- eslint.config.mjs
- @fontsource/inter
- @fontsource/noto-sans-devanagari
- groq-sdk
- gsap
- idb
- jose
- lucide-react
- next
- next-themes
- papaparse
- posthog-js
- @prisma/client
- react
- react-dom
- @sentry/nextjs
- @serwist/next
- @supabase/supabase-js
- tailwindcss-animate
- @types/papaparse
- zod
- @types/react-dom
- typescript
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
- "User"
- "Factory"
- "Organization"
- "User"
- "ProductField"
- "ProductType"
- "Supplier"
- "Warehouse"

## God Nodes (most connected - your core abstractions)
1. `getOwnerUser` - 438 edges
2. `guardModuleWrite()` - 174 edges
3. `guardModuleAction()` - 121 edges
4. `cn()` - 112 edges
5. `getUserSession()` - 110 edges
6. `Button()` - 72 edges
7. `guardModulePage()` - 64 edges
8. `toast` - 60 edges
9. `Input()` - 43 edges
10. `PageHeader()` - 41 edges

## Surprising Connections (you probably didn't know these)
- `describeSpecDetails()` --indirect_call--> `v()`  [INFERRED]
  src/lib/server/specUtils.ts → scripts/seed_all_specs.mjs
- `make()` --calls--> `createItemFromSpecFor()`  [EXTRACTED]
  prisma/seed-carxen.ts → src/server/internal/itemEngine.ts
- `rebuildBlueprints()` --calls--> `buildItemBlueprint()`  [EXTRACTED]
  prisma/seed-carxen.ts → src/server/actions/itemBlueprint.ts
- `makeItem()` --calls--> `specHash()`  [EXTRACTED]
  scripts/seed_demo_items.mts → src/lib/spec/hash.ts
- `main()` --calls--> `provisionCore()`  [EXTRACTED]
  scripts/provision-trial.ts → src/platform/tenancy/provision-core.ts

## Import Cycles
- 3-file cycle: `src/platform/modules/definitions/serving.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/serving.ts`
- 3-file cycle: `src/platform/modules/definitions/quality.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/quality.ts`
- 3-file cycle: `src/platform/modules/definitions/inventory.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/inventory.ts`
- 3-file cycle: `src/platform/modules/definitions/projects.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/projects.ts`
- 3-file cycle: `src/platform/modules/definitions/finance.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/finance.ts`
- 3-file cycle: `src/platform/modules/definitions/hr.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/hr.ts`
- 3-file cycle: `src/platform/modules/definitions/crm.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/crm.ts`
- 3-file cycle: `src/platform/modules/definitions/scheduling.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/scheduling.ts`
- 3-file cycle: `src/platform/modules/definitions/tables_orders.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/tables_orders.ts`
- 3-file cycle: `src/platform/modules/definitions/sales.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/sales.ts`
- 3-file cycle: `src/platform/modules/definitions/billing.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/billing.ts`
- 3-file cycle: `src/platform/modules/definitions/procurement.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/procurement.ts`
- 3-file cycle: `src/platform/modules/definitions/booking.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/booking.ts`
- 3-file cycle: `src/platform/modules/definitions/core.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/core.ts`
- 3-file cycle: `src/platform/modules/definitions/assets.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/assets.ts`
- 3-file cycle: `src/platform/modules/definitions/automotive.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/automotive.ts`
- 3-file cycle: `src/platform/modules/definitions/helpdesk.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/helpdesk.ts`
- 3-file cycle: `src/platform/modules/definitions/kitchen.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/kitchen.ts`
- 3-file cycle: `src/platform/modules/definitions/manufacturing.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/manufacturing.ts`
- 3-file cycle: `src/platform/modules/definitions/menu.ts -> src/platform/modules/sdk.ts -> src/platform/modules/registry.ts -> src/platform/modules/definitions/menu.ts`

## Communities (223 total, 72 thin omitted)

### Community 0 - "masterData.ts"
Cohesion: 0.05
Nodes (74): OwnerSettingsPage(), Category, emptyForm(), FieldDef, Form, Item, ItemsTree(), DEFAULT_MATERIAL_CATEGORY (+66 more)

### Community 1 - "00000000000000_baseline/migration.sql"
Cohesion: 0.05
Nodes (82): "Agreement", "Approval", "Attachment", "AttendanceLog", "AuditLog", "BinBalance", "Blueprint", "BlueprintRouteStep" (+74 more)

### Community 2 - "20260727000000_init/migration.sql"
Cohesion: 0.05
Nodes (81): "Agreement", "Approval", "Attachment", "AttendanceLog", "AuditLog", "BinBalance", "Blueprint", "BlueprintRouteStep" (+73 more)

### Community 3 - "api-keys.ts"
Cohesion: 0.05
Nodes (61): GET(), dynamic, GET(), runtime, dynamic, handled(), POST(), runtime (+53 more)

### Community 4 - "canUser"
Cohesion: 0.07
Nodes (58): OwnerLayout(), SettingsClient(), ApiKey, Delivery, Endpoint, IntegrationsClient(), OwnerIntegrationsPage(), AddMasterDataPage() (+50 more)

### Community 5 - "hq.ts"
Cohesion: 0.07
Nodes (59): GET(), hashPassword(), GET(), BLANK, Client, ClientsClient(), Issued, Pack (+51 more)

### Community 6 - "owner.ts"
Cohesion: 0.09
Nodes (38): AssetDetailPage(), AssetsPage(), InvoiceDetailPage(), BillingPage(), CustomersPage(), TicketDetailPage(), HelpdeskPage(), Item (+30 more)

### Community 7 - "actions/stages.ts"
Cohesion: 0.10
Nodes (51): ApproveActions(), dynamic, SupervisorStagePage(), ChecklistState, idbDel(), idbGet(), idbPut(), StageClient() (+43 more)

### Community 8 - "AddMasterDataClient.tsx"
Cohesion: 0.08
Nodes (39): Group, panelOf(), StructuredValue, StructuredVariantForm(), EditableSpecCell(), NamePreviewBar(), FreeTextInput(), Props (+31 more)

### Community 9 - "pricing.ts"
Cohesion: 0.07
Nodes (41): OnboardingPage(), TenantBillingPage(), OnboardingWizard(), Suggestion, PackSuggestion, ChargeLine, GeneratedInvoice, generateInvoice() (+33 more)

### Community 10 - "guardModuleWrite"
Cohesion: 0.10
Nodes (51): ProjectDetailClient(), createWithDocNumber(), formatDocNumber(), guardModuleWrite(), generatePin(), launchOutlet(), LaunchOutletInput, addTicketComment() (+43 more)

### Community 11 - "itemsFromSpec.ts"
Cohesion: 0.09
Nodes (41): prisma, prisma, AddMasterDataClient(), BomEdit, isAttributeGroup(), writeBomEdits(), COMBINATION_CAP, CombinationResult (+33 more)

### Community 12 - "ServiceWorkOrdersClient.tsx"
Cohesion: 0.09
Nodes (44): AssetRow, BLANK, STATUSES, BLANK, Option, PRIORITIES, STATUSES, TicketRow (+36 more)

### Community 13 - "packs.ts"
Cohesion: 0.09
Nodes (39): checkDashboardRouting(), fail(), main(), pass(), prisma, reportIngestCoverage(), POST(), SYSTEM_PROMPT (+31 more)

### Community 14 - "ColumnStrip.tsx"
Cohesion: 0.08
Nodes (39): ColumnCard(), ColumnStrip(), SchemaEditor(), StripGroup, Group, LinkableGroup, SpecFieldEditor(), BUILTIN_COLUMNS (+31 more)

### Community 15 - "worker.ts"
Cohesion: 0.10
Nodes (25): dynamic, InspectorProfilePage(), dynamic, SupervisorHome(), Answer, getDB(), InspectionClient(), dynamic (+17 more)

### Community 16 - "registry.ts"
Cohesion: 0.10
Nodes (25): assetsModule, automotiveModule, billingModule, bookingModule, coreModule, crmModule, financeModule, helpdeskModule (+17 more)

### Community 17 - "getOwnerUser"
Cohesion: 0.08
Nodes (44): CounterClient(), CounterPage(), DepartmentFloorPage(), FloorPage(), ServiceInspectionPage(), MenuBlocker, getOwnerUser, getCounterQueue() (+36 more)

### Community 18 - "ModuleKey"
Cohesion: 0.07
Nodes (37): hashPin(), main(), prisma, Trial, TRIALS, CLIENT_OWNER, hashPin(), main() (+29 more)

### Community 19 - "entitlements.ts"
Cohesion: 0.12
Nodes (37): entitledModules(), main(), prisma, cached(), Entry, inflight, invalidate(), store (+29 more)

### Community 20 - "seed-carxen.ts"
Cohesion: 0.11
Nodes (42): cleanStructure(), COLOURS, created, Ctx, CUSTOMERS, DEFAULT_ROUTE, DEPARTMENTS, DESIGNS (+34 more)

### Community 21 - "resolveAccess"
Cohesion: 0.09
Nodes (36): NewBookingSheet(), BookingPage(), KitchenPage(), ServingPage(), APPOINTMENT_STATUSES, bookingWeekRange(), DiningBlocker, resolveAccess (+28 more)

### Community 22 - "queries/spec.ts"
Cohesion: 0.09
Nodes (34): MasterDataWorkspacePage(), ItemDetailPage(), SpecStudioClient(), DeleteItemButton(), BomContributionShape, BomLine, BomOverrideShape, BomSource (+26 more)

### Community 23 - "SpecStudioClient.tsx"
Cohesion: 0.09
Nodes (27): prisma, prisma, Group, MobileGroupRail(), Group, TemplateEditor(), SubTree(), TreeGroup (+19 more)

### Community 24 - "getUserSession"
Cohesion: 0.10
Nodes (28): GET(), POST(), InspectorVerifiedPage(), ProductionLabelPage(), OrderInfo, ProductionLabel(), ChecklistBuilder(), referenceImagePath() (+20 more)

### Community 25 - "guardModuleAction"
Cohesion: 0.11
Nodes (31): InventoryPage(), LogisticsClient(), LogisticsPage(), STOCK_STATUS_FIELD, STOCK_STATUS_LABEL, STOCK_STATUSES, StockStatus, guardModuleAction() (+23 more)

### Community 26 - "qc-video.ts"
Cohesion: 0.13
Nodes (23): StorageDiagnosticsPage(), QcVideoCapture(), readDuration(), STORAGE_ALLOWED_EXTENSIONS, STORAGE_ALLOWED_MIME_TYPES, STORAGE_BUCKET, STORAGE_MAX_BYTES, VIDEO_ALLOWED_EXTENSIONS (+15 more)

### Community 27 - "primitives.tsx"
Cohesion: 0.11
Nodes (12): AddEmployeeForm(), RemoveEmployeeButton(), ResetPinButton(), ConfirmDialog(), ConfirmDialogProps, Button(), Card(), SelectChoice (+4 more)

### Community 28 - "owner-shell.tsx"
Cohesion: 0.10
Nodes (29): OwnerDashboard(), MobileTab(), NAV_ICONS, NotificationItem, OwnerShell(), ShellNavItem, withIcon(), Avatar() (+21 more)

### Community 29 - "booking/client.tsx"
Cohesion: 0.09
Nodes (26): BookingCard(), BookingClient(), dateFmt, dayKeyFmt, instantOf(), keyOf(), shiftKey(), Staff (+18 more)

### Community 30 - "inspector.ts"
Cohesion: 0.15
Nodes (25): dynamic, ReviewInspectionPage(), ReviewCheckpoints(), Section, OwnerReviewInspectionPage(), OrderTimeline(), TYPE_STYLES, DepartmentKind (+17 more)

### Community 31 - "history.ts"
Cohesion: 0.09
Nodes (24): dynamic, SupervisorHistoryDetailPage(), dynamic, SupervisorHistoryPage(), Bucket, BUCKET_LABEL, BUCKET_TONE, HistoryClient() (+16 more)

### Community 32 - "dining.ts"
Cohesion: 0.10
Nodes (24): RestaurantFloorWidget(), ACTIVE_ORDER_STATES, canTransitionTable(), DINING_BLOCKERS, GST_RATE, isOrderActive(), isOrderFinal(), lineTotal() (+16 more)

### Community 33 - "descriptor.equivalence.test.ts"
Cohesion: 0.09
Nodes (29): DescriptorSpec, DescriptorValues, ALL, ARMRESTS, BRANDS, DESIGNS, FABRICS, GENERATIONS (+21 more)

### Community 34 - "server/auth.ts"
Cohesion: 0.10
Nodes (27): POST(), HomeClient(), TAP_SPRING, dynamic, InspectorInboxPage(), HomePage(), WorkerSettingsClient(), NotificationPrefsCard() (+19 more)

### Community 35 - "purchase.ts"
Cohesion: 0.14
Nodes (23): PurchasePage(), PurchaseClient(), approvePurchaseOrder(), confirmPurchaseDelivery(), createPurchaseOrder(), createSupplier(), deletePurchaseOrder(), deleteSupplier() (+15 more)

### Community 36 - "RestaurantWidgets.tsx"
Cohesion: 0.13
Nodes (16): LifestyleServicesDashboard(), RestaurantDashboard(), FloorTable, RestaurantFloor(), STATE_STYLE, timeFmt, UpcomingBookingsWidget(), WidgetProps (+8 more)

### Community 37 - "resolve.ts"
Cohesion: 0.16
Nodes (22): groupByName, makeItem(), prisma, FieldLike, FieldShape, findLinkColumn(), groupChain(), GroupNode (+14 more)

### Community 38 - "BillingClient.tsx"
Cohesion: 0.13
Nodes (24): AssetsClient(), BillingClient(), BLANK_LINE, INVOICE_STATUSES, InvoiceRow, Line, monthBounds(), PAYROLL_STATUSES (+16 more)

### Community 39 - "PageHeader.tsx"
Cohesion: 0.24
Nodes (18): AutoComponentsDashboard(), FacilityManagementDashboard(), PIPELINE_STAGES, ProfessionalServicesDashboard(), QsrFranchiseDashboard(), RetailDashboard(), RetailFranchiseDashboard(), BarRow() (+10 more)

### Community 40 - "cn"
Cohesion: 0.12
Nodes (19): BlueprintBuilderClient(), UserWithStats, ChecklistRow(), Table, TableBody, TableCell, TableHead, TableHeader (+11 more)

### Community 41 - "ManufacturingWidgets.tsx"
Cohesion: 0.11
Nodes (14): relativeTime(), WarningRow, WarningsQueue(), FactoryMetricsWidget(), OperationalWarningsWidget(), startOfToday(), WidgetProps, FactoryFeed() (+6 more)

### Community 42 - "DepartmentsClient.tsx"
Cohesion: 0.14
Nodes (20): DepartmentModal(), DepartmentsClient(), Dept, Member, ROSTER_ROLES, RosterModal(), Template, UserRow (+12 more)

### Community 43 - "jobCardAdapter.ts"
Cohesion: 0.15
Nodes (19): QCFloorPage(), SearchPage(), FloorProgressWidget(), blueprintStages(), describeOrderItem(), jobCardInclude, orderItemInclude, resolveProductionStages() (+11 more)

### Community 44 - "dialog-service.tsx"
Cohesion: 0.14
Nodes (21): BLANK, CustomerRow, CustomersClient(), Customer, CustomersTree(), emptyForm(), Field(), Form (+13 more)

### Community 45 - "bomTemplates.ts"
Cohesion: 0.19
Nodes (22): BomTemplateEditor(), ItemBomEditor(), sourceStyle, addBomTemplateLine(), BomTemplateRow, listAvailableQuantityFields(), listBomTemplateLines(), listComponentItems() (+14 more)

### Community 46 - "production/client.tsx"
Cohesion: 0.12
Nodes (15): InspectorRejectedPage(), getColorIndicator(), OrdersClient(), OrdersClientProps, PipelineBadge(), StatusBadge(), SearchClient(), CustomerOption (+7 more)

### Community 47 - "SpecDataGrid.tsx"
Cohesion: 0.17
Nodes (20): SpecDataGrid(), SpecRow, CsvField, csvHeader(), csvOptionSheet(), csvSampleRow(), FIXED, parseCsvRow() (+12 more)

### Community 48 - "InventoryClient.tsx"
Cohesion: 0.12
Nodes (15): InventoryClient(), NewLocation(), STOCK_MODAL_COPY, StockModalType, Tab, TABS, ADJUSTMENT_TYPES, createDispatch() (+7 more)

### Community 49 - "seed.ts"
Cohesion: 0.13
Nodes (15): BlueprintSeed, CODE_PREFIX, codeCounters, hashPin(), main(), prisma, seedItemGroups(), main() (+7 more)

### Community 50 - "bootstrap_seed.mjs"
Cohesion: 0.09
Nodes (15): colorNames, customerNames, DEFAULT_DEPARTMENTS, designSpec, ensureVariant(), fabricItems, firstNames, item() (+7 more)

### Community 51 - "Surface.tsx"
Cohesion: 0.15
Nodes (11): QCFloorClient(), SearchResults, EmployeeProfilePage(), Surface(), OrderFlow(), ProductionCard(), ProductionCardProps, QcState (+3 more)

### Community 52 - "lib/types.ts"
Cohesion: 0.09
Nodes (22): AppData, AssignmentDraft, AuditLog, BootstrapPayload, Checkpoint, CheckpointResponse, Customer, CustomerDraft (+14 more)

### Community 53 - "phoneKey"
Cohesion: 0.18
Nodes (14): main(), prisma, HqLayout(), parsePhoneList(), phoneKey(), samePhone(), allowlist(), Denial (+6 more)

### Community 54 - "prisma.ts"
Cohesion: 0.11
Nodes (8): dynamic, POOL_LIMIT, pooledUrl(), prismaClientSingleton(), TenantContext, checkOpeningSop(), SopVerdict, startOfToday()

### Community 55 - "diningOrders.ts"
Cohesion: 0.15
Nodes (20): Line, MenuCategory, MenuItem, Method, METHODS, STATE_STYLE, Ticket, isOrderCancellable() (+12 more)

### Community 56 - "mock_seed.mjs"
Cohesion: 0.11
Nodes (13): colorNames, customerNames, designSpec, ensureVariant(), fabricItems, firstNames, item(), lastNames (+5 more)

### Community 57 - "AssetDetailClient.tsx"
Cohesion: 0.20
Nodes (17): Asset, AssetDetailClient(), Log, Schedule, STATUSES, TYPES, AssetInput, createAsset() (+9 more)

### Community 58 - "hasModule"
Cohesion: 0.21
Nodes (17): SchedulingPage(), isoDay(), SchedulingClient(), dynamic, WorkerSchedulePage(), hasModule(), copyWeek(), deleteSchedule() (+9 more)

### Community 59 - "events.ts"
Cohesion: 0.19
Nodes (16): isFailingQcScore(), QC_FAIL_THRESHOLD, qcAuditScore(), QcScore, emitEvent(), escapeHtml(), EventKey, EVENTS (+8 more)

### Community 60 - "devDependencies"
Cohesion: 0.11
Nodes (19): eslint, devDependencies, eslint, @playwright/test, tailwindcss, @tailwindcss/postcss, tsx, @types/node (+11 more)

### Community 61 - "assignments.ts"
Cohesion: 0.15
Nodes (14): dynamic, GET(), runtime, channel(), g, LiveChange, publishChange(), subscribeChange() (+6 more)

### Community 62 - "orders.ts"
Cohesion: 0.22
Nodes (12): ensureFactoryDepartments(), resolveOrderTemplate(), allocateFinishedStock(), approveSalesOrder(), assessOnOrderStock(), createBatchOrders(), createCustomer(), createOrder() (+4 more)

### Community 63 - "toast.tsx"
Cohesion: 0.11
Nodes (12): Checkpoint, Inspection, ServiceInspectionClient(), StatusPill(), LaunchOutletDialog(), CheckpointPhoto(), ItemMetadata, ItemMetadataForm() (+4 more)

### Community 64 - "VariantDescInput.tsx"
Cohesion: 0.16
Nodes (18): DesignOption, matchesAll(), Option, Segment, segmentsFromValue(), SpecConstraint, specKey(), Stage (+10 more)

### Community 65 - "VERITY_HQ_PHONES"
Cohesion: 0.12
Nodes (18): /verity HQ Console, Module Entitlements, Phone + 4-digit PIN login, requireHqAction guard, Server Action Auth Surface, Site, Tenant Scoping by factoryId, Verity Core Data Model (+10 more)

### Community 66 - "ReportsPackClient.tsx"
Cohesion: 0.18
Nodes (12): OwnerReportsPage(), download(), ReportsPackClient(), Tab, TABS, Navbar(), NavItem, navItems (+4 more)

### Community 67 - "dependencies"
Cohesion: 0.12
Nodes (17): @aws-sdk/client-s3, clsx, framer-motion, inngest, dependencies, @aws-sdk/client-s3, clsx, framer-motion (+9 more)

### Community 68 - "brand.ts"
Cohesion: 0.13
Nodes (12): contentType, size, contentType, size, BRAND_ACCENT, BRAND_ACCENT_DARK, BRAND_BACKGROUND, BRAND_DESCRIPTION (+4 more)

### Community 69 - "assistantTools.ts"
Cohesion: 0.18
Nodes (12): AssistantPanel(), Message, ProposalCard(), ASSISTANT_TOOLS, BY_NAME, PriceChangeProposal, stripTenantKeys(), TENANT_KEYS (+4 more)

### Community 70 - "variant-descriptor.ts"
Cohesion: 0.18
Nodes (16): couldBeSpecToken(), FIELD_WEIGHTS, formatVariant(), formatVariantCompact(), listVariantBases(), matchesQuery(), scoreDescriptor(), scoreMatch() (+8 more)

### Community 71 - "scripts"
Cohesion: 0.12
Nodes (16): scripts, build, build:analyze, db:migrate, db:reset, db:sync, dev, lint (+8 more)

### Community 72 - "Input"
Cohesion: 0.17
Nodes (8): CheckpointInput, SectionInput, TemplateInput, Input(), components, layouts, tokens, typography

### Community 73 - "production-status.ts"
Cohesion: 0.16
Nodes (11): deriveProductionStatus(), isDispatchReady(), isJobCardOnFloor(), JOB_CARD_DONE, KIND_STATUS, PRODUCTION_STATUS_LABELS, PRODUCTION_STATUSES, ProductionStatus (+3 more)

### Community 74 - "ItemUnitsEditor.tsx"
Cohesion: 0.23
Nodes (11): ItemUnitsEditor(), UnitCell(), Units, NormalisedUnits, normaliseUnit(), normaliseUnits(), UnitInput, getItemUnits() (+3 more)

### Community 75 - "utils.ts"
Cohesion: 0.12
Nodes (9): FloatingDock(), FloatingDockItem, FloatingDockProps, Status, StatusPill(), StatusPillProps, AssignmentStatus, Role (+1 more)

### Community 76 - "markdown.ts"
Cohesion: 0.22
Nodes (11): Contents(), GuideClient(), GuidePage(), metadata, escapeHtml(), GuideHeading, inline(), isTableDivider() (+3 more)

### Community 77 - "kitchen/client.tsx"
Cohesion: 0.15
Nodes (12): KitchenClient(), NEXT_ACTION, QueueItem, QueueOrder, Ticket(), ReadyCard(), ReadyItem, ReadyOrder (+4 more)

### Community 78 - "compilerOptions"
Cohesion: 0.13
Nodes (15): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, module, moduleResolution (+7 more)

### Community 79 - "seed_designs.ts"
Cohesion: 0.16
Nodes (13): BOM_BY_FAMILY, CATALOGUE, CODE_PREFIX, COMMON_FINISHING, FABRIC_CONSUMPTION, ItemSpec, Line, main() (+5 more)

### Community 80 - "worker/layout.tsx"
Cohesion: 0.34
Nodes (6): WorkerLayout(), AutoRefresh(), isUserBusy(), IdleLogout(), LiveRefresh(), logoutUser()

### Community 81 - "root-providers.tsx"
Cohesion: 0.20
Nodes (7): metadata, viewport, PwaProvider(), RootProviders(), ThemeProvider(), CursorGlow(), initPostHog()

### Community 82 - "actions/billing.ts"
Cohesion: 0.32
Nodes (13): buildInvoiceFromWork(), createInvoice(), deleteInvoice(), exportPayrollCsv(), generatePayrollInputs(), LineItemInput, parseDate(), priceLines() (+5 more)

### Community 83 - "gen_rls_migration.mjs"
Cohesion: 0.21
Nodes (11): byName, counts, emit(), models, out, p(), parentLink(), parentLinkShallow() (+3 more)

### Community 84 - "verify/[id]/page.tsx"
Cohesion: 0.22
Nodes (7): QualityPassportPage(), PassportCard(), VerificationPanel(), VerifiedMoment(), EvidenceItem, EvidenceLightbox(), getPassportData()

### Community 85 - "ProjectDetailClient.tsx"
Cohesion: 0.17
Nodes (10): BLANK_TASK, BLANK_TIME, PRIORITIES, Project, PROJECT_STATUSES, Tab, TABS, TASK_STATUSES (+2 more)

### Community 86 - "ContributionEditor.tsx"
Cohesion: 0.39
Nodes (10): ContributionEditor(), addContribution(), ContributionOwner, ContributionRow, countItemsUsingOwner(), listContributions(), ownerWhere(), removeContribution() (+2 more)

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

### Community 91 - "exclude"
Cohesion: 0.22
Nodes (8): prisma, prisma, node_modules, playwright, playwright.config.ts, scripts, tmp_backup_verity, exclude

### Community 92 - "backfill-role-permissions.ts"
Cohesion: 0.25
Nodes (6): APPLY, prisma, AMBIGUOUS, RegistryKey, ROLE_REGISTRY_GRANTS, WITHHELD

### Community 93 - "VerityLogo.tsx"
Cohesion: 0.31
Nodes (3): CircularMarqueeLoader(), CircularMarqueeLoaderProps, VerityLogo()

### Community 94 - "SiteDetailClient.tsx"
Cohesion: 0.22
Nodes (7): Deployment, RosterSection(), Site, STATUSES, Tab, TABS, PriorityPill()

### Community 95 - "ItemSearchInput.tsx"
Cohesion: 0.36
Nodes (6): ItemSearchInput(), Props, countFinishedGoods(), ItemSearchResult, PRODUCIBLE_WHERE, searchFinishedGoods()

### Community 96 - "InstallPromptBanner.tsx"
Cohesion: 0.33
Nodes (6): InstallAction(), InstallPromptBanner(), BeforeInstallPromptEvent, PwaContext, PwaContextValue, usePwa()

### Community 97 - "useLanguage"
Cohesion: 0.42
Nodes (6): useLanguage(), BottomNav(), BottomNavItem, BottomNavProps, InspectorNav(), WorkerNav()

### Community 98 - "kitchen.test.ts"
Cohesion: 0.22
Nodes (5): SERVING_QUEUE_STATES, KITCHEN, kitchenCode, SERVING, servingCode

### Community 99 - "tenant-isolation.test.ts"
Cohesion: 0.28
Nodes (8): ACTIONS_DIR, argumentBlock(), Call, GUARDED_FILES, modelsWithFactoryId(), SCHEMA, SCOPE_OPENING, scopeOpeningCalls()

### Community 100 - "enrich_seed.ts"
Cohesion: 0.32
Nodes (7): CATALOGUE, CODE_PREFIX, ItemSpec, main(), nextCode(), prisma, uniqueSku()

### Community 101 - "seed_all_specs.mjs"
Cohesion: 0.25
Nodes (5): groupIds, o(), prisma, SPECS, v()

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

### Community 107 - "include"
Cohesion: 0.29
Nodes (7): **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, **/*.ts, **/*.tsx, include

### Community 108 - "enrich_usage.ts"
Cohesion: 0.29
Nodes (5): BOM_RECIPES, DEPT_CHECKLISTS, prisma, PRODUCT_QC, PRODUCT_TYPE_FIELDS

### Community 109 - "DepartmentFloorClient.tsx"
Cohesion: 0.38
Nodes (6): DepartmentFloorClient(), JobRow(), Reassign(), specLine(), StatCard(), statusTone()

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

### Community 114 - "FloorClient.tsx"
Cohesion: 0.40
Nodes (5): Dept, FloorClient(), Job, orderLine(), Stat()

### Community 115 - "lib"
Cohesion: 0.40
Nodes (5): dom, dom.iterable, esnext, webworker, lib

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

## Knowledge Gaps
- **814 isolated node(s):** `config`, `"TimelineEvent"`, `"Comment"`, `"Attachment"`, `"AuditLog"` (+809 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **72 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getOwnerUser` connect `getOwnerUser` to `masterData.ts`, `canUser`, `owner.ts`, `AddMasterDataClient.tsx`, `pricing.ts`, `guardModuleWrite`, `itemsFromSpec.ts`, `ColumnStrip.tsx`, `resolveAccess`, `queries/spec.ts`, `SpecStudioClient.tsx`, `getUserSession`, `guardModuleAction`, `qc-video.ts`, `primitives.tsx`, `owner-shell.tsx`, `booking/client.tsx`, `dining.ts`, `server/auth.ts`, `purchase.ts`, `resolve.ts`, `BillingClient.tsx`, `PageHeader.tsx`, `DepartmentsClient.tsx`, `jobCardAdapter.ts`, `dialog-service.tsx`, `bomTemplates.ts`, `production/client.tsx`, `SpecDataGrid.tsx`, `InventoryClient.tsx`, `seed.ts`, `Surface.tsx`, `diningOrders.ts`, `AssetDetailClient.tsx`, `hasModule`, `events.ts`, `orders.ts`, `ReportsPackClient.tsx`, `assistantTools.ts`, `production-status.ts`, `ItemUnitsEditor.tsx`, `worker/layout.tsx`, `actions/billing.ts`, `ContributionEditor.tsx`, `ItemSearchInput.tsx`?**
  _High betweenness centrality (0.141) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `masterData.ts`, `canUser`, `hq.ts`, `owner.ts`, `actions/stages.ts`, `ServiceWorkOrdersClient.tsx`, `primitives.tsx`, `owner-shell.tsx`, `inspector.ts`, `server/auth.ts`, `RestaurantWidgets.tsx`, `PageHeader.tsx`, `ManufacturingWidgets.tsx`, `dialog-service.tsx`, `Surface.tsx`, `VariantDescInput.tsx`, `ReportsPackClient.tsx`, `Input`, `utils.ts`, `markdown.ts`, `kitchen/client.tsx`, `OrderReviewDossier.tsx`, `VerityLogo.tsx`, `ItemSearchInput.tsx`, `useLanguage`, `DepartmentFloorClient.tsx`, `FloorClient.tsx`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `getUserSession()` connect `getUserSession` to `server/auth.ts`, `hasModule`, `owner.ts`, `actions/stages.ts`, `AddMasterDataClient.tsx`, `packs.ts`, `production/client.tsx`, `worker.ts`, `worker/layout.tsx`, `getOwnerUser`, `phoneKey`, `qc-video.ts`, `assignments.ts`, `inspector.ts`, `history.ts`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `config`, `"TimelineEvent"`, `"Comment"` to the rest of the system?**
  _814 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `masterData.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05070028011204482 - nodes in this community are weakly interconnected._
- **Should `00000000000000_baseline/migration.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.05171907140758154 - nodes in this community are weakly interconnected._
- **Should `20260727000000_init/migration.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.051189400782896716 - nodes in this community are weakly interconnected._