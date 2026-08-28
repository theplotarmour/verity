# Verity Platform - Page-by-Page User Flow and Functionality Report

## 1. Platform Operator Flow (`src/app/(hq)/hq/`)

**Target User:** Platform Operator (HQ / System Admin)

- **Clients / Tenants Dashboard (`/hq/clients/[tenantId]/page.tsx`)**
  - **Target User:** Operator
  - **Layout & Features:** Main dashboard for a specific tenant, listing organizations, modules, people, and roles.
  - **Command/Query Keys:** `verity.platform.list_people`, `verity.platform.list_roles`, `verity.platform.list_organizations`, `verity.platform.list_modules`
  - **Dependencies:** Requires a valid `tenantId`.

- **Organizations Admin (`/hq/clients/[tenantId]/organizations/page.tsx`, `OrganizationsAdmin.tsx`)**
  - **Target User:** Operator
  - **Layout & Features:** Interface to list, create, and update organizational structures for a tenant.
  - **Command/Query Keys:** `verity.platform.list_organizations`, `verity.platform.create_organization`, `verity.platform.update_organization`

- **Modules Admin (`/hq/clients/[tenantId]/modules/page.tsx`, `ModulesAdmin.tsx`)**
  - **Target User:** Operator
  - **Layout & Features:** Lists available modules and toggles their capability states for the client workspace.
  - **Command/Query Keys:** `verity.platform.list_modules`, `verity.platform.set_capability_state`

- **Operations Snapshot (`/hq/clients/[tenantId]/operations/page.tsx`)**
  - **Target User:** Operator
  - **Layout & Features:** Detailed view/snapshot of ongoing operations inside the tenant.
  - **Command/Query Keys:** `verity.platform.operations_snapshot`

- **People Admin (`/hq/clients/[tenantId]/people/page.tsx`, `PeopleAdmin.tsx`)**
  - **Target User:** Operator
  - **Layout & Features:** View, invite, assign roles, set state (active/inactive), and revoke membership for users.
  - **Command/Query Keys:** `verity.platform.list_people`, `verity.platform.invite_person`, `verity.platform.assign_role`, `verity.platform.set_person_state`, `verity.platform.revoke_membership`

- **Roles & Permissions Admin (`/hq/clients/[tenantId]/roles/page.tsx`, `RolesAdmin.tsx`)**
  - **Target User:** Operator
  - **Layout & Features:** Role creation, granting/revoking permissions, and role composition.
  - **Command/Query Keys:** `verity.platform.list_roles`, `verity.platform.list_grantable_entities`, `verity.platform.create_role`, `verity.platform.grant_permission`, `verity.platform.revoke_permission`, `verity.platform.compose_role`

- **Settings / Configuration (`/hq/clients/[tenantId]/settings/page.tsx`, `SettingsAdmin.tsx`)**
  - **Target User:** Operator
  - **Layout & Features:** Apply tenant-level configurations.
  - **Command/Query Keys:** `verity.platform.list_configuration`, `verity.platform.set_configuration`

## 2. Client Workspace Flow (`src/app/(shell)/`)

**Target User:** Client Workspace User (Operations, Finance, Managers)

- **General Shell Page (`/page.tsx`)**
  - **Target User:** Client
  - **Layout & Features:** Default landing for the workspace. Loads assets and configurations.
  - **Dependencies:** Loads core platform configuration states.

- **Capabilities Controls (`/capabilities/CapabilityControls.tsx`)**
  - **Target User:** Client Admin
  - **Layout & Features:** Local toggles for capability states.
  - **Command/Query Keys:** `verity.platform.set_capability_state`

- **Configuration Editor (`/configuration/ConfigurationEditor.tsx`)**
  - **Target User:** Client Admin
  - **Layout & Features:** Client-side specific configuration editing.
  - **Command/Query Keys:** `verity.platform.set_configuration`

- **Approval Queue (`/approvals/ApprovalQueue.tsx`)**
  - **Target User:** Client Approver/Manager
  - **Layout & Features:** List of pending approvals with decision actions.
  - **Command/Query Keys:** `verity.approval.decide`

- **Asset Management (`/assets/[id]/AssetActions.tsx`, `/assets/[id]/EvidencePanel.tsx`)**
  - **Target User:** Client Operator
  - **Layout & Features:** Change asset state and capture evidence on an asset.
  - **Command/Query Keys:** `verity.asset.change_state`, `verity.evidence.capture`

