import { describe, expect, it } from "vitest";
import { COMBINATION_CAP, expandCombinations, widestSelection } from "./combinations";
import type { SpecAnswer } from "./types";

const opt = (id: string): SpecAnswer => ({ optionId: id });

describe("expandCombinations", () => {
  it("returns the fixed answers alone when nothing is multi-selected", () => {
    const { rows, total, capped } = expandCombinations({ brand: opt("maruti") }, []);
    expect(rows).toEqual([{ brand: opt("maruti") }]);
    expect(total).toBe(1);
    expect(capped).toBe(false);
  });

  it("multiplies every multi field against the fixed answers", () => {
    const { rows, total } = expandCombinations({ model: opt("swift") }, [
      { key: "design", answers: [opt("spc"), opt("ergo")] },
      { key: "fabric", answers: [opt("black"), opt("beige")] },
    ]);

    expect(total).toBe(4);
    expect(rows).toHaveLength(4);
    // Every row keeps the fixed answer.
    expect(rows.every((r) => r.model?.optionId === "swift")).toBe(true);
    // Every combination appears exactly once.
    const seen = rows.map((r) => `${r.design?.optionId}/${r.fabric?.optionId}`).sort();
    expect(seen).toEqual(["ergo/beige", "ergo/black", "spc/beige", "spc/black"]);
  });

  it("varies the last field fastest, so rows read like an odometer", () => {
    const { rows } = expandCombinations({}, [
      { key: "design", answers: [opt("a"), opt("b")] },
      { key: "fabric", answers: [opt("x"), opt("y")] },
    ]);
    expect(rows.map((r) => `${r.design?.optionId}${r.fabric?.optionId}`)).toEqual([
      "ax",
      "ay",
      "bx",
      "by",
    ]);
  });

  it("skips a multi field with nothing ticked rather than producing no rows", () => {
    // An untouched multi field means "not answered", same as in single mode. If
    // it collapsed the product the owner would see an empty grid with no clue why.
    const { rows, total } = expandCombinations({ model: opt("swift") }, [
      { key: "design", answers: [opt("spc")] },
      { key: "colour", answers: [] },
    ]);
    expect(total).toBe(1);
    expect(rows).toEqual([{ model: opt("swift"), design: opt("spc") }]);
    expect(rows[0]).not.toHaveProperty("colour");
  });

  it("refuses rather than generating past the cap", () => {
    const many = (n: number) => Array.from({ length: n }, (_, i) => opt(`o${i}`));
    const { rows, total, capped } = expandCombinations({}, [
      { key: "a", answers: many(10) },
      { key: "b", answers: many(10) },
      { key: "c", answers: many(10) },
    ]);
    expect(total).toBe(1000);
    expect(capped).toBe(true);
    expect(rows).toEqual([]);
  });

  it("allows exactly the cap", () => {
    const many = (n: number) => Array.from({ length: n }, (_, i) => opt(`o${i}`));
    const { rows, capped } = expandCombinations({}, [{ key: "a", answers: many(COMBINATION_CAP) }]);
    expect(capped).toBe(false);
    expect(rows).toHaveLength(COMBINATION_CAP);
  });

  it("does not let a multi answer leak between rows", () => {
    const { rows } = expandCombinations({}, [{ key: "design", answers: [opt("a"), opt("b")] }]);
    rows[0].design = opt("mutated");
    expect(rows[1].design?.optionId).toBe("b");
  });
});

describe("widestSelection", () => {
  it("names the field to narrow", () => {
    const widest = widestSelection([
      { key: "design", answers: [opt("a"), opt("b")] },
      { key: "fabric", answers: [opt("x"), opt("y"), opt("z")] },
    ]);
    expect(widest?.key).toBe("fabric");
  });

  it("has nothing useful to say when no field has more than one value", () => {
    expect(widestSelection([{ key: "design", answers: [opt("a")] }])).toBeNull();
    expect(widestSelection([])).toBeNull();
  });
});
