import { createModule } from "../sdk";

export const menuModule = createModule({
  key: "menu",
  version: "1.0.0",
  name: "Menu",
  description:
    "Menu categories and items — price, veg marker, photo, and the availability toggle a manager hits when something runs out mid-service.",
  requires: ["core"],
  permissions: [],
});
