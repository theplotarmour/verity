# Graph Report - d:\Code\verity  (2026-08-09)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1923 nodes · 4848 edges · 155 communities (99 shown, 56 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.62)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e6e81f7f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- worker/layout.tsx
- toast.tsx
- ColumnStrip.tsx
- hq.ts
- seed-carxen.ts
- getOwnerUser
- PurchaseClient.tsx
- itemsFromSpec.ts
- cn
- actions/stages.ts
- primitives.tsx
- AddMasterDataClient.tsx
- ItemBomEditor.tsx
- queries/spec.ts
- masterData.ts
- qc-video.ts
- server/auth.ts
- owner-shell.tsx
- descriptor.equivalence.test.ts
- Surface.tsx
- spec/types.ts
- worker.ts
- ItemsTree.tsx
- DepartmentsClient.tsx
- master-data/page.tsx
- prisma.ts
- lib/types.ts
- server/permissions.ts
- SpecDataGrid.tsx
- devDependencies
- bootstrap_seed.mjs
- getUserSession
- jobCardAdapter.ts
- mock_seed.mjs
- inventory.ts
- dispatch.ts
- VariantDescInput.tsx
- inspector.ts
- brand.ts
- scripts
- InventoryClient.tsx
- OrderSpecCard.tsx
- variant-descriptor.ts
- dashboard/page.tsx
- compilerOptions
- seed_designs.ts
- verify/[id]/page.tsx
- gen_rls_migration.mjs
- production/client.tsx
- hashPin
- ItemUnitsEditor.tsx
- SpecCombobox.tsx
- orders.ts
- label/[id]/page.tsx
- stockMovements.ts
- settings/client.tsx
- ItemSearchInput.tsx
- dependencies
- exclude
- OrderReviewDossier.tsx
- enrich_seed.ts
- seed_plotarmour.mjs
- locations.ts
- combinations.ts
- orderFields.ts
- rules
- generate_verity_docs.py
- include
- enrich_usage.ts
- seed_all_specs.mjs
- reports/page.tsx
- package.json
- FloorClient.tsx
- DepartmentFloorClient.tsx
- lib
- db_state.mjs
- seed_group_defaults.mjs
- seed_seatcover_spec.mjs
- timing.mts
- verify_login.mjs
- labels/page.tsx
- inventory-of-db.mts
- verify.mts
- sw.js/route.ts
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
- ProgressRing.tsx
- theme.ts
- clsx
- @aws-sdk/s3-request-presigner
- dayjs
- eslint.config.mjs
- @fontsource/inter
- @fontsource/noto-sans-devanagari
- framer-motion
- gsap
- idb
- inngest
- jose
- lucide-react
- next-themes
- posthog-js
- qrcode
- react
- react-dom
- @sentry/nextjs
- serwist
- @serwist/next
- @supabase/ssr
- @supabase/supabase-js
- tailwind-merge
- tailwindcss-animate
- @types/papaparse
- zod
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

## God Nodes (most connected - your core abstractions)
1. `getOwnerUser` - 269 edges
2. `getUserSession()` - 100 edges
3. `cn()` - 88 edges
4. `Button()` - 48 edges
5. `toast` - 34 edges
6. `Surface()` - 32 edges
7. `toWorkerJob()` - 31 edges
8. `revalidateMasterPaths()` - 27 edges
9. `Badge()` - 25 edges
10. `canUser()` - 25 edges

## Surprising Connections (you probably didn't know these)
- `describeSpecDetails()` --indirect_call--> `v()`  [INFERRED]
  src/lib/server/specUtils.ts → scripts/seed_all_specs.mjs
- `exclude` --extends--> `prisma`  [EXTRACTED]
  tsconfig.json → package.json
- `make()` --calls--> `createItemFromSpecFor()`  [EXTRACTED]
  prisma/seed-carxen.ts → src/server/internal/itemEngine.ts
- `main()` --calls--> `hashPin()`  [EXTRACTED]
  scripts/onboard_jmd_impex.ts → src/lib/server/hash.ts
- `makeItem()` --calls--> `specHash()`  [EXTRACTED]
  scripts/seed_demo_items.mts → src/lib/spec/hash.ts

## Import Cycles
- None detected.

