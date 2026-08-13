import "server-only";

import { $Enums } from "@prisma/client";

import prisma from "@/lib/prisma";
import { entitledModules } from "@/platform/modules/entitlements";
import { getModule } from "@/platform/modules/registry";
import { resolvePackKey, packLabel } from "@/platform/tenancy/packs";

/**
 * What the assistant is allowed to know.
 *
 * Three things, and only three: which modules this tenant actually has, where the
 * user is standing, and the exact enum values the schema uses. Everything the
 * model says about the product has to be grounded in the first; everything it says
 * about a status has to match the third, or it invents a `COMPLETED` that the
 * schema calls `ATTENDED` and a user goes looking for a button that is not there.
 *
 * Enum values come from `$Enums` at runtime rather than by parsing
 * `@prisma/client/index.d.ts`. Same guarantee — nothing hand-maintained, generated
 * straight from the schema — without depending on the layout of a generated file
 * that Prisma is free to change. If a value is wrong here, it is wrong in the
 * database too.
 */

export interface AssistantContext {
  factoryId: string;
  packKey: string | null;
  packLabel: string | null;
  route: string;
  modules: Array<{ key: string; name: string; description: string; version: string }>;
  enums: Record<string, readonly string[]>;
}

/** Enums the assistant is likely to be asked about. */
const EXPOSED_ENUMS = [
  "OrderState",
  "TableState",
  "PaymentMethod",
  "QCStatus",
  "ScheduleStatus",
  "SiteStatus",
  "TicketStatus",
  "TicketPriority",
  "ProjectStatus",
  "TaskStatus",
  "AssetStatus",
  "SubscriptionStatus",
  "NotificationType",
  "ItemType",
] as const;

/** Every value of every exposed enum, read off the generated client. */
export function schemaEnums(): Record<string, readonly string[]> {
  const out: Record<string, readonly string[]> = {};
  const all = $Enums as unknown as Record<string, Record<string, string>>;
  for (const name of EXPOSED_ENUMS) {
    const values = all[name];
    // A renamed or dropped enum simply stops appearing, rather than shipping a
    // stale hand-written list that reads as authoritative.
    if (values) out[name] = Object.values(values);
  }
  return out;
}

export async function buildAssistantContext(
  factoryId: string,
  route: string
): Promise<AssistantContext> {
  const factory = await prisma.factory.findUnique({
    where: { id: factoryId },
    select: { organizationId: true, industry: true },
  });
  if (!factory) {
    return { factoryId, packKey: null, packLabel: null, route, modules: [], enums: schemaEnums() };
  }

  const keys = await entitledModules(factory.organizationId);

  return {
    factoryId,
    packKey: resolvePackKey(factory.industry),
    packLabel: packLabel(factory.industry),
    route,
    // Only what this tenant has. A restaurant asking about work orders should be
    // told the module is not installed, not walked through a screen it cannot open.
    modules: keys.flatMap((key) => {
      const mod = getModule(key);
      return mod
        ? [{ key: mod.key, name: mod.name, description: mod.description, version: mod.version }]
        : [];
    }),
    enums: schemaEnums(),
  };
}

/** The grounding block, as the system prompt sees it. */
export function contextToPrompt(context: AssistantContext): string {
  const modules = context.modules.map((m) => `- ${m.name} (${m.key}): ${m.description}`).join("\n");
  const enums = Object.entries(context.enums)
    .map(([name, values]) => `- ${name}: ${values.join(", ")}`)
    .join("\n");

  return [
    `Workspace type: ${context.packLabel ?? "not set"}`,
    `Current screen: ${context.route}`,
    "",
    "Installed modules — the ONLY features this workspace has:",
    modules || "- none",
    "",
    "Exact status values from the schema. Never invent one:",
    enums,
  ].join("\n");
}
