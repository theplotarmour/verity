import { createModule } from "../sdk";

export const helpdeskModule = createModule({
  key: "helpdesk",
  version: "1.0.0",
  name: "Helpdesk",
  description:
    "Tickets, SLAs and support queues, plus the service work orders dispatched from them.",
  requires: ["core"],
  permissions: [
  {
    "key": "ticket.view",
    "label": "View tickets",
    "group": "Helpdesk"
  },
  {
    "key": "ticket.manage",
    "label": "Manage tickets",
    "group": "Helpdesk"
  },
  {
    "key": "service_wo.view",
    "label": "View service work orders",
    "group": "Helpdesk"
  },
  {
    "key": "service_wo.manage",
    "label": "Manage service work orders",
    "group": "Helpdesk"
  }
],
  navItems: [
  {
    "href": "/owner/helpdesk",
    "label": "Helpdesk",
    "iconKey": "lifebuoy",
    "group": "Service Operations",
    "requires": "ticket.view"
  },
  {
    "href": "/owner/service-work-orders",
    "label": "Work Orders",
    "iconKey": "hammer",
    "group": "Service Operations",
    "requires": "service_wo.view",
    "sortOrder": 2
  }
],
});
