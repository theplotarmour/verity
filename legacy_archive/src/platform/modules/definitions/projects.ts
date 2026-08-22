import { createModule } from "../sdk";

export const projectsModule = createModule({
  key: "projects",
  version: "1.0.0",
  name: "Projects",
  description:
    "Engagements, tasks and timesheets. The service-sector counterpart to work orders.",
  requires: ["core"],
  permissions: [
  {
    "key": "project.view",
    "label": "View projects",
    "group": "Projects"
  },
  {
    "key": "project.manage",
    "label": "Manage projects",
    "group": "Projects"
  },
  {
    "key": "timesheet.record",
    "label": "Record time",
    "group": "Projects"
  },
  {
    "key": "timesheet.approve",
    "label": "Approve timesheets",
    "group": "Projects"
  }
],
  navItems: [
  {
    "href": "/owner/projects",
    "label": "Projects",
    "iconKey": "folder",
    "group": "Service Operations",
    "requires": "project.view",
    "sortOrder": 3
  }
],
});
