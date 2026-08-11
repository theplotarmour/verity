import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/server/auth";
import { toTallyCsv, tallyDate, type TallyRow } from "@/lib/exports/tally";

/**
 * GET /api/exports/tally?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Dispatches in a period, as a CSV Tally can import.
 *
 * A route rather than a server action because the deliverable is a *file*: an
 * action would have to return the whole thing as a string through the RSC
 * payload and have the client rebuild a Blob, which is slower and gives no
 * streaming, no filename and no browser download UI.
 *
 * Tenant comes from the session. There is no `factoryId` parameter, because a
 * download endpoint accepting one is a way to read another workspace's revenue.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getUserSession();
  if (!session) return Response.json({ error: "Sign in first." }, { status: 401 });

  // Owners and co-owners only: this is the whole book of what left and what it
  // was worth, which is not a supervisor's to export.
  if (!["OWNER", "CO_OWNER"].includes(session.role)) {
    return Response.json({ error: "Not permitted." }, { status: 403 });
  }

  const url = new URL(request.url);
  const parseDate = (raw: string | null, fallback: Date) => {
    if (!raw) return fallback;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? fallback : parsed;
  };

  // Default to the current month, which is the period anyone exporting for
  // Tally is almost always after.
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const from = parseDate(url.searchParams.get("from"), monthStart);
  const to = parseDate(url.searchParams.get("to"), now);
  // An end date is a day, not a moment — without this, everything dispatched on
  // the last day of the range is missing.
  to.setHours(23, 59, 59, 999);

  const dispatches = await prisma.dispatch.findMany({
    where: { factoryId: session.factoryId, dispatchedAt: { gte: from, lte: to } },
    select: {
      id: true,
      dispatchedAt: true,
      customerName: true,
      address: true,
      transporter: true,
      vehicleNo: true,
      salesOrder: {
        select: {
          soNumber: true,
          totalAmount: true,
          customer: { select: { name: true, gstNumber: true, billingAddress: true } },
          items: {
            select: {
              quantity: true,
              unitPrice: true,
              item: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { dispatchedAt: "asc" },
  });

  const rows: TallyRow[] = [];
  for (const dispatch of dispatches) {
    const order = dispatch.salesOrder;
    const customer = order?.customer;

    // One row per line, because that is what a Tally voucher is: a header and
    // its lines. Collapsing to one row per dispatch would lose the item
    // breakdown the accountant needs to post against the right ledger.
    const lines = order?.items ?? [];
    const narration = [dispatch.transporter, dispatch.vehicleNo].filter(Boolean).join(" / ");

    if (lines.length === 0) {
      rows.push({
        voucherDate: tallyDate(dispatch.dispatchedAt),
        voucherNumber: order?.soNumber ?? dispatch.id,
        partyName: customer?.name ?? dispatch.customerName ?? "Unknown",
        partyGstin: customer?.gstNumber ?? "",
        address: customer?.billingAddress ?? dispatch.address ?? "",
        itemName: "Dispatch",
        quantity: 1,
        rate: order?.totalAmount ?? 0,
        amount: order?.totalAmount ?? 0,
        narration,
      });
      continue;
    }

    for (const line of lines) {
      rows.push({
        voucherDate: tallyDate(dispatch.dispatchedAt),
        voucherNumber: order?.soNumber ?? dispatch.id,
        partyName: customer?.name ?? dispatch.customerName ?? "Unknown",
        partyGstin: customer?.gstNumber ?? "",
        address: customer?.billingAddress ?? dispatch.address ?? "",
        itemName: line.item?.name ?? "Item",
        quantity: line.quantity,
        rate: line.unitPrice,
        amount: Math.round(line.quantity * line.unitPrice * 100) / 100,
        narration,
      });
    }
  }

  const filename = `verity-dispatches-${tallyDate(from)}-to-${tallyDate(to)}.csv`.replace(/\//g, "-");

  // The UTF-8 BOM is load-bearing, not cargo cult: Excel on a regional Windows
  // install — which is what sits between here and Tally — reads a BOM-less file
  // in the system codepage and mangles every non-ASCII customer name. Tally's
  // importer skips it.
  return new Response(`﻿${toTallyCsv(rows)}`, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
