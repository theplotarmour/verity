/**
 * The Add Master Data wizard used to open by asking which of seven kinds of
 * thing you were adding — Inventory, Supplier, Customer, Warehouse, Employee,
 * Design, Colour.
 *
 * Six of those were not master data. Suppliers and customers are
 * counterparties, warehouses are infrastructure, employees are staff, and each
 * now has its own screen. Designs and colours were things the factory
 * references, so they became ordinary categories like everything else.
 *
 * What is left is one kind of thing: an item in a category. The wizard no
 * longer asks, and this list exists only so the few callers that still name a
 * domain keep compiling while they are simplified.
 */
export const MASTER_DATA_DOMAINS = [
  {
    id: "INVENTORY",
    label: "Inventory",
    description: "Anything filed under one of your categories.",
  },
] as const;

export type MasterDataDomainId = (typeof MASTER_DATA_DOMAINS)[number]["id"];

export const MASTER_DATA_DOMAIN_LABELS = Object.fromEntries(
  MASTER_DATA_DOMAINS.map((domain) => [domain.id, domain.label])
) as Record<MasterDataDomainId, string>;
