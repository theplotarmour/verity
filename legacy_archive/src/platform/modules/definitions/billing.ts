import { createModule } from "../sdk";

export const billingModule = createModule({
  key: "billing",
  version: "1.0.0",
  name: "Billing & Payroll",
  description:
    "Service invoices to clients, and payroll input summaries from attendance and timesheets.",
  requires: ["core","sales"],
  permissions: [
  {
    "key": "invoice.view",
    "label": "View invoices",
    "group": "Billing"
  },
  {
    "key": "invoice.manage",
    "label": "Create and send invoices",
    "group": "Billing"
  },
  {
    "key": "payroll.view",
    "label": "View payroll inputs",
    "group": "Billing"
  },
  {
    "key": "payroll.export",
    "label": "Export payroll",
    "group": "Billing"
  }
],
  navItems: [
  {
    "href": "/owner/billing",
    "label": "Billing",
    "iconKey": "receipt",
    "group": "Finance",
    "requires": "invoice.view"
  }
],
});
