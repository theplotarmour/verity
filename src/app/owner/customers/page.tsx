import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { canUser } from "@/lib/server/permissions";
import { CustomersClient } from "./CustomersClient";

export default async function CustomersPage() {
  const dbUser = await getOwnerUser();
  // Booking an order is what a customer is for, so that is the right gate.
  if (!(await canUser(dbUser, "CREATE_ORDER"))) redirect("/unauthorized");

  const rows = await prisma.customer.findMany({
    where: { factoryId: dbUser.factoryId },
    select: {
      id: true,
      customerCode: true,
      name: true,
      companyName: true,
      phone: true,
      altPhone: true,
      email: true,
      gstNumber: true,
      billingAddress: true,
      shippingAddress: true,
      notes: true,
      tags: true,
      paymentTerms: true,
      // Which customers are actually active, and how much they have ordered —
      // a contact list without this cannot tell you who matters.
      salesOrders: { select: { status: true } },
    },
    orderBy: { name: "asc" },
  });

  const DONE = ["DELIVERED", "DISPATCHED", "CANCELLED"];
  const customers = rows.map(({ salesOrders, ...c }) => ({
    ...c,
    totalOrders: salesOrders.length,
    activeOrders: salesOrders.filter((o) => !DONE.includes(o.status)).length,
  }));

  return <CustomersClient customers={customers} />;
}
