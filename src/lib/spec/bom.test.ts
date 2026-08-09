import { describe, it, expect } from "vitest";
import { expandBomTemplate, resolveItemBom } from "./bom";

const answers = { fabric: { valueItemId: "item-leatherite" } };
const context = { "design.fabricConsumption": 2.5 };

describe("expandBomTemplate", () => {
  it("emits a fixed line as-is", () => {
    const lines = [
      { itemId: "thread", sourceFieldKey: null, quantity: 1, quantityFrom: null, wastePercent: 0 },
    ];
    expect(expandBomTemplate(lines, answers, context)).toEqual([
      { itemId: "thread", quantity: 1, wastePercent: 0 },
    ]);
  });

  it("resolves the component from a reference field answer", () => {
    const lines = [
      { itemId: null, sourceFieldKey: "fabric", quantity: 1, quantityFrom: null, wastePercent: 0 },
    ];
    expect(expandBomTemplate(lines, answers, context)).toEqual([
      { itemId: "item-leatherite", quantity: 1, wastePercent: 0 },
    ]);
  });

  it("takes the quantity from the context when quantityFrom is set", () => {
    const lines = [
      {
        itemId: null,
        sourceFieldKey: "fabric",
        quantity: 1,
        quantityFrom: "design.fabricConsumption",
        wastePercent: 5,
      },
    ];
    expect(expandBomTemplate(lines, answers, context)).toEqual([
      { itemId: "item-leatherite", quantity: 2.5, wastePercent: 5 },
    ]);
  });

  it("skips a line whose source field is unanswered", () => {
    const lines = [
      { itemId: null, sourceFieldKey: "lining", quantity: 1, quantityFrom: null, wastePercent: 0 },
    ];
    expect(expandBomTemplate(lines, answers, context)).toEqual([]);
  });

  it("skips a line whose quantityFrom is missing from the context", () => {
    const lines = [
      {
        itemId: "thread",
        sourceFieldKey: null,
        quantity: 1,
        quantityFrom: "design.missing",
        wastePercent: 0,
      },
    ];
    expect(expandBomTemplate(lines, answers, context)).toEqual([]);
  });

  it("merges duplicate components by summing quantity", () => {
    const lines = [
      { itemId: "thread", sourceFieldKey: null, quantity: 1, quantityFrom: null, wastePercent: 0 },
      { itemId: "thread", sourceFieldKey: null, quantity: 2, quantityFrom: null, wastePercent: 0 },
    ];
    expect(expandBomTemplate(lines, answers, context)).toEqual([
      { itemId: "thread", quantity: 3, wastePercent: 0 },
    ]);
  });

  it("prefers the fixed item over the source field when both are set", () => {
    const lines = [
      {
        itemId: "thread",
        sourceFieldKey: "fabric",
        quantity: 1,
        quantityFrom: null,
        wastePercent: 0,
      },
    ];
    expect(expandBomTemplate(lines, answers, context)[0].itemId).toBe("thread");
  });

  it("returns nothing for an empty template", () => {
    expect(expandBomTemplate([], answers, context)).toEqual([]);
  });
});

describe("resolveItemBom", () => {
  const line = (over: Partial<import("./bom").BomTemplateLineShape> = {}) => ({
    itemId: null,
    sourceFieldKey: null,
    quantity: 1,
    quantityFrom: null,
    wastePercent: 0,
    ...over,
  });

  const base = {
    groupLabel: "Seat Cover recipe",
    groupLines: [],
    contributions: [],
    overrides: [],
    answers,
    context,
  };

  it("passes the category recipe through, labelled", () => {
    const out = resolveItemBom({ ...base, groupLines: [line({ itemId: "foam", quantity: 2 })] });
    expect(out).toEqual([
      { itemId: "foam", quantity: 2, wastePercent: 0, source: "group", sourceLabel: "Seat Cover recipe" },
    ]);
  });

  it("brings in a contribution and names what brought it", () => {
    const out = resolveItemBom({
      ...base,
      contributions: [{ ...line({ itemId: "piping", quantity: 1.5 }), sourceLabel: "ERGO FIT Vertex" }],
    });
    expect(out).toEqual([
      { itemId: "piping", quantity: 1.5, wastePercent: 0, source: "contribution", sourceLabel: "ERGO FIT Vertex" },
    ]);
  });

  it("fills a contribution's slot from the answered field", () => {
    // The "[fabric slot]": the design says how much, the answer says which.
    const out = resolveItemBom({
      ...base,
      contributions: [
        {
          ...line({ sourceFieldKey: "fabric", quantityFrom: "design.fabricConsumption" }),
          sourceLabel: "ERGO FIT Vertex",
        },
      ],
    });
    expect(out).toEqual([
      {
        itemId: "item-leatherite",
        quantity: 2.5,
        wastePercent: 0,
        source: "contribution",
        sourceLabel: "ERGO FIT Vertex",
      },
    ]);
  });

  it("sums a component the recipe and a contribution both call for, keeping both labels", () => {
    const out = resolveItemBom({
      ...base,
      groupLines: [line({ itemId: "thread", quantity: 20 })],
      contributions: [{ ...line({ itemId: "thread", quantity: 50 }), sourceLabel: "ERGO FIT Vertex" }],
    });
    expect(out).toEqual([
      {
        itemId: "thread",
        quantity: 70,
        wastePercent: 0,
        source: "contribution",
        sourceLabel: "Seat Cover recipe + ERGO FIT Vertex",
      },
    ]);
  });

  it("lets an override replace an inherited quantity rather than adding to it", () => {
    // Summing here would make correcting a quantity downward impossible.
    const out = resolveItemBom({
      ...base,
      groupLines: [line({ itemId: "foam", quantity: 2 })],
      overrides: [{ componentItemId: "foam", removed: false, quantity: 0.5, wastePercent: 5 }],
    });
    expect(out).toEqual([
      {
        itemId: "foam",
        quantity: 0.5,
        wastePercent: 5,
        source: "override",
        sourceLabel: "overrides Seat Cover recipe",
      },
    ]);
  });

  it("lets an override drop an inherited line", () => {
    const out = resolveItemBom({
      ...base,
      groupLines: [line({ itemId: "foam", quantity: 2 }), line({ itemId: "thread", quantity: 1 })],
      overrides: [{ componentItemId: "foam", removed: true, quantity: 0, wastePercent: 0 }],
    });
    expect(out.map((l) => l.itemId)).toEqual(["thread"]);
  });

  it("lets an override add a component nothing else calls for", () => {
    const out = resolveItemBom({
      ...base,
      overrides: [{ componentItemId: "bracket", removed: false, quantity: 2, wastePercent: 0 }],
    });
    expect(out).toEqual([
      {
        itemId: "bracket",
        quantity: 2,
        wastePercent: 0,
        source: "override",
        sourceLabel: "added on this item",
      },
    ]);
  });

  it("drops a contribution whose slot the item never answered", () => {
    // A missing line the owner can see beats a line pointing at nothing.
    const out = resolveItemBom({
      ...base,
      answers: {},
      contributions: [{ ...line({ sourceFieldKey: "fabric" }), sourceLabel: "ERGO FIT Vertex" }],
    });
    expect(out).toEqual([]);
  });

  it("removing a component that was never there is a no-op, not a crash", () => {
    const out = resolveItemBom({
      ...base,
      overrides: [{ componentItemId: "ghost", removed: true, quantity: 0, wastePercent: 0 }],
    });
    expect(out).toEqual([]);
  });
});
