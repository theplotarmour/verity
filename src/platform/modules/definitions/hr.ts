import { createModule } from "../sdk";

export const hrModule = createModule({
  key: "hr",
  version: "1.0.0",
  name: "People",
  description:
    "Employee profiles, shifts, attendance and leave.",
  requires: ["core"],
  permissions: [
  {
    "key": "employee.view",
    "label": "View employee records",
    "group": "People"
  },
  {
    "key": "employee.manage",
    "label": "Manage employee records",
    "group": "People"
  },
  {
    "key": "attendance.record",
    "label": "Record attendance",
    "group": "People"
  },
  {
    "key": "leave.approve",
    "label": "Approve leave",
    "group": "People"
  }
],
});
