import { createModule } from "../sdk";

export const salesModule = createModule({
  key: "sales",
  version: "1.0.0",
  name: "Sales",
  description:
    "Customers, sales orders, dispatch and delivery.",
  requires: ["core"],
  permissions: [
  {
    "key": "sales_order.view",
    "label": "View orders",
    "group": "Sales"
  },
  {
    "key": "sales_order.create",
    "label": "Create orders",
    "group": "Sales"
  },
  {
    "key": "sales_order.delete",
    "label": "Delete orders",
    "group": "Sales"
  },
  {
    "key": "sales_order.approve",
    "label": "Approve orders",
    "group": "Sales"
  },
  {
    "key": "dispatch.record",
    "label": "Record dispatch",
    "group": "Sales"
  },
  {
    "key": "customer.manage",
    "label": "Manage customers",
    "group": "Sales"
  }
],
  navItems: [
  {
    "href": "/owner/order-taking",
    "label": "Order Taking",
    "iconKey": "clipboard",
    "group": "Production",
    "requires": "sales_order.create"
  },
  {
    "href": "/owner/logistics",
    "label": "Logistics",
    "iconKey": "truck",
    "group": "Production",
    "requires": "dispatch.record",
    "sortOrder": 4
  }
],
});
