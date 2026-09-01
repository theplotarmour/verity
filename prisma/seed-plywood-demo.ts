/**
 * Rebuilds the plywood tenant's demo data.
 *
 * Requested: "completely wipe out all the mock data in the plywood thing and
 * then add structured mock data in it... make sure that you add a lot of data."
 *
 * TWO RULES THIS SCRIPT FOLLOWS.
 *
 * 1. It writes through COMMANDS, never through raw inserts. The data that was
 *    here before was seeded directly, and that is how a sales order ended up
 *    holding the string 'Processing' — a display label rather than a state key —
 *    which made the order permanently unactionable. Going through the commands
 *    means every state, ledger entry, stock movement, invoice and tax split is
 *    produced by the same code the application uses, so the demo cannot be
 *    consistent in a way the product is not.
 *
 * 2. It deletes only the plywood capability's own rows, for one tenant, and
 *    never touches identity, roles, locations or the tenant itself. Wiping data
 *    is destructive; wiping more than was asked for is worse.
 *
 * Run: npx tsx prisma/seed-plywood-demo.ts
 */

import { PrismaClient } from "@prisma/client";
import { installCapabilities } from "../src/server/capabilities/registry";
import { executeCommand, type ActorContext } from "../src/server/platform/command";
import {
  approveCredit,
  createBrand,
  createCustomer,
  createProduct,
  createPurchaseOrder,
  createSalesOrder,
  createSupplier,
  dispatchOrder,
  linkSupplierToCustomer,
  receiveGoods,
  registerGstRegistration,
  setBusinessProfile,
  setTaxRule,
  recordPartyPayment,
  reserveForOrder,
  setPriceSheet,
  submitPurchaseOrder,
} from "../src/server/capabilities/plywood";

const TENANT_ID = "96793a76-ddbf-458f-8610-7606c56ad575";

const OWNER: ActorContext = {
  tenantId: TENANT_ID,
  userId: "7b3e012d-b8ca-4792-913c-883e5d8ee4f1",
  membershipId: "d5403179-d2d7-4d90-af59-06016c52538e",
  organizationId: "036e03cd-126b-4972-a14d-9a275f20680c",
  roleId: "9108d7b2-4b64-4e41-82a6-53cd8190a19b",
};

/** Krishna Nagar Sawmill & Shop, and the Okhla depot. */
const SHOP = "be5f3794-2cf9-4a76-a3c5-38061fb42088";
const DEPOT = "ed6229cc-86b2-4f83-928c-39e220f73f28";

const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });

/**
 * Child before parent, all the way down.
 *
 * Written out rather than left to cascades because most of these relations are
 * ON DELETE RESTRICT on purpose — a ledger entry is not something a stray
 * delete should be able to take with it — so the order here is the point.
 */
const WIPE_ORDER = [
  "plywood_payment_allocation",
  "plywood_purchase_bill_confirmation",
  "plywood_gst_portal_record",
  "plywood_ledger_entry",
  "plywood_payment",
  "plywood_invoice_note",
  "plywood_invoice_line",
  "plywood_invoice",
  "plywood_goods_issue_line",
  "plywood_goods_issue",
  "plywood_goods_receipt_line",
  "plywood_goods_receipt",
  "plywood_stock_reservation",
  "plywood_sales_order_line",
  "plywood_sales_order",
  "plywood_purchase_order_line",
  "plywood_purchase_order",
  "stock_ledger_entry",
  "stock_balance",
  "plywood_customer_price",
  "plywood_supplier_price",
  "plywood_customer",
  "plywood_supplier",
  "plywood_product",
  "plywood_brand",
];

async function wipe(): Promise<void> {
  // The invoice numbering counters go too. Leaving them would restart the demo
  // at SALES/2026-27/0042 with no invoice 1 to 41, and a gap in a tax invoice
  // series is the one thing the numbering code exists to prevent.
  for (const table of [...WIPE_ORDER, "plywood_invoice_series"]) {
    const deleted = await admin.$executeRawUnsafe(
      `DELETE FROM "${table}" WHERE tenant_id = $1::uuid`,
      TENANT_ID,
    );
    if (deleted > 0) console.log(`  cleared ${deleted} from ${table}`);
  }
  // Suppliers can no longer be linked to customers that no longer exist.
  await admin.$executeRawUnsafe(
    `UPDATE "plywood_accounting_period" SET state = 'open', closed_at = NULL, closed_by = NULL
      WHERE tenant_id = $1::uuid AND state = 'closed'`,
    TENANT_ID,
  );
}

