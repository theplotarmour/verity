import { createModule } from "../sdk";

export const inventoryModule = createModule({
  key: "inventory",
  version: "1.0.0",
  name: "Inventory",
  description:
    "Items, warehouses, bins, stock ledger, reservations and valuation.",
  requires: ["core"],
  permissions: [
  {
    "key": "item.view",
    "label": "View items",
    "group": "Inventory"
  },
  {
    "key": "item.manage",
    "label": "Manage items",
    "group": "Inventory"
  },
  {
    "key": "stock.view",
    "label": "View stock",
    "group": "Inventory"
  },
  {
    "key": "stock.adjust",
    "label": "Adjust stock",
    "group": "Inventory"
  },
  {
    "key": "stock.transfer",
    "label": "Transfer stock",
    "group": "Inventory"
  },
  {
    "key": "warehouse.manage",
    "label": "Manage warehouses",
    "group": "Inventory"
  }
],
  navItems: [
  {
    "href": "/owner/inventory",
    "label": "Inventory",
    "iconKey": "package",
    "group": "Shared Operations",
    "requires": "stock.view"
  }
],
});
