import { z } from "zod";
import { registerQuery, type QueryDefinition } from "@/server/platform/query";
import {
  registerCommand,
  ValidationError,
  type CommandDefinition,
} from "@/server/platform/command";
import { recordActivity } from "@/server/platform/audit";
import { ENTITY_ROLE } from "@/server/platform/administration";
import {
  ENTITY_ACCOUNTING_PERIOD,
  ENTITY_BRAND,
  ENTITY_BUSINESS_PROFILE,
  ENTITY_CUSTOMER,
  ENTITY_CUSTOMER_PRICE,
  ENTITY_GST_REGISTRATION,
  ENTITY_INVOICE,
  ENTITY_LEDGER_ENTRY,
  ENTITY_PAYMENT,
  ENTITY_PRODUCT,
  ENTITY_PURCHASE_ORDER,
  ENTITY_SALES_ORDER,
  ENTITY_STOCK_BALANCE,
  ENTITY_STOCK_LEDGER,
  ENTITY_SUPPLIER,
  ENTITY_SUPPLIER_PRICE,
} from "./keys";

/**
 * BUSINESS ACTIVITIES — what a role may *do*, in the words a business uses.
 *
 * Specification §6. The rule is stated as a prohibition: do not show a client
 * `READ`, `MANAGE`, `DELETE`. Show "View catalogue", "Approve credit override",
 * "Record supplier payment". Underneath, Verity still maps this into the
 * existing permission system.
 *
 * WHY A MAP AND NOT A RENAME
 * The obvious shortcut is to relabel the verbs — call `Read` "View" and be
 * done. It does not work, and the reason is the interesting part: a single
 * business activity is almost never a single grant. "Create sales orders"
 * requires creating an order, reading the catalogue to pick a board, reading
 * stock to know there is any, and reading the customer to price it. A
 * salesperson granted only `Create` on `sales_order` gets an authorization
 * error on a screen that will not tell them which of four permissions is
 * missing. So an activity is a SET of grants, applied and withdrawn together.
 *
 * WHERE THIS LIVES, AND WHY IT IS NOT PLATFORM CODE
 * The platform's authorization model is Verb + Entity + Scope and must stay
 * that way — it is what lets a new capability add entities without touching
 * the ontology. This file is the plywood capability's own vocabulary for its
 * own entities. Another capability describes its activities its own way, and
 * the platform never learns either. Moving this into `administration.ts` would
 * make the platform know what a plywood business does.
 *
 * SCOPE IS NOT PART OF THE ACTIVITY
 * An activity says *what*; the membership's organization says *where*. Every
 * grant here is at `Organization` scope, so a warehouse role attached to the
 * Noida node reaches Noida's godowns and no others (PLA-ORG-002), and the same
 * activity granted to a role at the top of the tree reaches everything. One
 * vocabulary, and the tree decides the reach.
 */

export type Grant = { verb: string; entity: string };

export type BusinessActivity = {
  key: string;
  label: string;
  group: string;
  /** Why someone would want this, when the label alone is ambiguous. */
  note?: string;
  grants: Grant[];
};

/** Reading a set of entities — the commonest shape, so it is not spelled out. */
function view(...entities: string[]): Grant[] {
  return entities.map((entity) => ({ verb: "Read", entity }));
}

/**
 * The catalogue of activities.
 *
 * Ordered as a business would read them rather than by entity, because the
 * person editing a role is thinking about a job, not about a schema.
 */
