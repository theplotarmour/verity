import { createModule } from "../sdk";

export const assetsModule = createModule({
  key: "assets",
  version: "1.0.0",
  name: "Assets",
  description:
    "Asset register, assignment, maintenance schedules and depreciation.",
  requires: ["core"],
  permissions: [
  {
    "key": "asset.view",
    "label": "View assets",
    "group": "Assets"
  },
  {
    "key": "asset.manage",
    "label": "Manage assets",
    "group": "Assets"
  },
  {
    "key": "asset.maintain",
    "label": "Record maintenance",
    "group": "Assets"
  }
],
  navItems: [
  {
    "href": "/owner/assets",
    "label": "Assets",
    "iconKey": "hardhat",
    "group": "Shared Operations",
    "requires": "asset.view",
    "sortOrder": 3
  }
],
});
