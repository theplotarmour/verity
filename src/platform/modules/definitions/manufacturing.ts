import { createModule } from "../sdk";

export const manufacturingModule = createModule({
  key: "manufacturing",
  version: "1.0.0",
  name: "Manufacturing",
  description:
    "BOMs, blueprints, routing, work orders, job cards and shop-floor capture.",
  requires: ["core","inventory"],
  permissions: [
  {
    "key": "bom.view",
    "label": "View BOMs",
    "group": "Manufacturing"
  },
  {
    "key": "bom.manage",
    "label": "Manage BOMs",
    "group": "Manufacturing"
  },
  {
    "key": "work_order.create",
    "label": "Create work orders",
    "group": "Manufacturing"
  },
  {
    "key": "work_order.release",
    "label": "Release to floor",
    "group": "Manufacturing"
  },
  {
    "key": "production.jobs",
    "label": "Work assigned jobs",
    "group": "Shop floor"
  },
  {
    "key": "production.supervise",
    "label": "Supervise a department",
    "group": "Shop floor"
  }
],
  navItems: [
  {
    "href": "/owner/production",
    "label": "Production",
    "iconKey": "wrench",
    "group": "Production",
    "requires": "work_order.create",
    "sortOrder": 2
  },
  {
    "href": "/owner/floor",
    "label": "Floor",
    "iconKey": "flask",
    "group": "Production",
    "requires": "production.jobs",
    "sortOrder": 3
  }
],
});
