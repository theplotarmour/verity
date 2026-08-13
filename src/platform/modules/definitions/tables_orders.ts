import { createModule } from "../sdk";

export const tables_ordersModule = createModule({
  key: "tables_orders",
  version: "1.0.0",
  name: "Tables & Orders",
  description:
    "Floor plan, table state, and the running order (KOT) attached to each — the spine the kitchen and the pass both read from.",
  requires: ["core","menu"],
  permissions: [],
  dashboardWidgets: [
    {
      key: "restaurant_metrics",
      title: "Restaurant Metrics",
      requires: "dashboard.view",
      size: "wide",
      load: () => import("@/components/dashboard/widgets/RestaurantWidgets").then((m) => ({ default: m.RestaurantMetricsWidget })),
      sortOrder: 10,
    },
    {
      key: "restaurant_floor",
      title: "Floor Layout",
      requires: "dashboard.view",
      size: "panel",
      load: () => import("@/components/dashboard/widgets/RestaurantWidgets").then((m) => ({ default: m.RestaurantFloorWidget })),
      sortOrder: 20,
    },
    {
      key: "restaurant_recent_orders",
      title: "Recent Orders",
      requires: "dashboard.view",
      size: "panel",
      load: () => import("@/components/dashboard/widgets/RestaurantWidgets").then((m) => ({ default: m.RestaurantRecentOrdersWidget })),
      sortOrder: 40,
    },
  ],
});
