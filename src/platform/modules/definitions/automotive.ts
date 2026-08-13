import { createModule } from "../sdk";

export const automotiveModule = createModule({
  key: "automotive",
  version: "1.0.0",
  name: "Automotive",
  description:
    "Vehicle catalogue (brand, model, generation, year, variant) and product fitment. The first vertical pack — proves that industry specifics live outside core.",
  requires: ["core","sales"],
  vertical: true,
  permissions: [
  {
    "key": "vehicle_catalog.view",
    "label": "View vehicle catalogue",
    "group": "Automotive"
  },
  {
    "key": "vehicle_catalog.manage",
    "label": "Manage vehicle catalogue",
    "group": "Automotive"
  },
  {
    "key": "fitment.manage",
    "label": "Manage product fitment",
    "group": "Automotive"
  }
],
});
