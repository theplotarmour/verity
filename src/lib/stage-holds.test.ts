import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { HOLD_CAUSES, HOLD_CAUSE_KEYS, isUrgentHold, normalizeHoldCause } from "./stage-holds";

/**
 * Stage holds and the supervisor alert.
 *
 * `holdStage` parked the card, wrote a timeline entry and told nobody — and the UI
 * called it with no reason at all, so the `reason` parameter had never carried a
 * value in production. A stopped stage is idle capacity from that moment; a
 * supervisor finding out at shift end is the whole cost of the bug.
 */
describe("hold causes", () => {
  it("offers a machine failure and a critical delay as first-class causes", () => {
    expect(HOLD_CAUSE_KEYS).toContain("MACHINE_FAILURE");
    expect(HOLD_CAUSE_KEYS).toContain("CRITICAL_DELAY");
  });

  it("treats those two as urgent and the rest as informational", () => {
    expect(isUrgentHold("MACHINE_FAILURE")).toBe(true);
    expect(isUrgentHold("CRITICAL_DELAY")).toBe(true);
    // A material wait usually has a purchase trail behind it already, and
    // "other" is by definition untriaged. Both still notify; neither shouts.
    expect(isUrgentHold("MATERIAL_SHORTAGE")).toBe(false);
    expect(isUrgentHold("OTHER")).toBe(false);
  });

  it("has a label for every cause, so no alert says MACHINE_FAILURE at a worker", () => {
    for (const key of HOLD_CAUSE_KEYS) {
      expect(HOLD_CAUSES[key]).toBeTruthy();
      expect(HOLD_CAUSES[key]).not.toMatch(/_/);
    }
  });
});

describe("normalizeHoldCause", () => {
  it("passes a known cause through", () => {
    expect(normalizeHoldCause("MACHINE_FAILURE")).toBe("MACHINE_FAILURE");
  });

  it("falls back to OTHER for anything it does not recognise", () => {
    // The cause arrives as a server-action argument, which means anything at all.
    // An unknown value must not be able to forge an urgent alert, or become one.
    for (const junk of [undefined, null, "", "URGENT", 42, {}, "constructor", "__proto__"]) {
      expect(normalizeHoldCause(junk)).toBe("OTHER");
    }
  });
});

describe("holdStage", () => {
  const source = readFileSync(path.resolve(__dirname, "../server/actions/stages.ts"), "utf8");
  const hold = source.slice(
    source.indexOf("export async function holdStage"),
    source.indexOf("type ChecklistItemPayload")
  );
  const code = hold.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "");

  it("notifies supervisors", () => {
    expect(code).toMatch(/supervisorRecipients\(session\.factoryId\)/);
    expect(code).toMatch(/emitEvent\(\{/);
  });

  it("is tenant-scoped on both the read and the fan-out", () => {
    expect(code).toMatch(/where: \{ id: jobCardId, factoryId: session\.factoryId \}/);
    expect(code).toMatch(/factoryId: session\.factoryId,\s*\n\s*event: "STAGE_HELD"/);
  });

  it("narrows the cause instead of trusting the argument", () => {
    expect(code).toMatch(/normalizeHoldCause\(cause\)/);
  });

  it("escalates only the urgent causes", () => {
    expect(code).toMatch(/isUrgentHold\(holdCause\)/);
    expect(code).toMatch(/urgent \? "ACTION_REQUIRED" : "WARNING"/);
  });

  it("does not alert the worker who reported it", () => {
    expect(code).toMatch(/filter\(\s*\n?\s*\(id\) => id !== session\.userId/);
  });

  it("holds the card before it notifies, and survives a failed fan-out", () => {
    // The order matters: a worker must always be able to stop a broken machine,
    // even if every notification channel is down.
    const update = code.indexOf('data: { status: "ON_HOLD" }');
    const emit = code.indexOf("emitEvent(");
    expect(update).toBeGreaterThan(-1);
    expect(emit).toBeGreaterThan(update);
    expect(code).toMatch(/catch \(e\)[\s\S]*Stage-held alert failed/);
  });
});

describe("the hold UI collects a cause", () => {
  const client = readFileSync(
    path.resolve(__dirname, "../app/worker/stage/[id]/client.tsx"),
    "utf8"
  );

  it("passes one to the action", () => {
    // Before this, the screen called `holdStage(job.id)` with no reason at all —
    // the parameter existed and was never populated, which is why every hold
    // looked the same on the floor board.
    expect(client).toMatch(/holdStage\(job\.id, holdNote\.trim\(\) \|\| undefined, cause\)/);
  });

  it("renders a button per cause from the shared list", () => {
    // Not a second hardcoded list: the server validates against the same keys.
    expect(client).toMatch(/HOLD_CAUSE_KEYS\.map/);
    expect(client).toMatch(/HOLD_CAUSES\[cause\]/);
  });
});
