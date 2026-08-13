import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import prisma from "@/lib/prisma";
import { describeRange, isRanged, judgeReading } from "./checkpoint-range";

/**
 * Ranged checkpoints (K1).
 *
 * The point of writing a bound down is that the judgement stops being a person's
 * opinion at the end of a long shift. So the range decides the result, not the
 * tick — and a breach cannot be recorded without saying what was done about it,
 * because a logged breach with no action is an audit finding rather than a record
 * of one being handled.
 */

describe("judgeReading", () => {
  it("fails a reading above the maximum", () => {
    // The case from the spec.
    const verdict = judgeReading("9", { maxValue: 5 });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toContain("above the maximum of 5");
  });

  it("fails a reading below the minimum", () => {
    const verdict = judgeReading("2", { minValue: 60 });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toContain("below the minimum of 60");
  });

  it("treats the bounds as inclusive", () => {
    // "At or below 5°C" is how food safety states a limit. Failing exactly 5
    // would fail every correctly held fridge.
    expect(judgeReading("5", { maxValue: 5 }).ok).toBe(true);
    expect(judgeReading("60", { minValue: 60 }).ok).toBe(true);
  });

  it("honours one bound on its own", () => {
    // A minimum holding temperature with no ceiling is an ordinary rule.
    expect(judgeReading("100", { minValue: 60 }).ok).toBe(true);
    expect(judgeReading("-4", { maxValue: 5 }).ok).toBe(true);
  });

  it("passes anything when no bound is set", () => {
    expect(judgeReading("anything", {}).ok).toBe(true);
    expect(judgeReading(null, { minValue: null, maxValue: null }).ok).toBe(true);
  });

  it("treats an unreadable answer on a ranged checkpoint as a breach", () => {
    // "about 6" in a temperature field is exactly the reading somebody should
    // look at, and passing it would make the range decorative.
    for (const raw of ["about 6", "", null, undefined, "n/a"]) {
      const verdict = judgeReading(raw, { maxValue: 5 });
      expect(verdict.ok, `${String(raw)} should not pass`).toBe(false);
    }
  });

  it("handles a negative range", () => {
    // Freezers.
    expect(judgeReading("-18", { minValue: -22, maxValue: -15 }).ok).toBe(true);
    expect(judgeReading("-10", { minValue: -22, maxValue: -15 }).ok).toBe(false);
  });
});

describe("isRanged", () => {
  it("is true when either bound is set", () => {
    expect(isRanged({ minValue: 0 })).toBe(true);
    expect(isRanged({ maxValue: 5 })).toBe(true);
    expect(isRanged({ minValue: 1, maxValue: 5 })).toBe(true);
  });

  it("counts zero as a bound", () => {
    // A minimum of 0 is a real rule, and a truthiness check would drop it.
    expect(isRanged({ minValue: 0, maxValue: null })).toBe(true);
  });

  it("is false when neither is set", () => {
    expect(isRanged({})).toBe(false);
    expect(isRanged({ minValue: null, maxValue: null })).toBe(false);
  });
});

describe("describeRange", () => {
  it("reads the way the rule is written", () => {
    expect(describeRange({ minValue: 1, maxValue: 5 })).toBe("1–5");
    expect(describeRange({ minValue: 60 })).toBe("at least 60");
    expect(describeRange({ maxValue: 5 })).toBe("at most 5");
  });
});

describe("the schema carries the columns", () => {
  let checkpointId: string;
  let seeded = false;

  beforeAll(async () => {
    const cp = await prisma.checkpoint.findFirst({ select: { id: true } });
    if (!cp) return;
    checkpointId = cp.id;
    seeded = true;
  });

  afterAll(async () => {
    if (seeded) {
      await prisma.checkpoint.update({
        where: { id: checkpointId },
        data: { minValue: null, maxValue: null },
      });
    }
    await prisma.$disconnect();
  });

  it("stores bounds on a checkpoint and reads them back", async () => {
    if (!seeded) return;
    await prisma.checkpoint.update({
      where: { id: checkpointId },
      data: { minValue: 1, maxValue: 5 },
    });
    const row = await prisma.checkpoint.findUniqueOrThrow({
      where: { id: checkpointId },
      select: { minValue: true, maxValue: true },
    });
    expect(row).toEqual({ minValue: 1, maxValue: 5 });

    // And the reading from the spec fails against what was stored.
    expect(judgeReading("9", row).ok).toBe(false);
  });

  it("carries correctiveAction on the submission, not the template", async () => {
    // The note belongs to the breach, not to the rule — the same checkpoint
    // breaches differently on different days.
    const columns = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
      `select column_name from information_schema.columns
       where table_name = 'CheckpointSubmission' and column_name = 'correctiveAction'`
    );
    expect(columns).toHaveLength(1);
  });
});

describe("completeStage enforces the range", () => {
  const source = readFileSync(
    path.resolve(__dirname, "../server/actions/stages.ts"),
    "utf8"
  );
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "");

  it("refuses a breach with no corrective action", () => {
    expect(code).toMatch(/!verdict\.ok && !r\?\.correctiveAction\?\.trim\(\)/);
  });

  it("forces the result from the range rather than the tick", () => {
    // Without this a worker could tick a checkpoint whose reading is out of
    // bounds, and the range would be decoration.
    expect(code).toMatch(/ok: isRanged\(cp\) \? judgeReading\(r\?\.value, cp\)\.ok : !!r\?\.ok/);
  });

  it("stores what was done about it", () => {
    expect(code).toMatch(/correctiveAction: r\?\.correctiveAction\?\.trim\(\) \|\| null/);
  });

  it("leaves an unranged checkpoint alone", () => {
    // Every existing checklist has null bounds, and none of them should start
    // demanding anything.
    expect(code).toMatch(/if \(isRanged\(cp\)\)/);
  });
});
