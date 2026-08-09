import { redirect } from "next/navigation";

import { getOwnerUser } from "@/lib/server/owner";
import { guardModulePage } from "@/platform/modules/guard";
import { getBillingData } from "@/server/actions/billing";
import { BillingClient } from "./BillingClient";

export default async function BillingPage() {
  await guardModulePage("billing");
  const user = await getOwnerUser();
  if (!user) redirect("/");

  const data = await getBillingData();

  return (
    <BillingClient
      invoices={data.invoices}
      payroll={data.payroll}
      customers={data.customers}
      sites={data.sites}
      stats={data.stats}
    />
  );
}