export const BUSINESS_ACTIVITIES: BusinessActivity[] = [
  /* ---------------------------------------------------------------- trade */
  {
    key: "view_catalogue",
    label: "View catalogue",
    group: "Trade",
    grants: view(ENTITY_PRODUCT, ENTITY_BRAND),
  },
  {
    key: "manage_catalogue",
    label: "Add and edit boards",
    group: "Trade",
    note: "Also allows withdrawing a board from trading",
    grants: [
      ...view(ENTITY_PRODUCT, ENTITY_BRAND),
      { verb: "Create", entity: ENTITY_PRODUCT },
      { verb: "Edit", entity: ENTITY_PRODUCT },
      { verb: "Create", entity: ENTITY_BRAND },
      { verb: "Edit", entity: ENTITY_BRAND },
    ],
  },
  {
    key: "view_suppliers",
    label: "View suppliers",
    group: "Trade",
    grants: view(ENTITY_SUPPLIER, ENTITY_SUPPLIER_PRICE),
  },
  {
    key: "manage_suppliers",
    label: "Add suppliers and set their prices",
    group: "Trade",
    grants: [
      ...view(ENTITY_SUPPLIER, ENTITY_SUPPLIER_PRICE, ENTITY_PRODUCT),
      { verb: "Create", entity: ENTITY_SUPPLIER },
      { verb: "Edit", entity: ENTITY_SUPPLIER },
      { verb: "Create", entity: ENTITY_SUPPLIER_PRICE },
      { verb: "Edit", entity: ENTITY_SUPPLIER_PRICE },
    ],
  },
  {
    key: "view_purchases",
    label: "View purchase orders",
    group: "Trade",
    grants: view(ENTITY_PURCHASE_ORDER),
  },
  {
    key: "create_purchases",
    label: "Raise purchase orders",
    group: "Trade",
    note: "Includes sending an order to the supplier",
    grants: [
      // The four reads are not padding. Raising an order means picking a
      // board, a supplier and a godown, and knowing what is already in stock.
      ...view(
        ENTITY_PURCHASE_ORDER,
        ENTITY_PRODUCT,
        ENTITY_SUPPLIER,
        ENTITY_STOCK_BALANCE,
      ),
      { verb: "Create", entity: ENTITY_PURCHASE_ORDER },
      { verb: "Edit", entity: ENTITY_PURCHASE_ORDER },
      { verb: "ActionExecute", entity: ENTITY_PURCHASE_ORDER },
    ],
  },
  {
    key: "view_customers",
    label: "View customers",
    group: "Trade",
    grants: view(ENTITY_CUSTOMER, ENTITY_CUSTOMER_PRICE),
  },
  {
    key: "manage_customers",
    label: "Add customers",
    group: "Trade",
    grants: [
      ...view(ENTITY_CUSTOMER, ENTITY_CUSTOMER_PRICE),
      { verb: "Create", entity: ENTITY_CUSTOMER },
      { verb: "Edit", entity: ENTITY_CUSTOMER },
    ],
  },
  {
    key: "change_customer_pricing",
    label: "Change customer pricing",
    group: "Trade",
    grants: [
      ...view(ENTITY_CUSTOMER, ENTITY_CUSTOMER_PRICE, ENTITY_PRODUCT),
      { verb: "Create", entity: ENTITY_CUSTOMER_PRICE },
      { verb: "Edit", entity: ENTITY_CUSTOMER_PRICE },
    ],
  },
  {
    key: "view_sales",
    label: "View sales orders",
    group: "Trade",
    grants: view(ENTITY_SALES_ORDER),
  },
  {
    key: "create_sales",
    label: "Take sales orders",
    group: "Trade",
    grants: [
      ...view(
        ENTITY_SALES_ORDER,
        ENTITY_PRODUCT,
        ENTITY_CUSTOMER,
        ENTITY_STOCK_BALANCE,
      ),
      { verb: "Create", entity: ENTITY_SALES_ORDER },
      { verb: "Edit", entity: ENTITY_SALES_ORDER },
    ],
  },
  {
    key: "view_customer_credit",
    label: "View customer credit",
    group: "Trade",
    note: "Limit, exposure and how much more they may be sold",
    grants: view(ENTITY_CUSTOMER, ENTITY_INVOICE, ENTITY_LEDGER_ENTRY),
  },
  {
    key: "approve_credit",
    label: "Approve credit overrides",
    group: "Trade",
    note: "Lets an order go through above the customer's limit. Recorded with a reason.",
    grants: [
      ...view(ENTITY_SALES_ORDER, ENTITY_CUSTOMER),
      { verb: "ActionExecute", entity: ENTITY_SALES_ORDER },
    ],
  },
  {
    key: "set_credit_limits",
    label: "Set credit limits",
    group: "Trade",
    grants: [
      ...view(ENTITY_CUSTOMER),
      { verb: "Edit", entity: ENTITY_CUSTOMER },
    ],
  },

  /* ------------------------------------------------------------ inventory */
  {
    key: "view_stock",
    label: "View stock",
    group: "Inventory",
    grants: view(ENTITY_STOCK_BALANCE, ENTITY_STOCK_LEDGER, ENTITY_PRODUCT),
  },
  {
    key: "receive_goods",
    label: "Receive goods",
    group: "Inventory",
    note: "Booking a delivery in against its purchase order. Moves the stock in the same step.",
    grants: [
      ...view(ENTITY_PURCHASE_ORDER, ENTITY_STOCK_BALANCE, ENTITY_PRODUCT),
      { verb: "ActionExecute", entity: ENTITY_PURCHASE_ORDER },
      { verb: "Create", entity: ENTITY_STOCK_LEDGER },
    ],
  },
  {
    key: "issue_goods",
    label: "Issue goods",
    group: "Inventory",
    note: "Handing material out against a sales order",
    grants: [
      ...view(ENTITY_SALES_ORDER, ENTITY_STOCK_BALANCE, ENTITY_PRODUCT),
      { verb: "ActionExecute", entity: ENTITY_SALES_ORDER },
      { verb: "Create", entity: ENTITY_STOCK_LEDGER },
    ],
  },
  {
    key: "adjust_stock",
    label: "Record damage and adjustments",
    group: "Inventory",
    note: "Every adjustment records a reason and is permanent",
    grants: [
      ...view(ENTITY_STOCK_BALANCE, ENTITY_PRODUCT),
      { verb: "Create", entity: ENTITY_STOCK_LEDGER },
      { verb: "Edit", entity: ENTITY_STOCK_BALANCE },
    ],
  },

  /* ---------------------------------------------------------------- money */
  {
    key: "view_finance",
    label: "View invoices and balances",
    group: "Money",
    grants: view(ENTITY_INVOICE, ENTITY_PAYMENT, ENTITY_LEDGER_ENTRY),
  },
  {
    key: "raise_invoices",
    label: "Raise invoices",
    group: "Money",
    grants: [
      ...view(
        ENTITY_INVOICE,
        ENTITY_SALES_ORDER,
        ENTITY_PURCHASE_ORDER,
        ENTITY_CUSTOMER,
        ENTITY_SUPPLIER,
      ),
      { verb: "Create", entity: ENTITY_INVOICE },
      // Recording the supplier's own document against a bill this system
      // raised at goods receipt. Not an edit of the invoice — that table is
      // immutable — but it is the verb the command declares, because it
      // changes what the bill is eligible for.
      { verb: "Edit", entity: ENTITY_INVOICE },
    ],
  },
  {
    key: "record_payments",
    label: "Record payments",
    group: "Money",
    note: "Both money received from customers and money paid to suppliers",
    grants: [
      ...view(ENTITY_INVOICE, ENTITY_PAYMENT, ENTITY_LEDGER_ENTRY),
      { verb: "Create", entity: ENTITY_PAYMENT },
    ],
  },
  {
    key: "issue_notes",
    label: "Issue credit and debit notes",
    group: "Money",
    note: "A finalised invoice is never edited; a note corrects it",
    grants: [
      ...view(ENTITY_INVOICE),
      { verb: "ActionExecute", entity: ENTITY_INVOICE },
    ],
  },

  /* ------------------------------------------------------------------ tax */
  {
    key: "view_tax",
    label: "View tax position and returns",
    group: "Tax",
    grants: view(ENTITY_INVOICE, ENTITY_ACCOUNTING_PERIOD),
  },
  {
    key: "manage_tax_settings",
    label: "Manage tax settings",
    group: "Tax",
    note: "The GSTIN, the invoice series, and the rate for each HSN",
    grants: [
      ...view(ENTITY_GST_REGISTRATION),
      { verb: "Create", entity: ENTITY_GST_REGISTRATION },
      { verb: "Edit", entity: ENTITY_GST_REGISTRATION },
    ],
  },
  {
    key: "close_periods",
    label: "Close accounting periods",
    group: "Tax",
    note: "After closing, invoices in the period are permanently locked",
    grants: [
      ...view(ENTITY_ACCOUNTING_PERIOD, ENTITY_INVOICE),
      { verb: "Create", entity: ENTITY_ACCOUNTING_PERIOD },
      { verb: "Edit", entity: ENTITY_ACCOUNTING_PERIOD },
    ],
  },

  /* --------------------------------------------------------- administration */
  {
    key: "manage_business_settings",
    label: "Manage business settings",
    group: "Administration",
    note: "Legal name, PAN, address, financial year",
    grants: [
      ...view(ENTITY_BUSINESS_PROFILE),
      { verb: "Create", entity: ENTITY_BUSINESS_PROFILE },
      { verb: "Edit", entity: ENTITY_BUSINESS_PROFILE },
    ],
  },
];

