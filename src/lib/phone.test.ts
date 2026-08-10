import { describe, expect, it } from "vitest";

import { parsePhoneList, phoneKey, samePhone } from "./phone";

describe("phoneKey", () => {
  it("keeps a stored 10-digit number unchanged", () => {
    expect(phoneKey("7011440350")).toBe("7011440350");
  });

  it("drops formatting", () => {
    expect(phoneKey("70114 40350")).toBe("7011440350");
    expect(phoneKey("701-144-0350")).toBe("7011440350");
  });

  it("drops a country code", () => {
    expect(phoneKey("+917011440350")).toBe("7011440350");
    expect(phoneKey("+91 70114 40350")).toBe("7011440350");
    expect(phoneKey("917011440350")).toBe("7011440350");
    expect(phoneKey("0917011440350")).toBe("7011440350");
  });

  it("leaves short and empty input alone rather than matching a suffix", () => {
    expect(phoneKey("440350")).toBe("440350");
    expect(phoneKey("")).toBe("");
    expect(phoneKey(null)).toBe("");
    expect(phoneKey(undefined)).toBe("");
  });
});

describe("samePhone", () => {
  it("matches the same number written two ways", () => {
    expect(samePhone("+91 7011440350", "7011440350")).toBe(true);
  });

  it("does not match different numbers", () => {
    expect(samePhone("7011440350", "7011440351")).toBe(false);
  });

  it("never matches on empty", () => {
    expect(samePhone("", "")).toBe(false);
    expect(samePhone(null, "7011440350")).toBe(false);
  });
});

describe("parsePhoneList", () => {
  it("parses a single number", () => {
    expect(parsePhoneList("7011440350")).toEqual(["7011440350"]);
  });

  it("parses several, normalising each", () => {
    expect(parsePhoneList("+91 7011440350, 9876543210,919000000001")).toEqual([
      "7011440350",
      "9876543210",
      "9000000001",
    ]);
  });

  it("drops blanks so a trailing comma is not an entry", () => {
    expect(parsePhoneList("7011440350,")).toEqual(["7011440350"]);
    expect(parsePhoneList("7011440350, ,")).toEqual(["7011440350"]);
  });

  it("admits nobody when unset or empty", () => {
    expect(parsePhoneList(undefined)).toEqual([]);
    expect(parsePhoneList("")).toEqual([]);
    expect(parsePhoneList("   ")).toEqual([]);
    expect(parsePhoneList(",,")).toEqual([]);
  });
});