## Communities (155 total, 56 thin omitted)

### Community 0 - "worker/layout.tsx"
Cohesion: 0.05
Nodes (47): inter, metadata, notoSansDevanagari, viewport, OwnerLayout(), WorkerLayout(), WorkerSettingsClient(), InstallAction() (+39 more)

### Community 1 - "toast.tsx"
Cohesion: 0.06
Nodes (52): BLANK, CustomerRow, CustomersClient(), Group, MobileGroupRail(), Group, TemplateEditor(), SubTree() (+44 more)

### Community 2 - "ColumnStrip.tsx"
Cohesion: 0.06
Nodes (47): ColumnCard(), ColumnStrip(), SchemaEditor(), StripGroup, Group, LinkableGroup, SpecFieldEditor(), BUILTIN_COLUMNS (+39 more)

### Community 3 - "hq.ts"
Cohesion: 0.09
Nodes (38): GET(), hashPassword(), GET(), requireMaintenanceToken(), disableModule(), enableModules(), entitledModules(), hasModule() (+30 more)

### Community 4 - "seed-carxen.ts"
Cohesion: 0.09
Nodes (47): cleanStructure(), COLOURS, created, Ctx, CUSTOMERS, DEFAULT_ROUTE, DEPARTMENTS, DESIGNS (+39 more)

### Community 5 - "getOwnerUser"
Cohesion: 0.09
Nodes (37): CustomersPage(), DepartmentFloorClient(), DepartmentFloorPage(), FloorPage(), OrderTakingPage(), getColorIndicator(), OrdersClient(), OwnerOrdersPage() (+29 more)

### Community 6 - "PurchaseClient.tsx"
Cohesion: 0.08
Nodes (38): dynamic, GET(), runtime, PurchasePage(), PurchaseClient(), emitEvent(), escapeHtml(), EventKey (+30 more)

### Community 7 - "itemsFromSpec.ts"
Cohesion: 0.11
Nodes (34): prisma, prisma, o(), BomEdit, isAttributeGroup(), writeBomEdits(), specHash(), identityOf() (+26 more)

### Community 8 - "cn"
Cohesion: 0.08
Nodes (27): BlueprintBuilderClient(), TeamClient(), UserWithStats, Table, TableBody, TableCell, TableHead, TableHeader (+19 more)

### Community 9 - "actions/stages.ts"
Cohesion: 0.13
Nodes (38): ApproveActions(), dynamic, SupervisorStagePage(), ChecklistRow(), ChecklistState, idbDel(), idbGet(), idbPut() (+30 more)

### Community 10 - "primitives.tsx"
Cohesion: 0.08
Nodes (16): AddEmployeeForm(), RemoveEmployeeButton(), ResetPinButton(), OrderTimeline(), TYPE_STYLES, Button(), Card(), EmptyState() (+8 more)

### Community 11 - "AddMasterDataClient.tsx"
Cohesion: 0.11
Nodes (28): AddMasterDataClient(), Group, panelOf(), StructuredValue, StructuredVariantForm(), NamePreviewBar(), SpecCombobox(), Props (+20 more)

### Community 12 - "ItemBomEditor.tsx"
Cohesion: 0.14
Nodes (31): BomTemplateEditor(), ContributionEditor(), ItemBomEditor(), sourceStyle, addContribution(), ContributionOwner, ContributionRow, countItemsUsingOwner() (+23 more)

### Community 13 - "queries/spec.ts"
Cohesion: 0.10
Nodes (29): ItemDetailPage(), DeleteItemButton(), BomContributionShape, BomLine, BomOverrideShape, BomSource, BomTemplateLineShape, expandBomTemplate() (+21 more)

### Community 14 - "masterData.ts"
Cohesion: 0.12
Nodes (33): DEFAULT_MATERIAL_CATEGORY, FABRIC_CATEGORY, createItemInRootCategory(), guardDelete(), addCatalogItem(), addColor(), addMaterial(), addMaterialCategory() (+25 more)

### Community 15 - "qc-video.ts"
Cohesion: 0.14
Nodes (22): QcVideoCapture(), readDuration(), STORAGE_ALLOWED_EXTENSIONS, STORAGE_ALLOWED_MIME_TYPES, STORAGE_BUCKET, STORAGE_MAX_BYTES, VIDEO_ALLOWED_EXTENSIONS, VIDEO_ALLOWED_MIME_TYPES (+14 more)

