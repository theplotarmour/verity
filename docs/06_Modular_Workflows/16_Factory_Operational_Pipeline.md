# 16 Factory Operational Pipeline

This document is the canonical definition of the end-to-end operational pipeline for the Verity Factory Operating System. It defines the flow of products and information, the roles involved, the lifecycles of key documents (Passport, Inventory, QC), and the rules for the Draft Production Stage, Batching, and the Product Combination System.

---

## 1. Core Operating Philosophy: The Three Pillars

Every interface, role workspace, and process in the factory is designed around three fundamental questions to maintain focus and prevent cognitive overload:

1. **What do I need to do?** (Task / Queue) — Every role sees a clean, focused inbox or queue containing only their immediate responsibilities.
2. **What do I need to know?** (Passport / Blueprint) — Access is provided only to the context (measurements, templates, reference images) required to execute the current task.
3. **What happens when I'm done?** (Automatic Transition) — Completion triggers automatic routing, inventory ledger entries, and status updates, removing manual handoff friction.

---

## 2. Factory Flows

There are only two things flowing through the factory:
1. **Products** (Physical goods moving through departments, QC, packing, and dispatch)
2. **Information** (Passports, blueprints, timelines, and status updates)

All other systems (inventories, PRs, POs, reports, and team configurations) exist solely to support these two flows.

---

## 3. User Hierarchy & Daily Flows

### 1. Owner
* **Operational Scope**: High-level factory oversight, product catalogs, master data configuration, capacity management, inventory levels, reports, and exception handling.
* **Core Rule**: The owner must *never* manage individual production jobs unless an exception requires immediate attention.
* **Daily Flow**:
  * **Morning**: Review the Dashboard (attendance, production status, material alerts, delayed orders, active QC issues) and approve exceptions (e.g., purchase requests, leave).
  * **Throughout the Day**: Monitor key status metrics and act on exceptions/approvals.
  * **Evening**: Review summaries (production, QC, inventory, dispatch) and inspect tomorrow's planned capacity.

### 2. Factory Manager
* **Operational Scope**: Daily production planning, worker allocation, material availability check, line balancing, priority overrides, and escalation resolution. Converts demand into executable work.
* **Daily Flow**:
  * **Morning**: Review incoming orders, check real-time inventory and capacity, and release draft productions. Assign initial departments.
  * **Day**: Monitor department queues, resolve bottleneck delays, reassign workers as needed, split batches if parts are delayed, and resolve escalations.
  * **Evening**: Close completed jobs and review tomorrow's schedule.

### 3. Inventory Manager
* **Operational Scope**: Complete ownership of material movement. Responsible for receiving, warehouse management, material issue, transfers, adjustments, and stock verification.
* **Core Rule**: Inventory never directly initiates production; production requests materials, and inventory fulfills them.
* **Daily Flow**:
  * **Morning/Day**: Receive incoming raw materials, execute incoming QC on materials, put stock away into correct warehouse bins, and fulfill production material requests (issue to departments).
  * **Ad-hoc**: Process inventory adjustments (lost, damaged, wastage) and verify balances via cycle counts.
  * **Evening**: Perform end-of-day reconciliation and close the day's books.

### 4. Production Manager
* **Operational Scope**: Execution control. Releases production plans, assigns workers to jobs, tracks real-time progress, resolves execution delays, and monitors department queues.

### 5. Department Supervisor
* **Operational Scope**: Department-level execution (e.g., Cutting, Embroidery, Foam, Stitching, QC, Packing). Controls worker assignment within their department, batch allocation, quality checks before handing off, and rework routing.

### 6. Worker
* **Operational Scope**: Simple mobile-first experience. Workers never browse the general ERP.
* **Core Flow**:
  * View **Today's Jobs** -> **Accept** -> **View Passport & Reference Images** -> **Start** -> **Complete** -> **Upload Evidence (Photos)** -> **Move to Next Job**.

### 7. QC Inspector
* **Operational Scope**: Independent quality inspection of completed work.
* **Core Flow**:
  * Receive completed item from department queue -> Check **Blueprint, Measurements, Images, and defect checklist** -> Decide **PASS** (routes to Packing) or **FAIL** (records reason and routes to Rework).

