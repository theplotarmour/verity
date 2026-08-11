import { describe, it, expect } from "vitest";
import { csvField, tallyDate, toTallyCsv, TALLY_COLUMNS, type TallyRow } from "./tally";

/**
 * The Tally export's column contract and its escaping.
 *
 * Two failure modes worth a test. The first is quiet: Tally maps columns by
 * header text, so renaming one breaks somebody's month-end without any error.
 * The second is not quiet at all — a CSV field beginning `=` is a formula, and
 * this file's whole purpose is to be opened in Excel on the way to Tally.
 */

const row = (over: Partial<TallyRow> = {}): TallyRow => ({
  voucherDate: "01-08-2026",
  voucherNumber: "SO-1001",
  partyName: "Acme Motors",
  partyGstin: "27AAAAA0000A1Z5",
  address: "12 MG Road",
  itemName: "Seat Cover",
  quantity: 2,
  rate: 4500,
  amount: 9000,
  narration: "BlueDart / MH12AB1234",
  ...over,
});

describe("column contract", () => {
  it("keeps the headers Tally maps on", () => {
    // Renaming any of these silently breaks an existing import mapping.
    expect(TALLY_COLUMNS.map((c) => c.header)).toEqual([
      "Voucher Date",
      "Voucher Number",
      "Party Name",
      "Party GSTIN",
      "Address",
      "Item Name",
      "Quantity",
      "Rate",
      "Amount",
      "Narration",
    ]);
  });

  it("emits the header row first, then one row per record", () => {
    const csv = toTallyCsv([row(), row({ itemName: "Floor Mat" })]);
    const lines = csv.trimEnd().split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain("Voucher Date");
    expect(lines[1]).toContain("Seat Cover");
  });

  it("uses CRLF, because Tally's importer is a Windows program", () => {
    // With bare LF it reads the whole file as one line.
    expect(toTallyCsv([row()])).toContain("\r\n");
  });
});

describe("csvField", () => {
  it("passes ordinary values through unquoted", () => {
    expect(csvField("Acme Motors")).toBe("Acme Motors");
    expect(csvField(9000)).toBe("9000");
  });

  it("quotes and doubles embedded quotes", () => {
    expect(csvField('He said "yes"')).toBe('"He said ""yes"""');
  });

  it("quotes fields containing commas or newlines", () => {
    expect(csvField("12 MG Road, Pune")).toBe('"12 MG Road, Pune"');
    expect(csvField("Line one\nLine two")).toBe('"Line one\nLine two"');
  });

  it("neutralises formula injection without losing the value", () => {
    // A customer named this is a payload that runs when the file is opened.
    // The name must survive — only its interpretation changes.
    for (const dangerous of ["=1+1", "+1", "-1", "@SUM(A1)", "=cmd|'/c calc'!A0"]) {
      const out = csvField(dangerous);
      expect(out.replace(/^"|"$/g, "").startsWith("'"), `${dangerous} was not neutralised`).toBe(true);
      expect(out).toContain(dangerous.replace(/"/g, ""));
    }
  });

  it("renders null and undefined as empty, not as the words", () => {
    // "undefined" in a GSTIN column is worse than a blank.
    expect(csvField(null)).toBe("");
    expect(csvField(undefined)).toBe("");
  });

  it("neutralises a dangerous value that also needs quoting", () => {
    const out = csvField('=HYPERLINK("http://evil","click")');
    expect(out.startsWith('"\'')).toBe(true);
  });
});

describe("tallyDate", () => {
  it("formats as DD-MM-YYYY, not ISO", () => {
    // 2026-08-01 as ISO imports as the wrong day in a DD-MM locale.
    expect(tallyDate(new Date(2026, 7, 1))).toBe("01-08-2026");
    expect(tallyDate(new Date(2026, 11, 25))).toBe("25-12-2026");
  });

  it("pads single digits", () => {
    expect(tallyDate(new Date(2026, 0, 5))).toBe("05-01-2026");
  });
});

describe("a full file", () => {
  it("survives a hostile customer name end to end", () => {
    const csv = toTallyCsv([row({ partyName: '=cmd|"/c calc"!A0', address: "A, B" })]);
    const dataLine = csv.trimEnd().split("\r\n")[1];
    // Neutralised, quoted because of the embedded quotes, and still legible.
    expect(dataLine).toContain("'=cmd");
    expect(dataLine).toContain('"A, B"');
  });

  it("produces only a header when there is nothing to export", () => {
    // An empty period is a valid answer, not an error.
    expect(toTallyCsv([]).trimEnd().split("\r\n")).toHaveLength(1);
  });
});
