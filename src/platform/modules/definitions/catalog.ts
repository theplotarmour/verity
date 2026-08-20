import { createModule } from "../sdk";

export const catalogModule = createModule({
  key: "catalog",
  version: "1.0.0",
  name: "Customer Catalogue",
  description:
    "The storefront view of what a tenant sells — the prices, pictures and descriptions a customer sees, and the switch that decides which items reach the public portal at all.",
  /*
   * `inventory` because both read `Product`. This is deliberately not a second
   * CRUD over that table: inventory owns an item's existence, its units and its
   * stock, and this owns the handful of customer-facing columns on top of it
   * (`pricePaise`, `imageUrl`, `description`, `isPublished`). Two screens, one
   * row, no duplicated write path.
   */
  requires: ["core", "inventory"],
  permissions: [
    { key: "catalog.view", label: "View the customer catalogue", group: "Catalogue" },
    {
      key: "catalog.manage",
      label: "Set prices and publish items to the customer portal",
      group: "Catalogue",
    },
  ],
  navItems: [
    {
      href: "/owner/catalog",
      label: "Catalogue",
      iconKey: "tag",
      group: "Service Operations",
      requires: "catalog.view",
      sortOrder: 5,
    },
  ],
});