### Community 16 - "server/auth.ts"
Cohesion: 0.10
Nodes (25): POST(), HomePage(), dynamic, SupervisorHistoryPage(), Bucket, BUCKET_LABEL, BUCKET_TONE, HistoryClient() (+17 more)

### Community 17 - "owner-shell.tsx"
Cohesion: 0.08
Nodes (21): HomeClient(), InspectorVerifiedPage(), NavGroup, navGroups, NavItem, navItems, NotificationItem, OwnerShell() (+13 more)

### Community 18 - "descriptor.equivalence.test.ts"
Cohesion: 0.09
Nodes (29): DescriptorSpec, DescriptorValues, ALL, ARMRESTS, BRANDS, DESIGNS, FABRICS, GENERATIONS (+21 more)

### Community 19 - "Surface.tsx"
Cohesion: 0.15
Nodes (10): dynamic, Tab, TABS, SearchResults, MemberWithStats, Metric(), PageHeader(), Surface() (+2 more)

### Community 20 - "spec/types.ts"
Cohesion: 0.16
Nodes (23): groupByName, makeItem(), prisma, descendantIds(), FieldLike, FieldShape, groupChain(), GroupNode (+15 more)

### Community 21 - "worker.ts"
Cohesion: 0.12
Nodes (21): InspectorInboxPage(), dynamic, InspectorProfilePage(), dynamic, SupervisorHome(), Answer, getDB(), InspectionClient() (+13 more)

### Community 22 - "ItemsTree.tsx"
Cohesion: 0.12
Nodes (26): Category, emptyForm(), Field(), FieldDef, Form, Item, ItemsTree(), deriveItemType() (+18 more)

### Community 23 - "DepartmentsClient.tsx"
Cohesion: 0.14
Nodes (21): DepartmentModal(), DepartmentsClient(), Dept, Member, ROSTER_ROLES, RosterModal(), Template, UserRow (+13 more)

### Community 24 - "master-data/page.tsx"
Cohesion: 0.11
Nodes (18): BlueprintSeed, CODE_PREFIX, codeCounters, hashPin(), main(), prisma, seedItemGroups(), main() (+10 more)

### Community 25 - "prisma.ts"
Cohesion: 0.09
Nodes (12): dynamic, AssignmentRow(), POOL_LIMIT, pooledUrl(), prismaClientSingleton(), Db, DEFAULT_STAGES, TenantContext (+4 more)

### Community 26 - "lib/types.ts"
Cohesion: 0.08
Nodes (24): AppData, AssignmentDraft, AssignmentStatus, AuditLog, BootstrapPayload, Checkpoint, CheckpointResponse, Customer (+16 more)

### Community 27 - "server/permissions.ts"
Cohesion: 0.18
Nodes (18): SettingsClient(), OwnerSettingsPage(), PermissionMatrixCard(), ROLE_LABELS, ROLES, ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, KEY_TO_LEGACY (+10 more)

### Community 28 - "SpecDataGrid.tsx"
Cohesion: 0.17
Nodes (19): EditableSpecCell(), SpecDataGrid(), SpecRow, UnitCell(), Units, CsvField, csvHeader(), csvOptionSheet() (+11 more)

### Community 29 - "devDependencies"
Cohesion: 0.09
Nodes (23): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, tsx (+15 more)

### Community 30 - "bootstrap_seed.mjs"
Cohesion: 0.09
Nodes (15): colorNames, customerNames, DEFAULT_DEPARTMENTS, designSpec, ensureVariant(), fabricItems, firstNames, item() (+7 more)

### Community 31 - "getUserSession"
Cohesion: 0.15
Nodes (18): GET(), POST(), OwnerReviewInspectionPage(), GroupRow, Row, TemplateAppliesTo(), getUserSession(), addCheckpointAction() (+10 more)

### Community 32 - "jobCardAdapter.ts"
Cohesion: 0.19
Nodes (17): OwnerDashboard(), QCFloorClient(), QCFloorPage(), SearchClient(), SearchPage(), EmployeeProfilePage(), describeOrderItem(), jobCardInclude (+9 more)

