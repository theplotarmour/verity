import { describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PURCHASE_STATE, SALES_STATE, present } from "@/components/ui/business/states";

/**
 * Audit finding U0-2.
 *
 * A sales order with state `Processing` — a value the UI's map did not contain —
 * was filtered off every screen by `openOrders`, while the customer's credit
 * exposure still counted its ₹82,500. The order could not be opened, reserved,
 * invoiced or cancelled, and nothing indicated it existed.
 *
 * Two guards, because the bug had two halves: the data drifted, and the code
 * failed toward hiding.
 */
describe("order state vocabulary (U0-2)", () => {
  it("names every state actually present in the database", async () => {
    // Not a style rule. A state the UI cannot name is a state a user cannot
    // act on, and this is the check that turns that into a failing suite
    // rather than a customer's missing order.
    // A privileged connection, deliberately. The runtime role sees only rows
    // inside a tenant scope, so an unscoped read through it returns nothing and
    // the check would pass by seeing no data at all — which is exactly the kind
    // of vacuous green this finding is about.
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    let sales: { state: string }[];
    let purchases: { state: string }[];
    try {
      [sales, purchases] = await Promise.all([
        admin.$queryRaw<{ state: string }[]>`SELECT DISTINCT state FROM trading_sales_order`,
        admin.$queryRaw<{ state: string }[]>`SELECT DISTINCT state FROM trading_purchase_order`,
      ]);
    } finally {
      await admin.$disconnect();
    }

    const unnamed = [
      ...sales.filter((row) => !(row.state in SALES_STATE)).map((row) => `sales: ${row.state}`),
      ...purchases
        .filter((row) => !(row.state in PURCHASE_STATE))
        .map((row) => `purchase: ${row.state}`),
    ];

    expect(unnamed).toEqual([]);
  });

  it("renders an unmapped state rather than dropping it", () => {
    // The safety net for when the guard above is added to faster than the map
    // is. Verbatim beats a blank, and beats the word "Unknown".
    const shown = present(SALES_STATE, "some_future_state");
    expect(shown.label).toBe("some_future_state");
  });
});
