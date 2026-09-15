import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => undefined }) }));

import { netAcrossBusinesses, type Balance } from "./LedgerView";

const row = (over: Partial<Balance> & Pick<Balance, "partyId" | "side">): Balance => ({
  partyName: over.partyId,
  outstandingPaise: 0,
  uninvoicedPaise: 0,
  onAccountPaise: 0,
  counterAdvancePaise: 0,
  oldestOpenAt: null,
  sameBusinessAs: null,
  ...over,
});

describe("netAcrossBusinesses (2026-09-15: one netted figure per business)", () => {
  it("nets a linked customer+supplier: we owe 10, they owe 5 → we send 5", () => {
    const lines = netAcrossBusinesses([
      row({ partyId: "c1", side: "customer", outstandingPaise: 500, sameBusinessAs: "s1" }),
      row({ partyId: "s1", side: "supplier", outstandingPaise: 1000, sameBusinessAs: "c1" }),
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.netPaise).toBe(-500);
    // Carried by the side the money travels to, so "record payment" lands
    // on the ledger that will clear.
    expect(lines[0]!.side).toBe("supplier");
    expect(lines[0]!.nettedFrom).toEqual({ theyOweUsPaise: 500, weOweThemPaise: 1000 });
  });

  it("flips to the customer side when they owe more", () => {
    const [line] = netAcrossBusinesses([
      row({ partyId: "c1", side: "customer", outstandingPaise: 1000, sameBusinessAs: "s1" }),
      row({ partyId: "s1", side: "supplier", outstandingPaise: 400, sameBusinessAs: "c1" }),
    ]);
    expect(line!.netPaise).toBe(600);
    expect(line!.side).toBe("customer");
  });

  it("leaves unlinked parties alone and keeps a customer advance as money we owe", () => {
    const lines = netAcrossBusinesses([
      row({ partyId: "c2", side: "customer", outstandingPaise: 300 }),
      row({ partyId: "c3", side: "customer", onAccountPaise: 200 }),
      row({ partyId: "s2", side: "supplier", uninvoicedPaise: 700 }),
    ]);
    expect(lines.map((l) => [l.partyId, l.netPaise])).toEqual([["c2", 300], ["c3", -200], ["s2", -700]]);
    expect(lines.every((l) => l.nettedFrom === undefined)).toBe(true);
  });
});
