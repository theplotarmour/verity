import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CAPABILITY_PAGE_SURFACES } from "@/server/platform/capability-surfaces";

describe("capability-owned direct-read pages", () => {
  it.each(CAPABILITY_PAGE_SURFACES)("guards $route before its page loader", async (surface) => {
    const source = await readFile(path.resolve(process.cwd(), surface.file), "utf8");

    expect(source).toContain("withCapabilityPageAccess");
    expect(source).toMatch(/export default withCapabilityPageAccess\([A-Z_]+_CAPABILITY,/);
    expect(source).not.toMatch(/export default async function/);
  });
});