### Community 33 - "mock_seed.mjs"
Cohesion: 0.11
Nodes (13): colorNames, customerNames, designSpec, ensureVariant(), fabricItems, firstNames, item(), lastNames (+5 more)

### Community 34 - "inventory.ts"
Cohesion: 0.21
Nodes (17): InventoryPage(), STOCK_STATUS_FIELD, STOCK_STATUS_LABEL, STOCK_STATUSES, StockStatus, dispatchOrder(), getInventoryOverview(), getItemBatches() (+9 more)

### Community 35 - "dispatch.ts"
Cohesion: 0.15
Nodes (16): LogisticsClient(), LogisticsPage(), deriveProductionStatus(), isDispatchReady(), KIND_STATUS, PRODUCTION_STATUS_LABELS, PRODUCTION_STATUSES, ProductionStatus (+8 more)

### Community 36 - "VariantDescInput.tsx"
Cohesion: 0.15
Nodes (19): DesignOption, matchesAll(), Option, Segment, segmentsFromValue(), SpecConstraint, specKey(), Stage (+11 more)

### Community 37 - "inspector.ts"
Cohesion: 0.29
Nodes (15): dynamic, ReviewInspectionPage(), ReviewCheckpoints(), Section, DepartmentKind, loadAssignedWorkers(), approveInspection(), canAccessInspection() (+7 more)

### Community 38 - "brand.ts"
Cohesion: 0.13
Nodes (12): contentType, size, contentType, size, BRAND_ACCENT, BRAND_ACCENT_DARK, BRAND_BACKGROUND, BRAND_DESCRIPTION (+4 more)

### Community 39 - "scripts"
Cohesion: 0.12
Nodes (16): scripts, build, build:analyze, db:migrate, db:reset, db:sync, dev, lint (+8 more)

### Community 40 - "InventoryClient.tsx"
Cohesion: 0.15
Nodes (8): InventoryClient(), STOCK_MODAL_COPY, StockModalType, Tab, TABS, ADJUSTMENT_TYPES, createDispatch(), adjustStock()

### Community 41 - "OrderSpecCard.tsx"
Cohesion: 0.18
Nodes (9): dynamic, SupervisorHistoryDetailPage(), HistoryDetailClient(), OUTCOME_TONE, dynamic, WorkerHistoryDetailPage(), DesignReference(), OrderSpecCard() (+1 more)

### Community 42 - "variant-descriptor.ts"
Cohesion: 0.20
Nodes (14): couldBeSpecToken(), FIELD_WEIGHTS, formatVariant(), formatVariantCompact(), listVariantBases(), matchesQuery(), scoreDescriptor(), scoreMatch() (+6 more)

### Community 43 - "dashboard/page.tsx"
Cohesion: 0.19
Nodes (9): FactoryFeed(), FeedEvent, FloorProgressList(), ProductionCard(), ProductionCardProps, Stage, StageIndicator(), StageIndicatorProps (+1 more)

### Community 44 - "compilerOptions"
Cohesion: 0.13
Nodes (15): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, module, moduleResolution (+7 more)

### Community 45 - "seed_designs.ts"
Cohesion: 0.16
Nodes (13): BOM_BY_FAMILY, CATALOGUE, CODE_PREFIX, COMMON_FINISHING, FABRIC_CONSUMPTION, ItemSpec, Line, main() (+5 more)

### Community 46 - "verify/[id]/page.tsx"
Cohesion: 0.21
Nodes (7): QualityPassportPage(), PassportCard(), VerificationPanel(), VerifiedMoment(), EvidenceItem, EvidenceLightbox(), getPassportData()

### Community 47 - "gen_rls_migration.mjs"
Cohesion: 0.21
Nodes (11): byName, counts, emit(), models, out, p(), parentLink(), parentLinkShallow() (+3 more)

### Community 48 - "production/client.tsx"
Cohesion: 0.23
Nodes (7): InspectorRejectedPage(), OrdersClientProps, PipelineBadge(), StatusBadge(), OrderTypeBadge(), getStatusClasses(), titleCaseStatus()

### Community 49 - "hashPin"
Cohesion: 0.46
Nodes (12): MemberDetailClient(), can(), hashPin(), generateRandomPin(), inviteMember(), logAudit(), removeMember(), resetMemberPin() (+4 more)