/** Every grant a set of activities implies, de-duplicated. */
export function grantsFor(activityKeys: string[]): Grant[] {
  const seen = new Set<string>();
  const grants: Grant[] = [];
  for (const key of activityKeys) {
    const activity = BUSINESS_ACTIVITIES.find(
      (candidate) => candidate.key === key,
    );
    if (!activity) continue;
    for (const grant of activity.grants) {
      const id = `${grant.verb}:${grant.entity}`;
      if (seen.has(id)) continue;
      seen.add(id);
      grants.push(grant);
    }
  }
  return grants;
}

/**
 * Which activities a role currently holds.
 *
 * An activity is held only when EVERY grant it implies is present. Partial is
 * reported separately rather than being rounded to either answer: rounding up
 * would tell an administrator a salesperson can take orders when they will hit
 * an authorization error, and rounding down would hide a grant the role really
 * has from the person reviewing it.
 */
export function activitiesOf(
  resolved: Array<{ verb: string; entity: string }>,
): {
  held: string[];
  partial: string[];
} {
  const have = new Set(
    resolved.map((grant) => `${grant.verb}:${grant.entity}`),
  );
  const held: string[] = [];
  const partial: string[] = [];
  for (const activity of BUSINESS_ACTIVITIES) {
    const present = activity.grants.filter((grant) =>
      have.has(`${grant.verb}:${grant.entity}`),
    );
    if (present.length === activity.grants.length) held.push(activity.key);
    else if (present.length > 0) partial.push(activity.key);
  }
  return { held, partial };
}