type Board = {
  key: string;
  brand: string;
  name: string;
  hsn: string;
  thickness: number;
  grade: string;
  /** What the mill charges us, and what we charge a trade customer. */
  cost: number;
  price: number;
};

const BRANDS = ["Century", "Greenply", "Sainik", "Austin", "Duro"];

/**
 * A real yard's range: the same grades in the thicknesses that actually sell.
 * Prices are per sheet in rupees and are internally consistent — MR under BWR
 * under BWP, thicker dearer, and a working margin on every line.
 */
const BOARDS: Board[] = [
  { key: "cen-mr-6", brand: "Century", name: "MR Commercial Ply", hsn: "44121000", thickness: 60, grade: "MR", cost: 620, price: 780 },
  { key: "cen-mr-12", brand: "Century", name: "MR Commercial Ply", hsn: "44121000", thickness: 120, grade: "MR", cost: 1020, price: 1290 },
  { key: "cen-mr-19", brand: "Century", name: "MR Commercial Ply", hsn: "44121000", thickness: 190, grade: "MR", cost: 1480, price: 1850 },
  { key: "cen-bwr-12", brand: "Century", name: "BWR Marine Ply", hsn: "44121000", thickness: 120, grade: "BWR", cost: 1340, price: 1690 },
  { key: "cen-bwr-19", brand: "Century", name: "BWR Marine Ply", hsn: "44121000", thickness: 190, grade: "BWR", cost: 1920, price: 2420 },
  { key: "grn-mr-6", brand: "Greenply", name: "MR Commercial Ply", hsn: "44121000", thickness: 60, grade: "MR", cost: 590, price: 745 },
  { key: "grn-mr-12", brand: "Greenply", name: "MR Commercial Ply", hsn: "44121000", thickness: 120, grade: "MR", cost: 980, price: 1240 },
  { key: "grn-mr-19", brand: "Greenply", name: "MR Commercial Ply", hsn: "44121000", thickness: 190, grade: "MR", cost: 1420, price: 1790 },
  { key: "grn-bwp-19", brand: "Greenply", name: "BWP Gurjan Ply", hsn: "44121000", thickness: 190, grade: "BWP", cost: 2280, price: 2860 },
  { key: "grn-bwp-25", brand: "Greenply", name: "BWP Gurjan Ply", hsn: "44121000", thickness: 250, grade: "BWP", cost: 2940, price: 3680 },
  { key: "sai-mr-9", brand: "Sainik", name: "MR Ply 710", hsn: "44121000", thickness: 90, grade: "MR", cost: 760, price: 960 },
  { key: "sai-mr-12", brand: "Sainik", name: "MR Ply 710", hsn: "44121000", thickness: 120, grade: "MR", cost: 940, price: 1180 },
  { key: "sai-bwr-19", brand: "Sainik", name: "BWR Ply 710", hsn: "44121000", thickness: 190, grade: "BWR", cost: 1760, price: 2210 },
  { key: "aus-blk-19", brand: "Austin", name: "Block Board", hsn: "44123900", thickness: 190, grade: "MR", cost: 1580, price: 1980 },
  { key: "aus-blk-25", brand: "Austin", name: "Block Board", hsn: "44123900", thickness: 250, grade: "MR", cost: 1940, price: 2440 },
  { key: "aus-flush-30", brand: "Austin", name: "Flush Door", hsn: "44182000", thickness: 300, grade: "BWR", cost: 2650, price: 3320 },
  { key: "dur-mdf-9", brand: "Duro", name: "Plain MDF", hsn: "44111200", thickness: 90, grade: "MR", cost: 520, price: 665 },
  { key: "dur-mdf-18", brand: "Duro", name: "Plain MDF", hsn: "44111200", thickness: 180, grade: "MR", cost: 880, price: 1120 },
  { key: "dur-lam-1", brand: "Duro", name: "Laminate Sheet 1mm", hsn: "48239019", thickness: 10, grade: "MR", cost: 890, price: 1180 },
  { key: "dur-ven-4", brand: "Duro", name: "Teak Veneer 4mm", hsn: "44083190", thickness: 40, grade: "MR", cost: 1650, price: 2150 },
];

