import { createModule } from "../sdk";

export const financeModule = createModule({
  key: "finance",
  version: "1.0.0",
  name: "Finance",
  description:
    "Chart of accounts, journals, fiscal periods, costing and margin.",
  requires: ["core"],
  permissions: [
  {
    "key": "account.manage",
    "label": "Manage chart of accounts",
    "group": "Finance"
  },
  {
    "key": "journal.post",
    "label": "Post journal entries",
    "group": "Finance"
  },
  {
    "key": "journal.view",
    "label": "View ledger",
    "group": "Finance"
  },
  {
    "key": "period.close",
    "label": "Close fiscal periods",
    "group": "Finance"
  }
],
});