### Community 50 - "ItemUnitsEditor.tsx"
Cohesion: 0.31
Nodes (9): ItemUnitsEditor(), NormalisedUnits, normaliseUnit(), normaliseUnits(), UnitInput, getItemUnits(), ItemUnits, listUsedUnits() (+1 more)

### Community 51 - "SpecCombobox.tsx"
Cohesion: 0.26
Nodes (8): FreeTextInput(), Props, Props, SpecSelect(), AnchorRect, computeDropdownPlacement(), DropdownPlacement, useDropdownPosition()

### Community 52 - "orders.ts"
Cohesion: 0.23
Nodes (11): resolveOrderTemplate(), allocateFinishedStock(), approveSalesOrder(), assessOnOrderStock(), createBatchOrders(), createCustomer(), createOrder(), createSalesOrder() (+3 more)

### Community 53 - "label/[id]/page.tsx"
Cohesion: 0.26
Nodes (8): ProductionLabelPage(), OrderInfo, ProductionLabel(), ensureProductionLabel(), getMaterialRequirement(), MaterialLine, MaterialRequirement, round2()

### Community 54 - "stockMovements.ts"
Cohesion: 0.29
Nodes (10): createStockEntry(), round2(), setStockQcStatus(), ensureDefaultBin(), ensureDefaultWarehouse(), issueMaterialsForWorkOrder(), receiveFinishedGoods(), getItemBom() (+2 more)

### Community 55 - "settings/client.tsx"
Cohesion: 0.29
Nodes (5): ConfirmDialog(), ConfirmDialogProps, layouts, tokens, typography

### Community 56 - "ItemSearchInput.tsx"
Cohesion: 0.31
Nodes (7): ItemSearchInput(), Props, VariantValue, countFinishedGoods(), ItemSearchResult, PRODUCIBLE_WHERE, searchFinishedGoods()

### Community 57 - "dependencies"
Cohesion: 0.22
Nodes (9): @aws-sdk/client-s3, next, dependencies, @aws-sdk/client-s3, next, papaparse, @prisma/client, papaparse (+1 more)

### Community 58 - "exclude"
Cohesion: 0.22
Nodes (8): prisma, prisma, node_modules, playwright, playwright.config.ts, scripts, tmp_backup_verity, exclude

### Community 59 - "OrderReviewDossier.tsx"
Cohesion: 0.31
Nodes (6): checklistFor(), ChecklistItem, DeptRow(), OrderReviewDossier(), Pill(), statusTone()

### Community 60 - "enrich_seed.ts"
Cohesion: 0.32
Nodes (7): CATALOGUE, CODE_PREFIX, ItemSpec, main(), nextCode(), prisma, uniqueSku()

### Community 61 - "seed_plotarmour.mjs"
Cohesion: 0.29
Nodes (7): DEPARTMENTS, GRANTS, hashPin(), main(), MODULES, prisma, ROLE_LABELS

### Community 62 - "locations.ts"
Cohesion: 0.39
Nodes (7): NewLocation(), createLocation(), deleteLocation(), LocationKind, renameLocation(), revalidate(), setLocationKind()

### Community 63 - "combinations.ts"
Cohesion: 0.36
Nodes (5): COMBINATION_CAP, CombinationResult, expandCombinations(), MultiSelection, widestSelection()

### Community 64 - "orderFields.ts"
Cohesion: 0.46
Nodes (6): asRecord(), AUTOMOTIVE_KEYS, LegacyOrderColumns, PREFER_DYNAMIC, readOrderFields(), writeOrderFields()

### Community 65 - "rules"
Cohesion: 0.29
Nodes (6): extends, rules, @next/next/no-img-element, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, next/core-web-vitals

### Community 66 - "generate_verity_docs.py"
Cohesion: 0.48
Nodes (6): Path, build_docs(), dedent(), main(), reset_docs(), write()

### Community 67 - "include"
Cohesion: 0.29
Nodes (7): **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, **/*.ts, **/*.tsx, include

### Community 68 - "enrich_usage.ts"
Cohesion: 0.29
Nodes (5): BOM_RECIPES, DEPT_CHECKLISTS, prisma, PRODUCT_QC, PRODUCT_TYPE_FIELDS

