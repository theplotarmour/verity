import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

const OWNER_DIR = path.resolve(__dirname, "../../app/owner");
const ACTIONS_DIR = path.resolve(__dirname, "../../server/actions");

// Mappings of route directories to their owning modules
const PAGE_MODULE_MAP: Record<string, string> = {
  production: "manufacturing",
  floor: "manufacturing",
  "qc-floor": "quality",
  "order-taking": "sales",
  logistics: "sales",
  customers: "sales",
  inventory: "inventory",
  purchase: "procurement",
  kitchen: "kitchen",
  serving: "serving",
  assets: "assets",
  billing: "billing",
  helpdesk: "helpdesk",
  projects: "projects",
  scheduling: "scheduling",
  "service-work-orders": "helpdesk",
  sites: "sites",
};

// Mappings of action files to their owning modules
const ACTION_MODULE_MAP: Record<string, string> = {
  "production.ts": "manufacturing",
  "floor.ts": "manufacturing",
  "inventory.ts": "inventory",
  "purchase.ts": "procurement",
  "qc.ts": "quality",
  "dispatch.ts": "sales",
  "customers.ts": "sales",
  "orders.ts": "sales",
  "diningOrders.ts": "tables_orders",
  "menu.ts": "menu",
  "tables.ts": "tables_orders",
};

describe("Page Entitlement Guards (guardModulePage)", () => {
  it.each(Object.keys(PAGE_MODULE_MAP))("route owner/%s has guardModulePage", (route) => {
    const pageFile = path.join(OWNER_DIR, route, "page.tsx");
    if (!existsSync(pageFile)) return; // some routes might only have sub-routes

    const source = readFileSync(pageFile, "utf8");
    const moduleKey = PAGE_MODULE_MAP[route];

    // Assert that guardModulePage is imported and called with the correct module key
    expect(source, `${route}/page.tsx should import guardModulePage`).toContain("guardModulePage");
    expect(source, `${route}/page.tsx should call guardModulePage("${moduleKey}")`).toContain(
      `guardModulePage("${moduleKey}")`
    );
  });
});

describe("Server Action Entitlement Guards (guardModuleAction/guardModuleWrite)", () => {
  it.each(Object.keys(ACTION_MODULE_MAP))("%s enforces module guards", (file) => {
    const filePath = path.join(ACTIONS_DIR, file);
    if (!existsSync(filePath)) return;

    const source = readFileSync(filePath, "utf8");
    const moduleKey = ACTION_MODULE_MAP[file];

    // Find all exported async functions
    const exportedFunctions = [...source.matchAll(/export async function (\w+)\s*\(/g)].map((m) => m[1]);

    const unguarded: string[] = [];

    for (const name of exportedFunctions) {
      // Find function body
      const start = source.indexOf(`export async function ${name}`);
      const next = source.indexOf("\nexport async function ", start + 1);
      const body = source.slice(start, next === -1 ? undefined : next);

      // Verify that it calls either guardModuleAction or guardModuleWrite with the correct module key
      const hasActionGuard = body.includes(`guardModuleAction("${moduleKey}")`);
      const hasWriteGuard = body.includes(`guardModuleWrite("${moduleKey}")`);

      if (!hasActionGuard && !hasWriteGuard) {
        unguarded.push(name);
      }
    }

    expect(
      unguarded,
      `Action file ${file} has exported actions missing guards for module "${moduleKey}": ${unguarded.join(", ")}`
    ).toEqual([]);
  });
});
