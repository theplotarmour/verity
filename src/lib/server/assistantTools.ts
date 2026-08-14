import "server-only";

import prisma from "@/lib/prisma";
import { hasModule } from "@/platform/modules/entitlements";
import type { ModuleKey } from "@/platform/modules/registry";
import { ACTIVE_ORDER_STATES, orderLabel, orderTotal } from "@/lib/dining";
import { LIVE_APPOINTMENT_STATUSES } from "@/lib/booking";
import { formatMenuPrice } from "@/lib/menu";

/**
 * Read-only tools the assistant may call to ground an answer in live data.
 *
 * The security rule of R3, structural rather than hoped-for: **a tool never
 * receives `factoryId` from the model.** Its `run` takes the id from the route's
 * session as a positional argument; the model-supplied `args` are a separate bag,
 * and any tenant-identifying key the model tries to smuggle in there is stripped
 * before `run` ever sees it (`stripTenantKeys`). So the worst a prompt-injected
 * `{"factoryId":"someone-else"}` can do is get dropped.
 *
 * Every tool is also entitlement-gated: a restaurant asking the inventory tool is
 * told the module is not installed rather than being handed an empty result that
 * reads as "you have no stock".
 *
 * All tools are reads. Writes are R4 — a proposal the owner approves — and go
 * through a guarded server action, never through this file.
 */

/**
 * A write the owner must approve before it happens (R4).
 *
 * A `propose_*` tool is still a **read**: it looks up the current value and
 * returns the old→new diff. Nothing is written until the owner clicks Approve,
 * which calls a guarded server action that re-reads and re-validates from the
 * session — the proposal below is a preview, never the source of truth for the
 * write.
 */
export interface PriceChangeProposal {
  kind: "menu_price";
  itemId: string;
  itemName: string;
  oldPricePaise: number;
  newPricePaise: number;
}

export interface AssistantTool {
  name: string;
  /** The module a tenant must be entitled to for this tool to run. */
  module: ModuleKey;
  description: string;
  /**
   * JSON-schema parameters exposed to the model. **Must not contain a `factoryId`,
   * `organizationId`, or `tenantId` property** — the tenant is the session's, not
   * the model's. `assistantTools.test.ts` asserts this.
   */
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  run(factoryId: string, args: Record<string, unknown>): Promise<unknown>;
}

/** Keys a tool's caller must never be able to set — the tenant is the session's. */
const TENANT_KEYS = ["factoryId", "organizationId", "tenantId", "factory", "org"] as const;

/**
 * Drop any tenant-identifying key the model put in the tool arguments.
 *
 * Pure and exported so the test can prove an injected `factoryId` is removed
 * without standing up a database or a model.
 */
export function stripTenantKeys(args: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args ?? {})) {
    if ((TENANT_KEYS as readonly string[]).includes(key)) continue;
    out[key] = value;
  }
  return out;
}

