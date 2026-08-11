# PRD 05: Master Data Edit & Delete Refinements

This document maps out the specific missing edit and delete pathways across Master Data (Items, Categories) and Locations (Warehouse structures).

---

## 1. Gaps in Settings Workspace Explorer

The current file [`src/app/owner/settings/client.tsx`](file:///D:/Code/verity/src/app/owner/settings/client.tsx) contains hollow UI placeholder functions that trigger mock success toasts without calling any database or server-side actions:

```typescript
// Hollow Delete in src/app/owner/settings/client.tsx:194
async function handleDeleteItem() {
  if (!selectedItem) return;
  try {
    const { id, type } = selectedItem;
    // GAP: Does not call any server action to perform database delete!
    setSelectedItem(null);
    router.refresh();
    toast.success("Record deleted");
  } ...
}

// Hollow Update in src/app/owner/settings/client.tsx:177
const handleUpdateExplorerItem = async () => {
  if (!editingExplorerItem) return;
  const { id, type, name } = editingExplorerItem;
  if (!name.trim()) return;
  setLoading(true);
  try {
    // GAP: Does not call any server action to persist the name update!
    toast.success("Updated successfully");
    setEditingExplorerItem(null);
    router.refresh();
  } ...
};
```

### Action Plan
*   Import the correct server actions: `deleteItem`, `updateItem` (from `src/server/actions/items.ts`) and `removeColor`, `updateColor` (from `src/server/actions/masterData.ts`).
*   Rewrite `handleDeleteItem` to execute database deletion based on the item type.
*   Rewrite `handleUpdateExplorerItem` to execute the database update.

---

## 2. Gaps in Locations & Bin Management

The file [`src/server/actions/masterData.ts`](file:///D:/Code/verity/src/server/actions/masterData.ts) has actions to *create* nested warehouse structures, but is completely missing the update and delete actions.

### Action Plan
Implement the missing server actions in [`src/server/actions/masterData.ts`](file:///D:/Code/verity/src/server/actions/masterData.ts):
*   **Zones**: `updateWarehouseZone(id, name)`, `removeWarehouseZone(id)`
*   **Racks**: `updateWarehouseRack(id, name)`, `removeWarehouseRack(id)`
*   **Shelves**: `updateWarehouseShelf(id, name)`, `removeWarehouseShelf(id)`
*   **Bins**: `updateWarehouseBin(id, name)`, `removeWarehouseBin(id)`

For each delete action, perform defensive checks to block deletion if the location contains active inventory balances or is referenced in historical transactions.

---

## 3. Gaps in Item Detail Panel

The detailed item workspace [`src/app/owner/settings/master-data/item/[id]/page.tsx`](file:///D:/Code/verity/src/app/owner/settings/master-data/item/%5Bid%5D/page.tsx) renders all fields and specification mappings as a static list. It lacks an edit panel.

### Action Plan
*   Refactor the item detail page to support an **Edit Mode**.
*   Render inputs for basic metadata fields (Name, SKU, default UOM, brand, description, taxRate, HSN Code).
*   Add action triggers to invoke `updateItem` server action on submission.
