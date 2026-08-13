import { createModule } from "../sdk";

export const servingModule = createModule({
  key: "serving",
  version: "1.0.0",
  name: "Serving",
  description:
    "The pass and the floor: what is ready to run, what has been delivered, and which table is waiting on what.",
  requires: ["core","tables_orders"],
  permissions: [
  {
    "key": "serving.view",
    "label": "See the pass",
    "group": "Serving"
  },
  {
    "key": "serving.work",
    "label": "Mark orders served",
    "group": "Serving"
  }
],
  navItems: [
  {
    "href": "/owner/serving",
    "label": "Serving",
    "iconKey": "utensils",
    "group": "Production",
    "requires": "serving.view",
    "sortOrder": 2
  }
],
});