### 8. Packing
* **Operational Scope**: Final verification and packaging of passed products.
* **Core Flow**:
  * Receive passed production -> Confirm **Components, Accessories, Labels, and Packaging** -> Move to **Finished Goods** status.

### 9. Dispatch
* **Operational Scope**: Post-production logistics.
* **Core Flow**:
  * Receive Finished Goods -> Choose destination (Warehouse / Store) -> Mark dispatch complete (automatically updates inventory and closes the Passport).

---

## 4. Complete Factory Lifecycle

```mermaid
graph TD
    M[Phase 1: Master Data Setup] --> O[Phase 2: Order & Draft Creation]
    O --> P[Phase 3: Production Planning & Release]
    P --> I[Phase 4: Material Issue]
    I --> D[Phase 5: Departmental Execution Flow]
    D --> Q[QC Inspector Decision]
    Q -- FAIL -- > R[Rework Loop]
    R --> D
    Q -- PASS --> PK[Packing & Finished Goods]
    PK --> DS[Dispatch & Passport Closure]
```

### Phase 1: Master Data (Pre-production Setup)
Must be configured in the system before production exists:
$$\text{Vehicles} \rightarrow \text{Products} \rightarrow \text{Variants} \rightarrow \text{Materials} \rightarrow \text{Designs} \rightarrow \text{Fabrics} \rightarrow \text{Colours} \rightarrow \text{Blueprints} \rightarrow \text{QC Templates} \rightarrow \text{Departments} \rightarrow \text{Workers}$$

### Phase 2: Order Creation (Draft State)
When a production order is created, the system automatically determines:
* Associated **Blueprint**
* **Bill of Materials (BOM)** (Required raw materials)
* Operational route steps (**Operations**)
* **Reference Images** and **QC checklists**
* **Estimated Time** for completion
* A new **Passport** (initialized in Draft)

### Phase 3: Production Planning & Release
The Production Manager checks:
* Today's orders in Draft
* Department capacity, material availability, and worker attendance
* Priority and sequencing
* **Release Action**: The manager releases Draft orders, pushing them into active department queues.

### Phase 4: Material Issue
* Production requests raw materials based on the BOM.
* Inventory Manager issues the materials (updates stock levels from **Raw Material** to **Production Inventory** to **Worker**).
* Calculations and ledger entries are handled automatically by the system.

### Phase 5: Department Flow
Every department follows an identical step-by-step workflow:
$$\text{Queue} \rightarrow \text{Supervisor Assigns Worker} \rightarrow \text{Worker Accepts} \rightarrow \text{Worker Starts} \rightarrow \text{Evidence Capture} \rightarrow \text{Worker Completes} \rightarrow \text{Supervisor Review} \rightarrow \text{Next Department}$$
Standard Department Order:
$$\text{Cutting} \rightarrow \text{Embroidery} \rightarrow \text{Foam} \rightarrow \text{Stitching} \rightarrow \text{QC} \rightarrow \text{Packing}$$

---

## 5. Draft Production Stage

To prevent premature floor execution, all newly created productions must start in the **Draft** stage.

### Rules & Behaviors:
* **Visibility**: Visible only to authorized roles (Owner, Managers). Completely hidden from worker queues and department supervisors.
* **Editability**: All details remain fully editable:
  * Edit customer and production metadata.
  * Modify quantities.
  * Update product and vehicle specifications.
  * Change priority.
  * Assign production type (e.g., Customer Order or Stock).
  * Merge productions into batches.
  * Remove productions from batches.
  * Delete Draft productions.
* **Release Trigger**: Only explicit release action by an authorized user transitions the order from `DRAFT` status to the active production workflow, making it visible to department queues.

---

## 6. Batch Production & Consolidation

Instead of running individual small orders, managers can select multiple Draft productions and combine them into a single **Production Batch** to maximize manufacturing throughput.

### Batch ID vs. Order ID:
A Batch represents a single execution group on the floor and has a unique `Batch ID`, while every production inside the batch continues to retain its own unique `Order ID / Production ID` to maintain complete traceability.
```
Batch ID (e.g., BATCH-00023)
├── Order ID 101 (Brezza × 4)
├── Order ID 118 (Brezza × 2)
└── Order ID 129 (Brezza × 5)
Total Production Quantity = 11
```

