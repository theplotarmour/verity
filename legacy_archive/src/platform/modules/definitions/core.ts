import { createModule } from "../sdk";

export const coreModule = createModule({
  key: "core",
  version: "1.0.0",
  name: "Core",
  description:
    "Identity, roles, org settings, audit, notifications, files and the activity timeline.",
  alwaysOn: true,
  requires: [],
  permissions: [
  {
    "key": "dashboard.view",
    "label": "View dashboard",
    "group": "General"
  },
  {
    "key": "settings.access",
    "label": "Access settings",
    "group": "Administration"
  },
  {
    "key": "branding.access",
    "label": "Manage branding",
    "group": "Administration"
  },
  {
    "key": "billing.access",
    "label": "Access billing",
    "group": "Administration"
  },
  {
    "key": "master_data.access",
    "label": "Manage master data",
    "group": "Administration"
  },
  {
    "key": "team.manage",
    "label": "Manage team",
    "group": "People"
  },
  {
    "key": "team.assign_roles",
    "label": "Assign roles",
    "group": "People"
  },
  {
    "key": "org.transfer_ownership",
    "label": "Transfer ownership",
    "group": "Administration"
  },
  {
    "key": "reports.view",
    "label": "View reports",
    "group": "Reporting"
  },
  {
    "key": "reports.export",
    "label": "Export reports",
    "group": "Reporting"
  },
  {
    "key": "product_type.manage",
    "label": "Define product types",
    "group": "Administration"
  }
],
  navItems: [
  {
    "href": "/owner/dashboard",
    "label": "Dashboard",
    "iconKey": "home",
    "group": "Overview",
    "requires": "dashboard.view"
  },
  {
    "href": "/owner/reports",
    "label": "Reports",
    "iconKey": "chart",
    "group": "Finance",
    "requires": "reports.view",
    "sortOrder": 20
  },
  {
    "href": "/owner/master-data",
    "label": "Master Data",
    "iconKey": "database",
    "group": "Configure",
    "placement": "topbar",
    "requires": "master_data.access"
  },
  {
    "href": "/owner/customers",
    "label": "Customers",
    "iconKey": "building",
    "group": "Configure",
    "placement": "topbar",
    "requires": "customer.manage"
  },
  {
    "href": "/owner/team",
    "label": "Team",
    "iconKey": "users",
    "group": "Configure",
    "placement": "topbar",
    "requires": "team.manage"
  },
  {
    "href": "/owner/departments",
    "label": "Departments",
    "iconKey": "factory",
    "group": "Configure",
    "placement": "topbar",
    "requires": "team.manage"
  },
  {
    "href": "/owner/settings",
    "label": "Settings",
    "iconKey": "settings",
    "group": "Configure",
    "placement": "topbar",
    "requires": "settings.access"
  }
],
});