export const ASSISTANT_TOOLS: AssistantTool[] = [
  {
    name: "count_active_orders",
    module: "tables_orders",
    description:
      "Count the dining/counter orders currently live in the restaurant, broken down by state (NEW, ACCEPTED, PREPARING, READY, SERVED, BILLED). Use for 'how busy are we', 'what's cooking', 'anything waiting to pay'.",
    parameters: { type: "object", properties: {} },
    async run(factoryId) {
      const rows = await prisma.diningOrder.groupBy({
        by: ["state"],
        where: { factoryId, state: { in: ACTIVE_ORDER_STATES } },
        _count: { _all: true },
      });
      const byState: Record<string, number> = {};
      let total = 0;
      for (const row of rows) {
        byState[row.state] = row._count._all;
        total += row._count._all;
      }
      return { total, byState };
    },
  },
  {
    name: "find_order",
    module: "tables_orders",
    description:
      "Look up one live order by its counter token (e.g. '12' or '#12') or its table number (e.g. 'T01', 'Table 3'). Returns the order's label, state and running total.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "A token number, or a table's name/number." },
      },
      required: ["query"],
    },
    async run(factoryId, args) {
      const query = String(args.query ?? "").trim();
      if (!query) return { error: "No token or table given." };

      const bare = query.replace(/^#/, "").trim();
      const asToken = Number(bare);
      const byToken = bare !== "" && Number.isInteger(asToken);

      const order = await prisma.diningOrder.findFirst({
        where: {
          factoryId,
          state: { in: ACTIVE_ORDER_STATES },
          ...(byToken
            ? { token: asToken }
            : { table: { number: { equals: query, mode: "insensitive" } } }),
        },
        orderBy: { createdAt: "desc" },
        select: {
          state: true,
          token: true,
          customerLabel: true,
          table: { select: { number: true } },
          items: { select: { quantity: true, unitPrice: true } },
        },
      });
      if (!order) return { found: false, query };

      return {
        found: true,
        label: orderLabel(order),
        state: order.state,
        total: formatMenuPrice(orderTotal(order.items)),
      };
    },
  },
  {
    name: "upcoming_appointments",
    module: "booking",
    description:
      "List the next few confirmed or pending appointments on the booking calendar, soonest first. Use for 'who's next', 'what's on today', 'is the book busy'.",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "How many to return (1–10). Defaults to 5." },
      },
    },
    async run(factoryId, args) {
      const raw = Number(args.limit);
      const limit = Number.isInteger(raw) ? Math.min(10, Math.max(1, raw)) : 5;
      const rows = await prisma.appointment.findMany({
        where: { factoryId, status: { in: LIVE_APPOINTMENT_STATUSES }, startTime: { gte: new Date() } },
        orderBy: { startTime: "asc" },
        take: limit,
        select: {
          customerName: true,
          serviceName: true,
          startTime: true,
          status: true,
          staff: { select: { name: true } },
        },
      });
      return {
        count: rows.length,
        appointments: rows.map((r) => ({
          customer: r.customerName,
          service: r.serviceName,
          staff: r.staff?.name ?? "Unassigned",
          when: r.startTime.toISOString(),
          status: r.status,
        })),
      };
    },
  },
  {
    name: "propose_price_change",
    module: "menu",
    description:
      "Prepare (but DO NOT apply) a change to a menu item's price. Returns the current and proposed price for the owner to approve. Use when the user asks to change, raise or drop an item's price. The change only happens after the owner approves it on screen.",
    parameters: {
      type: "object",
      properties: {
        itemName: { type: "string", description: "The menu item's name, as shown on the menu." },
        newPrice: { type: "number", description: "The proposed new price in rupees (not paise)." },
      },
      required: ["itemName", "newPrice"],
    },
    async run(factoryId, args) {
      const itemName = String(args.itemName ?? "").trim();
      const newRupees = Number(args.newPrice);
      if (!itemName) return { error: "Which item?" };
      if (!Number.isFinite(newRupees) || newRupees <= 0) {
        return { error: "A positive new price in rupees is required." };
      }

      const item = await prisma.menuItem.findFirst({
        where: { factoryId, name: { equals: itemName, mode: "insensitive" } },
        select: { id: true, name: true, price: true },
      });
      if (!item) return { found: false, itemName };

      const proposal: PriceChangeProposal = {
        kind: "menu_price",
        itemId: item.id,
        itemName: item.name,
        oldPricePaise: item.price,
        newPricePaise: Math.round(newRupees * 100),
      };
      // The `proposal` key is the signal the route hoists into the response for
      // the client to render as an Approve/Cancel diff. Nothing is written here.
      return { proposal };
    },
  },
];

const BY_NAME = new Map(ASSISTANT_TOOLS.map((t) => [t.name, t]));

/**
 * The tool specs to offer the model — only the tools this tenant is entitled to.
 * Offering a tool for a module the tenant lacks would waste a round-trip on a
 * call that can only answer "not installed".
 */
export function assistantToolSpecs(entitledModules: readonly ModuleKey[]) {
  const entitled = new Set(entitledModules);
  return ASSISTANT_TOOLS.filter((t) => entitled.has(t.module)).map((t) => ({
    type: "function" as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}

export type ToolRunResult = { result: unknown } | { error: string };

/**
 * Execute one tool call. `factoryId` and `organizationId` come from the session —
 * the model supplies only `name` and `rawArgs`, and `rawArgs` is scrubbed of any
 * tenant key before the tool runs.
 */
export async function runAssistantTool(
  name: string,
  factoryId: string,
  organizationId: string,
  rawArgs: Record<string, unknown> | null | undefined,
): Promise<ToolRunResult> {
  const tool = BY_NAME.get(name);
  if (!tool) return { error: `Unknown tool: ${name}` };

  // Entitlement is org-scoped; a tool for a module this tenant does not have
  // answers honestly rather than querying an empty table.
  if (!(await hasModule(organizationId, tool.module))) {
    return { result: { error: `The ${tool.module} module is not installed for this workspace.` } };
  }

  const safeArgs = stripTenantKeys(rawArgs);
  try {
    return { result: await tool.run(factoryId, safeArgs) };
  } catch (error) {
    console.error(`Assistant tool ${name} failed`, error);
    return { error: `The ${name} tool could not run.` };
  }
}
