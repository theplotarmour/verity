import { describe, it, expect } from "vitest";
import { parseTemplate, renderTemplate } from "./template";
import type { ResolvedAnswers } from "./types";

describe("parseTemplate", () => {
  it("returns an empty list for an empty template", () => {
    expect(parseTemplate("")).toEqual([]);
  });

  it("parses a single field token", () => {
    expect(parseTemplate("{brand}")).toEqual([{ kind: "field", key: "brand" }]);
  });

  it("parses literal text", () => {
    expect(parseTemplate("Seat Cover")).toEqual([{ kind: "text", text: "Seat Cover" }]);
  });

  it("parses mixed text and tokens", () => {
    expect(parseTemplate("{brand} {model}")).toEqual([
      { kind: "field", key: "brand" },
      { kind: "text", text: " " },
      { kind: "field", key: "model" },
    ]);
  });

  it("parses a separator between tokens", () => {
    expect(parseTemplate("{a}-{b}")).toEqual([
      { kind: "field", key: "a" },
      { kind: "text", text: "-" },
      { kind: "field", key: "b" },
    ]);
  });

  it("keeps leading literal text before the first token", () => {
    expect(parseTemplate("SC {brand}")).toEqual([
      { kind: "text", text: "SC " },
      { kind: "field", key: "brand" },
    ]);
  });

  it("trims whitespace inside braces", () => {
    expect(parseTemplate("{ brand }")).toEqual([{ kind: "field", key: "brand" }]);
  });

  it("treats an unclosed brace as literal text", () => {
    expect(parseTemplate("{brand")).toEqual([{ kind: "text", text: "{brand" }]);
  });
});

const answers: ResolvedAnswers = {
  group: { name: "Seat Cover", code: "SC" },
  brand: { name: "Maruti", code: "MRT" },
  model: { name: "Swift", code: "SWFT" },
  generation: { name: "2005-2011", code: "0511" },
  backType: { name: "DB", code: "DB" },
  headrests: { name: "4HDR", code: "4" },
  armrest: { name: "No Arm", code: "NA" },
  color: { name: "Beige", code: "BEI" },
};

describe("renderTemplate", () => {
  it("renders the display name", () => {
    const out = renderTemplate(
      "{group} {brand} {model} {generation} {backType} {headrests} {armrest} {color}",
      answers,
      "name"
    );
    expect(out).toBe("Seat Cover Maruti Swift 2005-2011 DB 4HDR No Arm Beige");
  });

  it("renders the code using short codes", () => {
    const out = renderTemplate(
      "{group}-{brand}-{model}-{generation}-{backType}{headrests}-{armrest}-{color}",
      answers,
      "code"
    );
    expect(out).toBe("SC-MRT-SWFT-0511-DB4-NA-BEI");
  });

  it("drops an unanswered token and its trailing separator", () => {
    expect(renderTemplate("{brand} {missing} {model}", answers, "name")).toBe("Maruti Swift");
  });

  it("drops an unanswered token in code mode without doubling separators", () => {
    expect(renderTemplate("{brand}-{missing}-{model}", answers, "code")).toBe("MRT-SWFT");
  });

  it("collapses repeated whitespace", () => {
    expect(renderTemplate("{brand}   {model}", answers, "name")).toBe("Maruti Swift");
  });

  it("keeps literal text that precedes an answered token", () => {
    expect(renderTemplate("Kit {brand}", answers, "name")).toBe("Kit Maruti");
  });

  it("keeps a prefix when a later field is answered but the first is not", () => {
    // "Embroidered {design} {panelType}" must still read "Embroidered Swift"
    // when the design is unknown.
    expect(renderTemplate("Embroidered {missing} {model}", answers, "name")).toBe(
      "Embroidered Swift"
    );
  });

  it("drops the prefix when no field at all is answered", () => {
    expect(renderTemplate("Embroidered {missing} {alsoMissing}", answers, "name")).toBe("");
  });

  it("collapses a doubled separator left by a blank field in a code", () => {
    expect(renderTemplate("EMB-{missing}-{model}", answers, "code")).toBe("EMB-SWFT");
  });

  it("trims a trailing separator from a code", () => {
    expect(renderTemplate("{brand}-{missing}", answers, "code")).toBe("MRT");
  });

  it("leaves punctuation inside names alone", () => {
    expect(renderTemplate("{generation}", answers, "name")).toBe("2005-2011");
  });

  it("returns an empty string when nothing is answered", () => {
    expect(renderTemplate("{a} {b}", {}, "name")).toBe("");
  });

  it("returns an empty string for an empty template", () => {
    expect(renderTemplate("", answers, "name")).toBe("");
  });
});