const SUPPLIERS = [
  { key: "sharma", name: "Sharma Timber Mills", gstin: "07AABCS1429B1ZQ", state: "07", phone: "9811023456" },
  { key: "kandla", name: "Kandla Ply Industries", gstin: "24AACCK8821M1ZP", state: "24", phone: "9825011234" },
  { key: "yamuna", name: "Yamuna Board Depot", gstin: "07AAGCY5567L1ZR", state: "07", phone: "9868122334" },
  { key: "coastal", name: "Coastal Veneers Pvt Ltd", gstin: "32AAECC1188K1ZT", state: "32", phone: "9846099887" },
  { key: "northern", name: "Northern Laminates", gstin: "06AADCN7712F1ZM", state: "06", phone: "9812233445" },
];

const CUSTOMERS = [
  { key: "verma", name: "Verma Furniture Works", gstin: "07AACCV3321H1ZB", state: "07", phone: "9810044556", limit: 500_000 },
  { key: "modular", name: "Modular Interiors Delhi", gstin: "07AAFCM9087J1ZE", state: "07", phone: "9871200345", limit: 800_000 },
  { key: "royal", name: "Royal Kitchens", gstin: "07AAGCR4412N1ZK", state: "07", phone: "9899011223", limit: 300_000 },
  { key: "noida", name: "Noida Contract Fitouts", gstin: "09AAJCN2231P1ZW", state: "09", phone: "9911223344", limit: 1_200_000 },
  { key: "gurgaon", name: "Gurgaon Office Interiors", gstin: "06AAKCG7765R1ZY", state: "06", phone: "9988776655", limit: 900_000 },
  { key: "singh", name: "Singh Carpentry", gstin: null, state: "07", phone: "9818765432", limit: 100_000 },
  { key: "walkin", name: "Counter Sales (cash)", gstin: null, state: "07", phone: null, limit: 0 },
  // The same firm as the Yamuna supplier — a dealer this business both buys
  // from and sells to, which is the case the same-business link exists for.
  { key: "yamuna-c", name: "Yamuna Board Depot", gstin: "07AAGCY5567L1ZR", state: "07", phone: "9868122334", limit: 400_000 },
];

const rupees = (n: number) => Math.round(n * 100);

/** Deterministic pseudo-randomness, so a reseed produces the same yard. */
let seed = 20260901;
function rand(max: number): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed % max;
}
function pick<T>(items: T[]): T {
  return items[rand(items.length)]!;
}

