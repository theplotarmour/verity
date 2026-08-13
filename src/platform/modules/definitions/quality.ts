import { createModule } from "../sdk";

export const qualityModule = createModule({
  key: "quality",
  version: "1.0.0",
  name: "Quality",
  description:
    "Templates, checkpoints, inspections, rework and public verification passports.",
  requires: ["core"],
  permissions: [
  {
    "key": "quality.queue",
    "label": "View QC queue",
    "group": "Quality"
  },
  {
    "key": "quality.inspect",
    "label": "Perform inspections",
    "group": "Quality"
  },
  {
    "key": "quality.approve",
    "label": "Approve or reject",
    "group": "Quality"
  },
  {
    "key": "quality.template_manage",
    "label": "Manage QC templates",
    "group": "Quality"
  },
  {
    "key": "quality.passport_publish",
    "label": "Publish public passports",
    "group": "Quality"
  }
],
  navItems: [
  {
    "href": "/owner/qc-floor",
    "label": "Quality",
    "iconKey": "check",
    "group": "Shared Operations",
    "requires": "quality.queue",
    "sortOrder": 4
  }
],
});
