/**
 * One-time backfill: groups Colonel Kebabz's existing DiningOrder rows by
 * customerPhone and creates one Customer per distinct phone, so spend/visit
 * history is accurate from day one instead of starting at zero for guests
 * who already visited before the CRM capability shipped.
 *
 * Idempotent by upsert on (tenantId, phone) — safe to re-run.
 *
 * Run: npx tsx prisma/backfill-crm-customers.ts
 */

import { PrismaClient } from "@prisma/client";
import { withTenant } from "../src/server/platform/tenancy";

async function main() {
  const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
  const tenant = await admin.tenant.findFirst({ where: { name: "Colonel Kebabz" } });
  if (!tenant) throw new Error("Colonel Kebabz tenant not found — run seed-colonel-kebabz.ts first");
  await admin.$disconnect();

  await withTenant(tenant.id, async (tx) => {
    const orders = await tx.diningOrder.findMany({
      where: { customerPhone: { not: null } },
      select: { customerPhone: true, customerName: true, locationId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const byPhone = new Map<string, { name: string | null; locationId: string }>();
    for (const order of orders) {
      const phone = order.customerPhone!;
      // First order wins for preferredLocationId — matches
      // upsertCustomerForOrder's own "never overwrite once set" rule.
      if (!byPhone.has(phone)) {
        byPhone.set(phone, { name: order.customerName, locationId: order.locationId });
      } else if (order.customerName) {
        byPhone.get(phone)!.name = order.customerName;
      }
    }

    for (const [phone, data] of byPhone) {
      await tx.customer.upsert({
        where: { tenantId_phone: { tenantId: tenant.id, phone } },
        create: { tenantId: tenant.id, phone, name: data.name, preferredLocationId: data.locationId },
        update: {},
      });
    }

    console.log(`Backfilled ${byPhone.size} customer(s) from ${orders.length} phone-bearing order(s).`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