async function main(): Promise<void> {
  installCapabilities();

  console.log("Wiping the plywood tenant's data…");
  await wipe();

  // THE BUSINESS'S OWN TAX IDENTITY, FIRST.
  //
  // The tenant had none, and that single gap silently emptied half the app:
  // every automatic invoice and supplier bill was refused with "this business
  // has no GST registration, so tax cannot be decided", so 18 completed
  // purchases and 22 deliveries produced ZERO documents — no payables, no
  // receivables, and nothing on Who owes what. The refusals were returned
  // rather than thrown, by design, so nothing crashed and nothing appeared.
  //
  // A plywood merchant in Delhi is registered. Seeding that first is not
  // decoration; without it the rest of this data is meaningless.
  console.log("Business identity, registration and rates…");
  await executeCommand(OWNER, setBusinessProfile, {
    legalName: "Shri Ganesh Timber Trading Co.",
    tradeName: "Shri Ganesh Timber",
  });
  await executeCommand(OWNER, registerGstRegistration, {
    // 07 is Delhi, and the state code is read from the GSTIN rather than
    // stored beside it.
    gstin: "07AAGCS4471P1ZV",
    registrationType: "regular",
    invoiceSeriesPrefix: "SGT",
  });
  // Plywood and board products sit at 18%; laminate and MDF likewise. One rule per
  // HSN in the catalogue, so no invoice ever falls back to a configuration key.
  for (const hsn of [...new Set(BOARDS.map((board) => board.hsn))]) {
    await executeCommand(OWNER, setTaxRule, {
      hsnCode: hsn,
      rateBp: 1800,
      authority: "Notification 1/2017 Central Tax (Rate), Schedule III",
    });
  }

  console.log("Brands and boards…");
  const brandIds = new Map<string, string>();
  for (const name of BRANDS) {
    const brand = await executeCommand(OWNER, createBrand, { name });
    brandIds.set(name, brand.id);
  }

  const productIds = new Map<string, string>();
  for (const board of BOARDS) {
    const product = await executeCommand(OWNER, createProduct, {
      brandId: brandIds.get(board.brand)!,
      name: board.name,
      hsnCode: board.hsn,
      thicknessTenthMm: board.thickness,
      widthMm: 2440,
      heightMm: 1220,
      grade: board.grade,
    });
    productIds.set(board.key, product.id);
  }

  console.log("Suppliers and customers…");
  const supplierIds = new Map<string, string>();
  for (const supplier of SUPPLIERS) {
    const created = await executeCommand(OWNER, createSupplier, {
      displayName: supplier.name,
      ...(supplier.gstin ? { gstin: supplier.gstin } : {}),
      stateCode: supplier.state,
      ...(supplier.phone ? { phone: supplier.phone } : {}),
    });
    supplierIds.set(supplier.key, created.id);
  }

  const customerIds = new Map<string, string>();
  for (const customer of CUSTOMERS) {
    const created = await executeCommand(OWNER, createCustomer, {
      displayName: customer.name,
      ...(customer.gstin ? { gstin: customer.gstin } : {}),
      stateCode: customer.state,
      ...(customer.phone ? { phone: customer.phone } : {}),
      creditLimitPaise: rupees(customer.limit),
    });
    customerIds.set(customer.key, created.id);
  }

  // One firm on both sides of the trade.
  await executeCommand(OWNER, linkSupplierToCustomer, {
    supplierId: supplierIds.get("yamuna")!,
    customerId: customerIds.get("yamuna-c")!,
  });

  console.log("Agreed price lists…");
  // Every supplier prices the boards they plausibly carry, at a small spread
  // around the base cost, so the purchase form has something to prefill and the
  // price sheet has something to show.
  for (const [index, supplier] of SUPPLIERS.entries()) {
    const carried = BOARDS.filter((_, at) => (at + index) % 2 === 0);
    await executeCommand(OWNER, setPriceSheet, {
      side: "supplier",
      partyId: supplierIds.get(supplier.key)!,
      prices: carried.map((board) => ({
        productId: productIds.get(board.key)!,
        pricePaise: rupees(board.cost + (index - 2) * 15),
      })),
    });
  }
  for (const [index, customer] of CUSTOMERS.entries()) {
    if (customer.key === "walkin") continue; // counter sales pay list price
    const bought = BOARDS.filter((_, at) => (at + index) % 3 !== 2);
    await executeCommand(OWNER, setPriceSheet, {
      side: "customer",
      partyId: customerIds.get(customer.key)!,
      prices: bought.map((board) => ({
        productId: productIds.get(board.key)!,
        // A bigger customer gets a keener price. Deterministic, not random.
        pricePaise: rupees(board.price - Math.min(index * 12, 60)),
      })),
    });
  }

  console.log("Purchase orders, deliveries and supplier bills…");
  const purchaseSummary = { completed: 0, partial: 0, open: 0, draft: 0 };
  for (let i = 0; i < 26; i++) {
    const supplier = SUPPLIERS[i % SUPPLIERS.length]!;
    const godown = i % 3 === 0 ? DEPOT : SHOP;
    const lineCount = 1 + rand(3);
    const chosen: Board[] = [];
    while (chosen.length < lineCount) {
      const board = pick(BOARDS);
      if (!chosen.includes(board)) chosen.push(board);
    }

    const order = await executeCommand(OWNER, createPurchaseOrder, {
      supplierId: supplierIds.get(supplier.key)!,
      locationId: godown,
      lines: chosen.map((board) => ({
        productId: productIds.get(board.key)!,
        qtyOrdered: 20 + rand(9) * 10,
        unitCostPaise: rupees(board.cost),
        // A real order carries the discount that was actually negotiated.
        ...(rand(4) === 0 ? { discountBps: 250 + rand(8) * 100 } : {}),
      })),
    });

    // Four fifths of the book is delivered and billed, some is part-delivered,
    // and a few are still with the supplier or unsent — which is what an open
    // purchase desk looks like on any given day.
    const fate = i % 10;
    if (fate === 9) {
      purchaseSummary.draft += 1;
      continue;
    }
    await executeCommand(OWNER, submitPurchaseOrder, { orderId: order.id });
    if (fate === 8) {
      purchaseSummary.open += 1;
      continue;
    }

    const lines = await admin.plywoodPurchaseOrderLine.findMany({
      where: { purchaseOrderId: order.id },
    });
    if (fate === 6 || fate === 7) {
      await executeCommand(OWNER, receiveGoods, {
        orderId: order.id,
        supplierChallanNumber: `CH-${4000 + i}`,
        lines: lines.map((line) => ({
          productId: line.productId,
          qtyReceived: Math.max(1, Math.floor(line.qtyOrdered / 2)),
        })),
      });
      purchaseSummary.partial += 1;
      continue;
    }

    await executeCommand(OWNER, receiveGoods, {
      orderId: order.id,
      supplierChallanNumber: `CH-${4000 + i}`,
      lines: lines.map((line) => ({
        productId: line.productId,
        qtyReceived: line.qtyOrdered,
      })),
    });
    purchaseSummary.completed += 1;
  }

  console.log("Sales orders, deliveries and invoices…");
  const salesSummary = { invoiced: 0, held: 0, approved: 0, credit: 0 };
  const sellable = CUSTOMERS.filter((c) => c.key !== "yamuna-c");
  for (let i = 0; i < 30; i++) {
    const customer = sellable[i % sellable.length]!;
    const godown = i % 4 === 0 ? DEPOT : SHOP;

    // Only sell what that godown actually holds, so a reservation can succeed.
    const onHand = await admin.stockBalance.findMany({
      where: { tenantId: TENANT_ID, locationId: godown, qtyUnits: { gt: 4 } },
    });
    if (onHand.length === 0) continue;

    const lineCount = Math.min(1 + rand(3), onHand.length);
    const chosen: typeof onHand = [];
    while (chosen.length < lineCount) {
      const row = pick(onHand);
      if (!chosen.includes(row)) chosen.push(row);
    }

    const board = (productId: string) =>
      BOARDS.find((b) => productIds.get(b.key) === productId)!;

    const order = await executeCommand(OWNER, createSalesOrder, {
      customerId: customerIds.get(customer.key)!,
      locationId: godown,
      lines: chosen.map((row) => ({
        productId: row.productId,
        qtyOrdered: Math.max(1, Math.min(row.qtyUnits - 2, 2 + rand(8))),
        unitPricePaise: rupees(board(row.productId).price),
        ...(rand(5) === 0 ? { discountBps: 200 + rand(6) * 100 } : {}),
      })),
    });

    let state = order.state;
    if (state === "pending_credit") {
      // Half the held orders get approved, so the desk shows both.
      if (i % 2 === 0) {
        await executeCommand(OWNER, approveCredit, {
          orderId: order.id,
          reason: "Owner approved — long-standing customer",
        });
        state = "approved";
      } else {
        salesSummary.credit += 1;
        continue;
      }
    }

    const fate = i % 8;
    if (fate === 7) {
      salesSummary.approved += 1;
      continue;
    }

    await executeCommand(OWNER, reserveForOrder, { orderId: order.id });
    if (fate === 6) {
      salesSummary.held += 1;
      continue;
    }

    await executeCommand(OWNER, dispatchOrder, {
      orderId: order.id,
      collectedBy: pick(["Ramesh (driver)", "Customer's tempo", "Site pickup"]),
    });
    salesSummary.invoiced += 1;
  }

  console.log("Payments in and out…");
  // Customers pay: most in full, some part, one ahead of any invoice.
  let received = 0;
  for (const customer of sellable) {
    const owed = await admin.$queryRawUnsafe<{ due: bigint | null }[]>(
      `SELECT COALESCE(SUM(i.total_paise), 0)
         - COALESCE((SELECT SUM(a.amount_paise) FROM plywood_payment_allocation a
                      JOIN plywood_invoice pi ON pi.id = a.invoice_id
                     WHERE pi.customer_id = i2.id), 0) AS due
         FROM plywood_invoice i
         JOIN plywood_customer i2 ON i2.id = i.customer_id
        WHERE i.customer_id = $1::uuid
        GROUP BY i2.id`,
      customerIds.get(customer.key)!,
    );
    const due = Number(owed[0]?.due ?? 0);
    if (due <= 0) continue;
    const share = customer.key === "royal" ? 0.4 : customer.key === "singh" ? 0.65 : 1;
    await executeCommand(OWNER, recordPartyPayment, {
      party: { customerId: customerIds.get(customer.key)! },
      direction: "in",
      amountPaise: Math.round(due * share),
      method: pick(["bank", "upi", "cheque", "cash"] as const),
      reference: `UTR${700000 + rand(99999)}`,
    });
    received += 1;
  }

  // One customer pays ahead of any invoice — the advance case, which is what
  // "not against any bill yet" is for.
  await executeCommand(OWNER, recordPartyPayment, {
    party: { customerId: customerIds.get("modular")! },
    direction: "in",
    amountPaise: rupees(150_000),
    method: "bank",
    reference: "ADVANCE-MI-01",
  });

  // And one we have paid money TO — the case that was invisible before today.
  await executeCommand(OWNER, recordPartyPayment, {
    party: { customerId: customerIds.get("verma")! },
    direction: "out",
    amountPaise: rupees(12_000),
    method: "upi",
    reference: "REFUND-VF-01",
  });

  // We pay our suppliers: most of the older bills, none of the newest.
  let paid = 0;
  for (const supplier of SUPPLIERS.slice(0, 4)) {
    const bills = await admin.plywoodInvoice.findMany({
      where: { supplierId: supplierIds.get(supplier.key)!, tenantId: TENANT_ID },
      orderBy: { issuedAt: "asc" },
    });
    if (bills.length === 0) continue;
    const settle = bills
      .slice(0, Math.max(1, Math.floor(bills.length * 0.6)))
      .reduce((sum, bill) => sum + bill.totalPaise, 0);
    if (settle <= 0) continue;
    await executeCommand(OWNER, recordPartyPayment, {
      party: { supplierId: supplierIds.get(supplier.key)! },
      direction: "out",
      amountPaise: settle,
      method: pick(["bank", "cheque", "upi"] as const),
      reference: `NEFT${500000 + rand(99999)}`,
    });
    paid += 1;
  }

  const counts = await admin.$queryRawUnsafe<Record<string, bigint>[]>(
    `SELECT
       (SELECT COUNT(*) FROM plywood_product WHERE tenant_id = $1::uuid) AS products,
       (SELECT COUNT(*) FROM plywood_supplier WHERE tenant_id = $1::uuid) AS suppliers,
       (SELECT COUNT(*) FROM plywood_customer WHERE tenant_id = $1::uuid) AS customers,
       (SELECT COUNT(*) FROM plywood_purchase_order WHERE tenant_id = $1::uuid) AS purchase_orders,
       (SELECT COUNT(*) FROM plywood_sales_order WHERE tenant_id = $1::uuid) AS sales_orders,
       (SELECT COUNT(*) FROM plywood_invoice WHERE tenant_id = $1::uuid) AS invoices,
       (SELECT COUNT(*) FROM plywood_payment WHERE tenant_id = $1::uuid) AS payments,
       (SELECT COUNT(*) FROM plywood_supplier_price WHERE tenant_id = $1::uuid) AS supplier_prices,
       (SELECT COUNT(*) FROM plywood_customer_price WHERE tenant_id = $1::uuid) AS customer_prices,
       (SELECT COUNT(*) FROM stock_balance WHERE tenant_id = $1::uuid) AS stock_rows`,
    TENANT_ID,
  );

  // A seed that produces no documents is a broken seed, and the last run
  // produced none while exiting 0. The whole point of these two lines is that
  // the next person finds out immediately instead of from the screen.
  const invoiceCount = Number(counts[0]!.invoices ?? 0);
  if (invoiceCount === 0) {
    throw new Error(
      "Seed produced no invoices. Deliveries and receipts raise them " +
        "automatically, so zero means every raise was refused — check the " +
        "business GST registration and the HSN tax rules.",
    );
  }

  console.log("\nSeeded:");
  for (const [key, value] of Object.entries(counts[0]!)) {
    console.log(`  ${key.padEnd(18)} ${value}`);
  }
  console.log("  purchases          ", JSON.stringify(purchaseSummary));
  console.log("  sales              ", JSON.stringify(salesSummary));
  console.log(`  payments in ${received}, out ${paid}, plus one advance and one refund`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await admin.$disconnect();
  });
