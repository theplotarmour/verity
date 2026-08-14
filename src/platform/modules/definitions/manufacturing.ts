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
  // The auto-components floor, as widgets rather than a hardcoded page — so a
  // manufacturing tenant renders through the same engine every other vertical
  // uses. Gated on dashboard.view (the owner has it); a worker never sees them.
  dashboardWidgets: [
    {
      key: "factory_metrics",
      title: "Production metrics",
      requires: "dashboard.view",
      size: "wide",
      load: () => import("@/components/dashboard/widgets/ManufacturingWidgets").then((m) => ({ default: m.FactoryMetricsWidget })),
      sortOrder: 10,
    },
    {
      key: "production_funnel",
      title: "Where the work is",
      requires: "dashboard.view",
      size: "panel",
      load: () => import("@/components/dashboard/widgets/ManufacturingWidgets").then((m) => ({ default: m.ProductionFunnelWidget })),
      sortOrder: 20,
    },
    {
      key: "floor_progress",
      title: "Floor progress",
      requires: "dashboard.view",
      size: "panel",
      load: () => import("@/components/dashboard/widgets/ManufacturingWidgets").then((m) => ({ default: m.FloorProgressWidget })),
      sortOrder: 25,
    },
    {
      key: "factory_signals",
      title: "Factory signals",
      requires: "dashboard.view",
      size: "panel",
      load: () => import("@/components/dashboard/widgets/ManufacturingWidgets").then((m) => ({ default: m.FactorySignalsWidget })),
      sortOrder: 30,
    },
    {
      key: "quality_pareto",
      title: "Where quality fails",
      requires: "dashboard.view",
      size: "panel",
      load: () => import("@/components/dashboard/widgets/ManufacturingWidgets").then((m) => ({ default: m.QualityParetoWidget })),
      sortOrder: 40,
    },
    {
      key: "factory_feed",
      title: "Recent events",
      requires: "dashboard.view",
      size: "panel",
      load: () => import("@/components/dashboard/widgets/ManufacturingWidgets").then((m) => ({ default: m.FactoryFeedWidget })),
      sortOrder: 50,
    },
    {
      key: "operational_warnings",
      title: "Operational warnings",
      requires: "dashboard.view",
      size: "panel",
      load: () => import("@/components/dashboard/widgets/ManufacturingWidgets").then((m) => ({ default: m.OperationalWarningsWidget })),
      sortOrder: 60,
    },
  ],
});
