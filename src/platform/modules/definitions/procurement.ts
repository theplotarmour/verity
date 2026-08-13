import { createModule } from "../sdk";

export const procurementModule = createModule({
  key: "procurement",
  version: "1.0.0",
  name: "Procurement",
  description:
    "Suppliers, purchase requests, orders, receipts and invoices.",
  requires: ["core","inventory"],
  permissions: [
  {
    "key": "supplier.manage",
    "label": "Manage suppliers",
    "group": "Procurement"
  },
  {
    "key": "purchase_request.create",
    "label": "Raise purchase requests",
    "group": "Procurement"
  },
  {
    "key": "purchase_order.create",
    "label": "Create purchase orders",
    "group": "Procurement"
  },
  {
    "key": "purchase_order.approve",
    "label": "Approve purchase orders",
    "group": "Procurement"
  },
  {
    "key": "purchase_receipt.record",
    "label": "Record receipts",
    "group": "Procurement"
  }
],
  navItems: [
  {
    "href": "/owner/purchase",
    "label": "Purchase",
    "iconKey": "cart",
    "group": "Shared Operations",
    "requires": "purchase_order.create",
    "sortOrder": 2
  }
],
});
