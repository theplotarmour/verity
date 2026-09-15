import { describe, expect, it } from "vitest";
import type { QueryContext } from "@/server/platform/query";
import { previewCustomerImport, previewSupplierImport } from "./import";

// These handlers do no I/O — they only validate rows against a zod schema —
// so calling them directly with a stub context is a faithful unit test, the
// same shape `grounding.test.ts` uses for pure functions elsewhere in this
// capability tree.
const stubCtx = {} as QueryContext;

describe("previewCustomerImport", () => {
  it("accepts a row matching the header contract, case-insensitively", async () => {
    const result = await previewCustomerImport.handler(stubCtx, {
      rows: [{ DisplayName: "Ganesh Traders", GSTIN: "07AAACG2115R1Z1", StateCode: "07" }],
    });
    expect(result.invalid).toEqual([]);
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0]!.data).toMatchObject({ displayName: "Ganesh Traders", stateCode: "07" });
  });

  it("treats a blank cell as absent, not an empty string", async () => {
    const result = await previewCustomerImport.handler(stubCtx, {
      rows: [{ displayName: "Ganesh Traders", gstin: "" }],
    });
    expect(result.invalid).toEqual([]);
    expect(result.valid[0]!.data).not.toHaveProperty("gstin");
  });

  it("coerces creditLimitPaise from CSV text to a number", async () => {
    const result = await previewCustomerImport.handler(stubCtx, {
      rows: [{ displayName: "Ganesh Traders", creditLimitPaise: "500000" }],
    });
    expect(result.valid[0]!.data).toMatchObject({ creditLimitPaise: 500000 });
  });

  it("reports an invalid row with its row number and reason, without throwing", async () => {
    const result = await previewCustomerImport.handler(stubCtx, {
      rows: [{ displayName: "" }],
    });
    expect(result.valid).toEqual([]);
    expect(result.invalid).toEqual([
      { row: 1, raw: { displayName: "" }, errors: expect.arrayContaining([expect.stringContaining("displayName")]) },
    ]);
  });

  it("numbers rows by position and keeps checking after a bad row (partial-failure shape)", async () => {
    const result = await previewCustomerImport.handler(stubCtx, {
      rows: [{ displayName: "" }, { displayName: "Good Traders" }],
    });
    expect(result.invalid).toHaveLength(1);
    expect(result.invalid[0]!.row).toBe(1);
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0]!.row).toBe(2);
  });
});

describe("previewSupplierImport", () => {
  it("rejects a malformed GSTIN with a named reason", async () => {
    const result = await previewSupplierImport.handler(stubCtx, {
      rows: [{ displayName: "Century Ply", gstin: "not-a-gstin" }],
    });
    expect(result.valid).toEqual([]);
    expect(result.invalid[0]!.errors[0]).toMatch(/gstin/i);
  });
});
