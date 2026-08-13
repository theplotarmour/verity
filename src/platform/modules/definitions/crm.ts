import { createModule } from "../sdk";

export const crmModule = createModule({
  key: "crm",
  version: "1.0.0",
  name: "CRM",
  description:
    "Leads, deals, pipeline and customer activity history.",
  requires: ["core","sales"],
  permissions: [
  {
    "key": "deal.view",
    "label": "View pipeline",
    "group": "CRM"
  },
  {
    "key": "deal.manage",
    "label": "Manage deals",
    "group": "CRM"
  },
  {
    "key": "deal.close",
    "label": "Close or lose deals",
    "group": "CRM"
  }
],
});
