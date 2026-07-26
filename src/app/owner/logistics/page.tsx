import { getOwnerUser } from "@/lib/server/owner";
import { redirect } from "next/navigation";
import { getDispatches } from "@/server/actions/dispatch";
import LogisticsClient from "./LogisticsClient";

export default async function LogisticsPage() {
  const dbUser = await getOwnerUser();
  if (!dbUser) redirect("/");

  const dispatches = await getDispatches();

  return <LogisticsClient dispatches={dispatches} />;
}
