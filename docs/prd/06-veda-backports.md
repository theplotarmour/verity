# PRD 06: Veda Platform Backports & Optimizations

This document specifies the exact code adaptations and file-level diffs required to port the 10 most recent optimizations and features from the Veda codebase into Verity.

---

## 1. Category Schema Inheritance & BOM Mode
*   **Veda Source Commit**: `64ffb85` (category flags inheritance on create, parent context display)
*   **Target File**: [`src/server/actions/itemGroups.ts`](file:///D:/Code/verity/src/server/actions/itemGroups.ts)
*   **Details**: When creating a nested category, read the parent category flags (`isProducible`, `isSalable`, `isPurchasable`, `hasInventoryUnits`, and `bomMode`) and set them on the child category.
*   **Code Diff**:
    ```typescript
    // In src/server/actions/itemGroups.ts inside createItemGroup:
    let parentFlags = null;
    if (input.parentId) {
      const parent = await prisma.itemGroup.findFirst({
        where: { id: input.parentId, factoryId: user.factoryId },
        select: {
          itemType: true,
          isProducible: true,
          isSalable: true,
          isPurchasable: true,
          hasInventoryUnits: true,
          bomMode: true,
        },
      });
      if (!parent) return { error: "Parent group not found" };
      itemType = parent.itemType;
      parentFlags = {
        isProducible: parent.isProducible,
        isSalable: parent.isSalable,
        isPurchasable: parent.isPurchasable,
        hasInventoryUnits: parent.hasInventoryUnits,
        bomMode: parent.bomMode,
      };
    }
    
    // Use parentFlags during creation:
    const group = await prisma.itemGroup.create({
      data: {
        ...
        isProducible: parentFlags ? parentFlags.isProducible : (itemType === "FINISHED_PRODUCT" || itemType === "SEMI_FINISHED"),
        isSalable: parentFlags ? parentFlags.isSalable : (itemType === "FINISHED_PRODUCT" || itemType === "SPARE_PART"),
        isPurchasable: parentFlags ? parentFlags.isPurchasable : (itemType === "RAW_MATERIAL" || itemType === "CONSUMABLE" || itemType === "PACKAGING" || itemType === "SPARE_PART"),
        hasInventoryUnits: parentFlags ? parentFlags.hasInventoryUnits : true,
        bomMode: parentFlags ? parentFlags.bomMode : null,
      }
    });
    ```
*   **UI Changes**: Update [`src/components/spec/CategorySettings.tsx`](file:///D:/Code/verity/src/components/spec/CategorySettings.tsx) and [`SpecStudioClient.tsx`](file:///D:/Code/verity/src/app/owner/settings/master-data/studio/SpecStudioClient.tsx) to render the parent group name above category options when `parentId` is present.

---

## 2. Dynamic Spec-Driven Floor Progress & Stage Indicators
*   **Veda Source Commit**: `6dd5361` (stage indicator for ProductionCard based on active job card sequence)
*   **Target Files**: 
    *   [`src/components/factory/StageIndicator.tsx`](file:///D:/Code/verity/src/components/factory/StageIndicator.tsx)
    *   [`src/components/factory/ProductionCard.tsx`](file:///D:/Code/verity/src/components/factory/ProductionCard.tsx)
    *   [NEW] `src/lib/server/jobCardAdapter.ts`
*   **Details**: Instead of hardcoding stages (e.g. assuming a fixed seat-cover sequence), the stage indicator must dynamically resolve steps based on the item's specifications (BOM active job card sequence).
*   **Implementation**: 
    1.  Create `src/lib/server/jobCardAdapter.ts` to parse the specification sheet of a given production item and return the actual ordered list of production stages.
    2.  Update `StageIndicator` to accept the dynamic stages array and render active progress bubbles accordingly.

---

## 3. CSV Spec Option Auto-Creation
*   **Veda Source Commits**: `28be222`, `7efd04a`, `6db46c5` (auto-create missing options during CSV import)
*   **Target File**: [`src/server/actions/specCsv.ts`](file:///D:/Code/verity/src/server/actions/specCsv.ts)
*   **Details**: When a CSV of items/variants is imported, if any specification cell contains an option text (e.g. a color "Cherry Red") that does not exist in the dropdown options of that spec field, automatically insert the option record into the database.
*   **Implementation**: Inside `importGroupCsv`, if the field is `SELECT` or `REFERENCE` and the cell string matches no existing option, call `prisma.specFieldOption.create` to create it dynamically before mapping the row. Do not truncate shortCodes or rebuild names unpredictably.

---

## 4. Google Fonts Turbopack Build Patch
*   **Veda Source Commit**: `6d18ab6` (load Google Fonts via stylesheet import to resolve Turbopack 404 build failure)
*   **Target File**: [`src/app/layout.tsx`](file:///D:/Code/verity/src/app/layout.tsx)
*   **Details**: Loading Google Fonts using `next/font/google` can cause Turbopack to fail compile during local dev/builds. Replace with static CSS stylesheet import links pointing to the secure Google Fonts APIs.

---

## 5. Visual Funnels & Alert Queues
*   **Veda Source Commits**: `bf064cc` & `16c39bb` (visual active funnel and actionable alert queue)
*   **Target File**: [`src/components/dashboard/AutoComponentsDashboard.tsx`](file:///D:/Code/verity/src/components/dashboard/AutoComponentsDashboard.tsx)
*   **Details**: Port Veda's active production funnel visualization and operational warnings queue into the Auto Components dashboard component.
*   **Requirements**: Ensure that calculations for alert warnings (e.g., jobs delayed past their SLA, missing opening checklist alerts) match database records factually, verified by a schema integration test.

---

## 6. Supervisor/Owner Notification triggers
*   **Veda Source Commit**: `16c2155` (enable supervisor/owner notifications and add seed script)
*   **Target File**: [`src/server/actions/stages.ts`](file:///D:/Code/verity/src/server/actions/stages.ts) and [`qc.ts`](file:///D:/Code/verity/src/server/actions/qc.ts)
*   **Details**: Fire system notification entries to the owner/supervisor whenever:
    *   A production stage reports a critical machine failure or worker delay.
    *   A quality audit checklist fails (score < 70).