/**
 * §1 — where a role's work actually starts.
 *
 * §1 gives a table of role to main workspace: an accountant lives in Finance
 * and Tax, warehouse staff in Stock and Godowns, a salesperson in Customers and
 * Sales. Landing every one of them on the owner's console means each begins the
 * day one click from their job, looking at figures most of them cannot act on.
 *
 * DERIVED FROM ACTIVITIES, NOT FROM A ROLE NAME. Matching on the string
 * "Accountant" would break the moment a business calls the job something else,
 * which they will — and a role named in Hindi, or "Accounts & Tax", would land
 * nowhere. What a role can DO is the thing the platform actually knows.
 *
 * ORDERED MOST SPECIFIC FIRST. Someone who can both approve credit and record
 * payments is a manager, and the earlier entry wins; a role holding everything
 * is an owner and falls through to the overview, which is the screen built for
 * exactly that reader.
 *
 * Returns null when nothing fits, and the caller must treat that as "leave them
 * where they are". A redirect guessed wrong is worse than no redirect: it puts
 * someone on a screen they did not ask for and cannot explain.
 */
const LANDING_RULES: Array<{ href: string; needs: string[] }> = [
  // Accountant — tax and money, and nothing operational.
  { href: "/tax", needs: ["view_tax", "record_payments"] },
  // Warehouse — moves material, does not price or bill it.
  { href: "/stock", needs: ["view_stock", "receive_goods"] },
  { href: "/stock", needs: ["view_stock", "issue_goods"] },
  // Purchasing.
  { href: "/purchases", needs: ["view_purchases", "create_purchases"] },
  // Selling.
  { href: "/sales", needs: ["view_sales", "create_sales"] },
  // Sales management — pricing and credit, without necessarily taking orders.
  { href: "/customers", needs: ["change_customer_pricing", "approve_credit"] },
];

export function landingRouteFor(
  resolved: Array<{ verb: string; entity: string }>,
): string | null {
  const { held } = activitiesOf(resolved);
  // An owner — someone who can do essentially everything — belongs on the
  // BUSINESS overview, which exists to answer their question.
  //
  // Audit finding U3-3: this returned null, which left them on `/`, the
  // platform's own overview, reading "the platform's current state in this
  // organization" over counts of Locations and Assets. The owner is the
  // primary user of this product and was landing furthest from their work.
  if (held.length >= BUSINESS_ACTIVITIES.length - 4) return "/overview";

  for (const rule of LANDING_RULES) {
    if (rule.needs.every((key) => held.includes(key))) return rule.href;
  }
  return null;
}

/**
 * The activity catalogue, for the role editor.
 *
 * A query rather than a constant shipped to the browser, so the vocabulary
 * stays server-side alongside the entities it names — and so a capability that
 * is not activated for this tenant contributes nothing to the list.
 */
export const listBusinessActivities: QueryDefinition<
  Record<string, never>,
  Array<{
    key: string;
    label: string;
    group: string;
    note: string | null;
    grantCount: number;
  }>
> = {
  key: "verity.trading.list_business_activities",
  // Read on the product: anyone who can see the catalogue may see what the
  // activities are called. Editing a role is gated by the platform's own
  // Role permission on the commands themselves.
  entity: ENTITY_PRODUCT,
  input: z.object({}),
  handler: async () =>
    BUSINESS_ACTIVITIES.map((activity) => ({
      key: activity.key,
      label: activity.label,
      group: activity.group,
      note: activity.note ?? null,
      grantCount: activity.grants.length,
    })),
};

