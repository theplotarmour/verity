import { z } from "zod";
import type { PermissionVerb } from "@prisma/client";
import type { ActorContext } from "./command";
import type { TenantScopedClient } from "./tenancy";
import { hasPermission } from "./authorization";

/**
 * Dashboard composition (Authority: Task 108 WP-11B, VCA-009).
 *
 * A pack contribution of kind `"dashboard"` (`PackContribution` in `pack.ts`)
 * carries a stable ID and a free-form `config` JSON — that is the ownership
 * and provenance record, not a rendering contract. This module is the
 * missing piece: it defines the actual widget contract WP-11B requires
 * ("data query ID, permission, capability owner, ... states, size
 * constraints") and resolves which widgets a given actor may see, in
 * deterministic order.
 *
 * Data fetching is deliberately NOT done here. Each widget names a
 * registered query by `queryKey`; the client calls it through the existing
 * `runQuery(key, input)` server action (the same generic dispatch
 * `CommandPalette` and `KanbanBoard` already use), one widget at a time. That
 * is what gives "isolate panel failure so one contribution does not crash
 * the whole dashboard" for free — a failed `runQuery` call fails only the
 * one widget's fetch, not this resolution step or any other widget.
 */

export const dashboardWidgetConfigSchema = z.object({
  queryKey: z.string().min(1),
  title: z.string().min(1).max(120),
  size: z.enum(["sm", "md", "lg", "full"]).default("md"),
  requiresVerb: z.enum(["Read", "Create", "Edit", "Delete", "ActionExecute"]).default("Read"),
  requiresEntity: z.string().min(1),
  /** Performance budget in milliseconds — advisory to the client, not enforced server-side. */
  budgetMs: z.number().int().positive().max(10_000).default(2_000),
});
export type DashboardWidgetConfig = z.infer<typeof dashboardWidgetConfigSchema>;

export type DashboardWidget = DashboardWidgetConfig & {
  contributionId: string;
  ownerCapability: string | null;
};

export class DashboardWidgetError extends Error {
  readonly code = "E_DASHBOARD_WIDGET_INVALID" as const;
}

/**
 * Resolves the widgets this actor may see, from every `dashboard`-kind
 * contribution belonging to a pack instance currently `Active` for this
 * tenant (WP-10's `PackInstance.state`).
 *
 * A contribution whose `config` fails `dashboardWidgetConfigSchema`, or whose
 * owning capability is inactive, is SKIPPED rather than thrown — one bad or
 * stale contribution must not take the whole dashboard down (WP-11B
 * §"Isolate panel failure"). Ordering is by `contributionId`, so it is stable
 * across calls regardless of database return order; a genuine ID collision
 * is impossible in the first place because `PackContribution` enforces
 * `@@unique([tenantId, contributionId])` at write time (WP-11B
 * §"Enforce deterministic ordering and collision handling").
 */
export async function resolveDashboardWidgets(tx: TenantScopedClient, actor: ActorContext): Promise<DashboardWidget[]> {
  const [contributions, activeCapabilityIds] = await Promise.all([
    tx.packContribution.findMany({
      where: { tenantId: actor.tenantId, kind: "dashboard", instance: { state: "Active" } },
      orderBy: { contributionId: "asc" },
    }),
    tx.tenantActivation.findMany({ where: { status: "Active" }, select: { capabilityId: true } }),
  ]);
  const activeCapabilities = new Set(activeCapabilityIds.map((a) => a.capabilityId));

  const widgets: DashboardWidget[] = [];
  for (const contribution of contributions) {
    if (contribution.ownerCapability && !activeCapabilities.has(contribution.ownerCapability)) continue;

    const parsed = dashboardWidgetConfigSchema.safeParse(contribution.config);
    if (!parsed.success) continue; // skip, do not throw — see doc comment above

    const allowed = await hasPermission(tx, actor.roleId, parsed.data.requiresVerb as PermissionVerb, parsed.data.requiresEntity);
    if (!allowed) continue;

    widgets.push({ ...parsed.data, contributionId: contribution.contributionId, ownerCapability: contribution.ownerCapability });
  }

  return widgets;
}
