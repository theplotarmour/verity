import { describe, it, expect } from "vitest";
import { blockingReason, planAnswer, summarisePlans } from "./retype";

const text = (v: string) => ({ valueText: v, valueNumber: null, valueBool: null, optionLabel: null });
const num = (v: number) => ({ valueText: null, valueNumber: v, valueBool: null, optionLabel: null });
const bool = (v: boolean) => ({ valueText: null, valueNumber: null, valueBool: v, optionLabel: null });
const opt = (label: string) => ({ valueText: null, valueNumber: null, valueBool: null, optionLabel: label });

describe("planAnswer", () => {
  it("keeps text across TEXT and TEXTAREA", () => {
    expect(planAnswer("TEXT", "TEXTAREA", text("hi")).action).toBe("keep");
    expect(planAnswer("TEXTAREA", "TEXT", text("hi")).action).toBe("keep");
  });

  it("keeps numbers across NUMBER and MEASUREMENT", () => {
    expect(planAnswer("NUMBER", "MEASUREMENT", num(220)).action).toBe("keep");
    expect(planAnswer("MEASUREMENT", "NUMBER", num(220)).action).toBe("keep");
  });

  it("stringifies a number into text", () => {
    const plan = planAnswer("NUMBER", "TEXT", num(220));
    expect(plan.action).toBe("coerce");
    expect(plan.next!.valueText).toBe("220");
    expect(plan.next!.valueNumber).toBeNull();
  });

  it("writes a toggle out as Yes or No", () => {
    expect(planAnswer("TOGGLE", "TEXT", bool(true)).next!.valueText).toBe("Yes");
    expect(planAnswer("TOGGLE", "TEXT", bool(false)).next!.valueText).toBe("No");
  });

  it("writes an option out as its label", () => {
    const plan = planAnswer("OPTION", "TEXT", opt("Double Back"));
    expect(plan.action).toBe("coerce");
    expect(plan.next!.valueText).toBe("Double Back");
  });

  it("parses text into a number where it can", () => {
    expect(planAnswer("TEXT", "NUMBER", text("220")).next!.valueNumber).toBe(220);
    expect(planAnswer("TEXT", "NUMBER", text("220.5")).next!.valueNumber).toBe(220.5);
  });

  it("clears text that is not a number", () => {
    expect(planAnswer("TEXT", "NUMBER", text("beige")).action).toBe("clear");
  });

  it("clears everything when moving to a list, link or toggle", () => {
    for (const to of ["OPTION", "REFERENCE", "TOGGLE"]) {
      expect(planAnswer("TEXT", to, text("hi")).action).toBe("clear");
    }
  });

  it("keeps an empty answer as a keep, whatever the conversion", () => {
    const empty = { valueText: null, valueNumber: null, valueBool: null, optionLabel: null };
    expect(planAnswer("TEXT", "OPTION", empty).action).toBe("keep");
  });

  it("keeps everything when the type has not actually changed", () => {
    expect(planAnswer("OPTION", "OPTION", opt("Double Back")).action).toBe("keep");
  });

  it("converts an option's label into a number where it parses", () => {
    expect(planAnswer("OPTION", "NUMBER", opt("220")).next!.valueNumber).toBe(220);
    expect(planAnswer("OPTION", "NUMBER", opt("Beige")).action).toBe("clear");
  });

  it("rewrites rather than drops a number moving into a text-backed column", () => {
    // DATE, COLOR, IMAGE and FILE all store into valueText. Stringifying is
    // reversible — convert back to Number and "220" parses again — whereas
    // clearing would lose the figure for good.
    for (const to of ["DATE", "COLOR", "IMAGE", "FILE"]) {
      const plan = planAnswer("NUMBER", to, num(220));
      expect(plan.action).toBe("coerce");
      expect(plan.next!.valueText).toBe("220");
    }
  });

  it("round-trips a number through a text-backed column", () => {
    const out = planAnswer("NUMBER", "DATE", num(220));
    const back = planAnswer("DATE", "NUMBER", out.next!);
    expect(back.next!.valueNumber).toBe(220);
  });

  it("carries text into a date, colour or file column unchanged", () => {
    expect(planAnswer("TEXT", "DATE", text("2026-07-30")).action).toBe("keep");
  });
});

describe("blockingReason", () => {
  const clear = { dependents: [], bomLineCount: 0, optionContributionCount: 0 };

  it("allows a retype when nothing relies on the column", () => {
    expect(blockingReason(clear)).toBeNull();
  });

  it("names the single field that filters by this one", () => {
    const reason = blockingReason({ ...clear, dependents: [{ name: "Model" }] });
    expect(reason).toContain('"Model"');
    expect(reason).toContain("filters by this column");
  });

  it("pluralises when several fields depend on it", () => {
    const reason = blockingReason({
      ...clear,
      dependents: [{ name: "Model" }, { name: "Generation" }],
    });
    expect(reason).toContain('"Model", "Generation"');
    expect(reason).toContain("filter by this column");
  });

  it("blocks a column that drives a BOM template", () => {
    expect(blockingReason({ ...clear, bomLineCount: 1 })).toContain("BOM template");
  });

  it("blocks a column whose choices carry components", () => {
    expect(blockingReason({ ...clear, optionContributionCount: 2 })).toContain("choices");
  });

  it("reports the dependency first when several rules apply", () => {
    const reason = blockingReason({
      dependents: [{ name: "Model" }],
      bomLineCount: 3,
      optionContributionCount: 4,
    });
    expect(reason).toContain('"Model"');
  });
});

describe("summarisePlans", () => {
  it("counts each outcome", () => {
    const plans = [
      planAnswer("NUMBER", "TEXT", num(1)),
      planAnswer("TEXT", "TEXTAREA", text("a")),
      planAnswer("TEXT", "NUMBER", text("nope")),
    ];
    expect(summarisePlans(plans)).toEqual({ kept: 1, coerced: 1, cleared: 1 });
  });

  it("counts nothing for an empty list", () => {
    expect(summarisePlans([])).toEqual({ kept: 0, coerced: 0, cleared: 0 });
  });
});
