import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * No native `<select>` on application screens.
 *
 * Native selects render as the operating system draws them: a grey Windows
 * listbox in the middle of a dark themed app, unsearchable, and unable to open
 * upward when it is near the bottom of a phone screen. The `Select` primitive
 * fixes all three, and it is a drop-in — same props, same change event.
 *
 * Two files are allowed to contain one, and both are the reason the rule works:
 * the primitive itself keeps a hidden native element so uncontrolled consumers
 * and React's own listeners still see a real change event, and the operator
 * console has its own fixed-dark control that must not inherit a tenant accent.
 */

const SRC = path.resolve(__dirname, "../..");

const ALLOWED = new Set([
  // The Select primitive's own hidden native element.
  path.join("components", "ui", "primitives.tsx"),
  // HqSelect — the operator console is deliberately fixed-dark.
  path.join("app", "verity", "ui.tsx"),
]);

function walk(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, found);
    else if (entry.endsWith(".tsx")) found.push(full);
  }
  return found;
}

describe("native select controls", () => {
  it("appear only in the two files allowed to have them", () => {
    const offenders = walk(SRC)
      .filter((file) => /<select[\s>]/.test(readFileSync(file, "utf8")))
      .map((file) => path.relative(SRC, file))
      .filter((rel) => !ALLOWED.has(rel));

    expect(
      offenders,
      `Native <select> found in:\n  ${offenders.join("\n  ")}\n\n` +
        'Use <Select> from "@/components/ui/primitives" — it is a drop-in.',
    ).toEqual([]);
  });

  it("actually scans a meaningful number of files", () => {
    // A walk that silently stopped matching would make the test above green
    // while checking nothing.
    expect(walk(SRC).length).toBeGreaterThan(100);
  });
});