### Consolidation Rules:
* **Owner/Manager Batching**: The Owner or Factory Manager can select multiple Draft productions and send them together in a batch.
* **Consolidation Scenario**: For example, if the owner receives separate orders for the same model, generation, and variant—such as 4 Brezza, 2 Brezza, and 5 Brezza orders—they can choose to wait in the Draft stage to accumulate quantities, then club them and send them to the floor as a single batch of 11.
* **Mixed Production Support**: A single Production Batch supports a combination of **Customer Order Productions** and **Stock Productions** within the same batch.
* **Execution Boundary**: Job Cards are executed at the batch level to improve floor efficiency, but the system must *never* overwrite or merge individual passports, customer references, timelines, QC records, or dispatch histories.

---

## 7. Product Combination System

To prevent invalid vehicle configurations, Verity enforces a standardized product combination hierarchy. All data is stored in the database according to all permutations and combinations of these attributes:
$$\{Brand\} \ \{Model\} \ \{Generation\} \ \{Category\} \ \{Product\} \ \{Specs\} \ \{Fabric\} \ \{Design\}$$

### Specifications Definition:
* **SB / DB**: Single Bench / Double Bench.
* **Headrests**: 2 / 4 / 5 / 6 / 7 / 8 Headrests (HDR).
* **Armrest**: Presence and configuration of armrests (Arm).

### Intelligent Autocomplete in the Create Production Studio:
* **Autofill Dropdowns**: When creating productions in the **Create Production Studio**, users enter details and are presented with progressive autofill dropdown suggestions.
* **Invalid Prevention**: As each attribute is selected, the system filters the remaining available options and prevents selection of invalid combinations.
* **Automatic Specification Population**: Once the Brand, Model, Generation, and Product combination is selected, the system automatically populates all associated vehicle specifications (SB/DB, Headrests, Armrest configuration). The user is not required to manually configure these specifications.
* **Consistent Behavior**: This intelligent selection and auto-population of specifications functions identically across all production creation types:
  1. Single Production
  2. Batch Production
  3. Customer Order (On Order) Production
  4. Stock Production
* **Batch Defaults**: When creating a Batch Production, the system automatically populates all common vehicle and product specifications based on the selected product combination. Only the customization-specific attributes (Fabric, Design, Colour) require manual selection.

---

## 8. Document & Material Lifecycles

### The Passport (Product Identity)
The Passport is the single, persistent record of a product's manufacturing lifecycle.
* **Single Document Policy**: No duplicate documentation is created.
* **Accumulated Information**:
  * Customer & Vehicle data
  * Product & Blueprint specifications
  * Selected Fabric, Design, and Reference Images
  * Materials issued/consumed
  * Detailed Department Timeline (start time, completion time, assigned worker)
  * Evidence (photos uploaded by workers at each stage)
  * Remarks and QC History (inspectors, rejections, pass details)
  * Packing confirmation and Dispatch details
* **Lifecycle**: Opened at draft creation $\rightarrow$ Updated by each department and QC $\rightarrow$ Locked/Closed upon Dispatch.

### Inventory Lifecycle
Material movement follows a strict, traceable path with automatic ledger updates:
$$\text{Raw Material (Warehouse Bin)} \rightarrow \text{Reserved (Allocated to Order)} \rightarrow \text{Issued} \rightarrow \text{Production (Floor Work-in-Progress)} \rightarrow \text{Consumed} \rightarrow \text{Finished Goods} \rightarrow \text{Warehouse/Store} \rightarrow \text{Dispatched}$$
* Every single movement automatically generates a stock ledger entry.
* Keeps complete traceability from the Goods Receipt Note (GRN) to the final dispatch.

### QC Lifecycle
Independent QC inspectors review completed productions:
```
Production Complete
↓
Inspector Assigned
↓
Inspection (Blueprint, Measurements, Images, Defect Checklist)
├─► PASS ──► Packing ──► Finished Goods
└─► FAIL ──► Log Rework Reason ──► Return to Department Queue ──► QC Again
```
