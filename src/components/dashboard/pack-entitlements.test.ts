import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { VERTICAL_PACKS } from "@/platform/tenancy/packs";
import { withDependencies, type ModuleKey } from "@/platform/modules/registry";

/**
 * A dashboard may only show what its pack entitles.
 *
 * This is the failure it exists for, found in production code: the QSR
 * dashboard renders an outlet list and an open-issues count — Sites and Tickets
 * — while `franchise_qsr` entitled neither the `sites` nor the `helpdesk`
 * module. Prisma does not check entitlements, so the dashboard queried happily
 * and rendered numbers. Everything the numbers linked to was module-gated and
 * redirected. The panel worked; the product behind it did not exist.
 *
 * Nothing throws in that situation, which is why it needs a test rather than
 * care. The required modules are derived by reading each dashboard's own
 * queries, so a panel added later is covered without anyone remembering to
 * update a list.
 */

const DASHBOARDS: Record<string, string> = {
  auto_components: "AutoComponentsDashboard.tsx",
  facility_management: "FacilityManagementDashboard.tsx",
  franchise_qsr: "QsrFranchiseDashboard.tsx",
  franchise_retail: "RetailFranchiseDashboard.tsx",
};

/**
 * Which module owns each Prisma model.
 *
 * One map rather than four hand-written module lists: adding a query to a
 * dashboard is what should trigger this check, and that happens far more often
 * than anyone revisits a pack definition.
 */
const MODEL_MODULE: Record<string, ModuleKey | null> = {
  // core — always on, no entitlement needed
  user: null,
  auditLog: null,
  customer: null,
  factory: null,
  // Every module writes notifications and the shell reads them for every user,
  // so the warnings queue needs no entitlement of its own.
  notification: null,

  // The funnel buckets by department, and a department is a station on a
  // production route — the same module that owns job cards.
  department: "manufacturing",

  attendanceLog: "hr",
  shiftSchedule: "scheduling",
  site: "sites",
  ticket: "helpdesk",

  inspection: "quality",
  checkpoint: "quality",
  checkpointSubmission: "quality",
  qualityReport: "quality",
  serviceInspection: "quality",

  salesOrder: "sales",
  itemMaster: "inventory",
  stockLedgerEntry: "inventory",
  purchaseOrderItem: "procurement",
  purchaseOrder: "procurement",
};

function modelsQueriedBy(file: string): string[] {
  const source = readFileSync(path.join(__dirname, file), "utf8");
  const found = new Set<string>();
  for (const match of source.matchAll(/prisma\.([a-zA-Z]+)\./g)) found.add(match[1]);
  return [...found];
}

describe("dashboards only show what their pack entitles", () => {
  it.each(Object.entries(DASHBOARDS))("%s", (packKey, file) => {
    const entitled = new Set(withDependencies(VERTICAL_PACKS[packKey].modules));

    const missing: string[] = [];
    for (const model of modelsQueriedBy(file)) {
      const required = MODEL_MODULE[model];
      if (required === undefined) {
        throw new Error(
          `${file} queries prisma.${model}, which is not in MODEL_MODULE. ` +
            "Add it — mapping it to null means 'core, always on'.",
        );
      }
      if (required === null) continue;
      if (!entitled.has(required)) missing.push(`prisma.${model} needs "${required}"`);
    }

    expect(
      missing,
      `${packKey} mounts ${file}, which reads data the pack does not entitle:\n  ` +
        `${missing.join("\n  ")}\n\n` +
        "Either add the module to the pack, or drop the panel. A panel whose " +
        "links all redirect is worse than no panel.",
    ).toEqual([]);
  });

  it("maps every model the dashboards actually query", () => {
    // Guards the guard: an unmapped model throws above, but only if the scan
    // still finds it.
    const all = Object.values(DASHBOARDS).flatMap(modelsQueriedBy);
    expect(all.length).toBeGreaterThan(15);
    for (const model of all) {
      expect(MODEL_MODULE, `prisma.${model} is unmapped`).toHaveProperty(model);
    }
  });
});

describe("service inspections are reachable by every pack that shows them", () => {
  it("is guarded on a module all four packs carry", () => {
    // The original bug: these actions were gated on `helpdesk`, which neither
    // franchise pack has, so their SOP engine was unreachable while their
    // dashboard advertised it.
    const source = readFileSync(
      path.resolve(__dirname, "../../server/actions/serviceQuality.ts"),
      "utf8",
    );
    const guards = [...source.matchAll(/guardModuleAction\("(\w+)"\)/g)].map((m) => m[1]);

    expect(guards.length).toBeGreaterThan(0);

    for (const guard of new Set(guards)) {
      const packsWithout = Object.entries(VERTICAL_PACKS)
        .filter(([, pack]) => !withDependencies(pack.modules).includes(guard as ModuleKey))
        .map(([key]) => key);

      expect(
        packsWithout,
        `serviceQuality.ts guards on "${guard}", missing from: ${packsWithout.join(", ")}`,
      ).toEqual([]);
    }
  });
});