### Community 69 - "seed_all_specs.mjs"
Cohesion: 0.29
Nodes (4): groupIds, prisma, SPECS, v()

### Community 70 - "reports/page.tsx"
Cohesion: 0.48
Nodes (5): OwnerReportsPage(), download(), ReportsPackClient(), dayKey(), getReportsData()

### Community 71 - "package.json"
Cohesion: 0.33
Nodes (5): name, prisma, seed, private, version

### Community 72 - "FloorClient.tsx"
Cohesion: 0.40
Nodes (5): Dept, FloorClient(), Job, orderLine(), Stat()

### Community 73 - "DepartmentFloorClient.tsx"
Cohesion: 0.47
Nodes (5): JobRow(), Reassign(), specLine(), StatCard(), statusTone()

### Community 74 - "lib"
Cohesion: 0.40
Nodes (5): dom, dom.iterable, esnext, webworker, lib

### Community 75 - "db_state.mjs"
Cohesion: 0.40
Nodes (4): fcols, names, phase0, prisma

### Community 76 - "seed_group_defaults.mjs"
Cohesion: 0.40
Nodes (4): byName, CHAIN, prisma, route

### Community 78 - "timing.mts"
Cohesion: 0.40
Nodes (4): p, t0, t1, t2

### Community 80 - "labels/page.tsx"
Cohesion: 0.50
Nodes (3): Item, ItemLabelSheet(), InventoryLabelsPage()

### Community 81 - "inventory-of-db.mts"
Cohesion: 0.50
Nodes (3): configuration, p, records

## Knowledge Gaps
- **512 isolated node(s):** `extends`, `next/core-web-vitals`, `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-unused-vars`, `@next/next/no-img-element` (+507 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **56 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getOwnerUser` connect `getOwnerUser` to `worker/layout.tsx`, `toast.tsx`, `ColumnStrip.tsx`, `seed-carxen.ts`, `PurchaseClient.tsx`, `itemsFromSpec.ts`, `primitives.tsx`, `AddMasterDataClient.tsx`, `ItemBomEditor.tsx`, `queries/spec.ts`, `masterData.ts`, `server/auth.ts`, `Surface.tsx`, `spec/types.ts`, `ItemsTree.tsx`, `DepartmentsClient.tsx`, `master-data/page.tsx`, `server/permissions.ts`, `SpecDataGrid.tsx`, `getUserSession`, `jobCardAdapter.ts`, `inventory.ts`, `dispatch.ts`, `InventoryClient.tsx`, `dashboard/page.tsx`, `hashPin`, `ItemUnitsEditor.tsx`, `orders.ts`, `stockMovements.ts`, `ItemSearchInput.tsx`, `locations.ts`, `reports/page.tsx`, `labels/page.tsx`?**
  _High betweenness centrality (0.158) - this node is a cross-community bridge._
- **Why does `getUserSession()` connect `getUserSession` to `worker/layout.tsx`, `jobCardAdapter.ts`, `toast.tsx`, `hq.ts`, `inspector.ts`, `PurchaseClient.tsx`, `getOwnerUser`, `OrderSpecCard.tsx`, `primitives.tsx`, `actions/stages.ts`, `qc-video.ts`, `production/client.tsx`, `owner-shell.tsx`, `server/auth.ts`, `worker.ts`, `label/[id]/page.tsx`, `prisma.ts`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `worker/layout.tsx`, `toast.tsx`, `VariantDescInput.tsx`, `inspector.ts`, `getOwnerUser`, `FloorClient.tsx`, `DepartmentFloorClient.tsx`, `actions/stages.ts`, `primitives.tsx`, `dashboard/page.tsx`, `owner-shell.tsx`, `hashPin`, `Surface.tsx`, `worker.ts`, `ItemsTree.tsx`, `settings/client.tsx`, `ItemSearchInput.tsx`, `OrderReviewDossier.tsx`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `extends`, `next/core-web-vitals`, `@typescript-eslint/no-explicit-any` to the rest of the system?**
  _512 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `worker/layout.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05228070175438596 - nodes in this community are weakly interconnected._
- **Should `toast.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Should `ColumnStrip.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06448412698412699 - nodes in this community are weakly interconnected._