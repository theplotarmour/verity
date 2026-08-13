import { createModule } from "../sdk";

export const kitchenModule = createModule({
  key: "kitchen",
  version: "1.0.0",
  name: "Kitchen",
  description:
    "The kitchen display: tickets by station, fire and bump, and per-item timing so a table's courses land together.",
  requires: ["core","tables_orders"],
  permissions: [
  {
    "key": "kitchen.view",
    "label": "See the kitchen queue",
    "group": "Kitchen"
  },
  {
    "key": "kitchen.work",
    "label": "Accept and cook tickets",
    "group": "Kitchen"
  }
],
  navItems: [
  {
    "href": "/owner/kitchen",
    "label": "Kitchen",
    "iconKey": "chef",
    "group": "Production",
    "requires": "kitchen.view",
    "sortOrder": 1
  }
],
});