- **Catalogue Admin (`/catalogue/CatalogueAdmin.tsx`)**
  - **Target User:** Client Admin/Manager
  - **Layout & Features:** Plywood domain catalogue management (brands, products).
  - **Command/Query Keys:** `verity.plywood.create_brand`, `verity.plywood.set_brand_active`, `verity.plywood.create_product`, `verity.plywood.set_product_active`, `verity.plywood.edit_product`

- **Locations Management (`/locations/CreateLocationForm.tsx`, `/locations/[id]/CustomFieldsPanel.tsx`)**
  - **Target User:** Client Admin
  - **Layout & Features:** Create locations and define custom fields (places, geofences).
  - **Command/Query Keys:** `verity.location.create_location`, `verity.location.set_custom_fields`

- **Dine-in: Floor & Setup (`/floor/FloorPlan.tsx`, `/floor/[orderId]/OrderPad.tsx`, `/floor/setup/FloorEditor.tsx`)**
  - **Target User:** Floor Staff / Manager
  - **Layout & Features:** Setup tables, zones; manage orders, add order lines, move tables.
  - **Command/Query Keys:** `verity.dinein.move_table`, `verity.dinein.create_order`, `verity.dinein.add_order_lines`, `verity.dinein.advance_order_line`, `verity.dinein.place_order`, `verity.dinein.cancel_order`, `verity.dinein.position_table`, `verity.dinein.define_zone`, `verity.dinein.define_table`

- **Dine-in: Counter & Billing (`/counter/BillableOrders.tsx`, `/counter/[billId]/BillView.tsx`)**
  - **Target User:** Cashier
  - **Layout & Features:** Generate bills from orders, apply discounts, record payments, and settle bills.
  - **Command/Query Keys:** `verity.dinein.generate_bill`, `verity.dinein.record_payment`, `verity.dinein.apply_bill_discount`, `verity.dinein.settle_bill`

- **Dine-in: Kitchen Board (`/kitchen/KitchenBoard.tsx`)**
  - **Target User:** Kitchen Staff
  - **Layout & Features:** View incoming orders and advance order lines (status updates).
  - **Command/Query Keys:** `verity.dinein.advance_order_line`

- **Dine-in: Menu Admin (`/menu/MenuAdmin.tsx`)**
  - **Target User:** Manager
  - **Layout & Features:** Create menu categories, menu items, and activate them.
  - **Command/Query Keys:** `verity.dinein.create_menu_category`, `verity.dinein.create_menu_item`, `verity.dinein.set_menu_item_active`

- **Plywood: Logistics (`/logistics/LogisticsControl.tsx`)**
  - **Target User:** Logistics Staff
  - **Layout & Features:** Manage transporters, carriers, dispatch shipments, confirm delivery, report losses.
  - **Command/Query Keys:** `verity.plywood.create_transporter`, `verity.plywood.create_shipment`, `verity.plywood.dispatch_shipment`, `verity.plywood.confirm_delivery`, `verity.plywood.assign_carrier`, `verity.plywood.report_shipment_lost`

- **Plywood: Finance Desk (`/finance/FinanceDesk.tsx`)**
  - **Target User:** Finance Admin
  - **Layout & Features:** Invoicing and payments.
  - **Command/Query Keys:** `verity.plywood.raise_purchase_invoice`, `verity.plywood.raise_sales_invoice`, `verity.plywood.record_payment`

- **Plywood: Godowns / Inventory (`/godowns/GodownRacks.tsx`)**
  - **Target User:** Warehouse Staff
  - **Layout & Features:** Manage warehouse racks.
  - **Command/Query Keys:** `verity.plywood.define_godown_rack`, `verity.plywood.set_godown_rack_active`

- **Plywood: Purchase Desk (`/purchases/PurchaseDesk.tsx`)**
  - **Target User:** Purchasing Agent
  - **Layout & Features:** Supplier management, purchase orders, submitting/canceling orders, setting supplier prices.
  - **Command/Query Keys:** `verity.plywood.create_supplier`, `verity.plywood.set_supplier_price`, `verity.plywood.create_purchase_order`, `verity.plywood.submit_purchase_order`, `verity.plywood.cancel_purchase_order`
