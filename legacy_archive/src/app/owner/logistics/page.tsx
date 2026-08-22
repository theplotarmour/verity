import { getOwnerUser } from "@/lib/server/owner";
import { redirect } from "next/navigation";
import { getDispatches } from "@/server/actions/dispatch";
import LogisticsClient from "./LogisticsClient";

import { guardModulePage } from "@/platform/modules/guard";

export default async function LogisticsPage() {
  const dbUser = await getOwnerUser();
  if (!dbUser) redirect("/");
  await guardModulePage("sales");

  const dispatches = await getDispatches();

  return <LogisticsClient dispatches={dispatches} />;
}