/**
 * Grants or withdraws one business activity on one role.
 *
 * THE REASON THIS COMMAND EXISTS AT ALL. The platform already has
 * `grantPermission` and `revokePermission`, and they take a verb and an entity.
 * If the role editor called those, the browser would have to know that "Take
 * sales orders" means five specific grants — and §6's prohibition would be
 * cosmetic, with the vocabulary it forbids sitting one view-source away. The
 * mapping is resolved here, on the server, and the wire carries an activity key
 * and a boolean.
 *
 * ALL OR NOTHING. An activity's grants are applied and withdrawn together. A
 * role holding three of the five grants behind "Take sales orders" is a
 * salesperson who gets an authorization error part-way through an order and no
 * indication which permission is missing.
 *
 * WITHDRAWING IS NOT SYMMETRIC, and this is the subtle part. Activities share
 * grants — nearly all of them need `Read` on the product. Revoking every grant
 * behind "Take sales orders" would strip catalogue access that "View
 * catalogue" is also relying on, silently breaking an activity the
 * administrator did not touch. So a revoke removes only those grants that no
 * OTHER still-held activity requires.
 *
 * Scope is always `Organization`: the activity says what, the membership's node
 * says where (PLA-ORG-002). A tenant-wide reach comes from attaching the role
 * at the top of the tree, not from a wider grant.
 */
export const setRoleActivity: CommandDefinition<
  { roleId: string; activityKey: string; enabled: boolean },
  { granted: number; revoked: number }
> = {
  key: "verity.trading.set_role_activity",
  entity: ENTITY_ROLE,
  verb: "Edit",
  input: z.object({
    roleId: z.string().uuid(),
    activityKey: z.string().min(1).max(100),
    enabled: z.boolean(),
  }),
  handler: async (ctx, input) => {
    const activity = BUSINESS_ACTIVITIES.find(
      (candidate) => candidate.key === input.activityKey,
    );
    if (!activity) {
      throw new ValidationError(
        `E_VALIDATION: no such activity: ${input.activityKey}`,
      );
    }

    const role = await ctx.tx.role.findUnique({
      where: { id: input.roleId },
      include: { permissions: true },
    });
    if (!role)
      throw new ValidationError("E_VALIDATION: role not found in this client");

    const have = new Set(role.permissions.map((p) => `${p.verb}:${p.entity}`));
    let granted = 0;
    let revoked = 0;

    if (input.enabled) {
      const missing = activity.grants.filter(
        (grant) => !have.has(`${grant.verb}:${grant.entity}`),
      );
      if (missing.length > 0) {
        await ctx.tx.permission.createMany({
          data: missing.map((grant) => ({
            tenantId: ctx.actor.tenantId,
            roleId: role.id,
            verb: grant.verb as never,
            entity: grant.entity,
            scope: "Organization" as never,
          })),
        });
        granted = missing.length;
      }
    } else {
      // What the role still holds once this activity is taken away.
      const remaining = BUSINESS_ACTIVITIES.filter((candidate) => {
        if (candidate.key === activity.key) return false;
        return candidate.grants.every((grant) =>
          have.has(`${grant.verb}:${grant.entity}`),
        );
      });
      const stillNeeded = new Set(
        remaining.flatMap((candidate) =>
          candidate.grants.map((grant) => `${grant.verb}:${grant.entity}`),
        ),
      );

      const droppable = activity.grants.filter(
        (grant) => !stillNeeded.has(`${grant.verb}:${grant.entity}`),
      );
      if (droppable.length > 0) {
        const result = await ctx.tx.permission.deleteMany({
          where: {
            roleId: role.id,
            OR: droppable.map((grant) => ({
              verb: grant.verb as never,
              entity: grant.entity,
            })),
          },
        });
        revoked = result.count;
      }
    }

    await recordActivity(ctx, {
      entityKey: ENTITY_ROLE,
      entityId: role.id,
      commandKey: "verity.trading.set_role_activity",
      // The business label, not the grants. This row is read by whoever asks
      // later why somebody could do something, and "Take sales orders" answers
      // that question where five verb-entity pairs do not.
      changes: [
        {
          field: activity.label,
          oldValue: input.enabled ? "not allowed" : "allowed",
          newValue: input.enabled ? "allowed" : "not allowed",
        },
      ],
    });

    return {
      result: { granted, revoked },
      events: [
        { name: "verity.trading.role_activity_changed", entityId: role.id },
      ],
    };
  },
};

export function registerBusinessActivities(): void {
  registerQuery(listBusinessActivities);
  registerCommand(setRoleActivity);
}
