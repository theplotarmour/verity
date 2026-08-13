import { createModule } from "../sdk";

export const schedulingModule = createModule({
  key: "scheduling",
  version: "1.0.0",
  name: "Shift Scheduling",
  description:
    "Calendar-based shift assignment per user and site, with swap requests.",
  requires: ["core","hr"],
  permissions: [
  {
    "key": "schedule.view",
    "label": "View schedules",
    "group": "Scheduling"
  },
  {
    "key": "schedule.manage",
    "label": "Publish schedules",
    "group": "Scheduling"
  },
  {
    "key": "schedule.swap",
    "label": "Request shift swaps",
    "group": "Scheduling"
  }
],
  navItems: [
  {
    "href": "/owner/scheduling",
    "label": "Scheduling",
    "iconKey": "calendar",
    "group": "Service Operations",
    "requires": "schedule.view",
    "sortOrder": 5
  }
],
});
