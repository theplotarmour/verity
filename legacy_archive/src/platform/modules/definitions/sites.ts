import { createModule } from "../sdk";

export const sitesModule = createModule({
  key: "sites",
  version: "1.0.0",
  name: "Sites & Locations",
  description:
    "Client sites, workforce deployment and site-level SLAs. Essential for service businesses.",
  requires: ["core"],
  permissions: [
  {
    "key": "site.view",
    "label": "View sites",
    "group": "Sites"
  },
  {
    "key": "site.manage",
    "label": "Manage sites",
    "group": "Sites"
  },
  {
    "key": "site.deploy",
    "label": "Deploy staff to sites",
    "group": "Sites"
  }
],
  navItems: [
  {
    "href": "/owner/sites",
    "label": "Sites",
    "iconKey": "pin",
    "group": "Service Operations",
    "requires": "site.view",
    "sortOrder": 4
  }
],
});
