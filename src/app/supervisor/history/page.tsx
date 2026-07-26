import { redirect } from "next/navigation";
import { getUserSession } from "@/lib/server/auth";
import { getWorkHistory } from "@/server/actions/history";
import { HistoryClient } from "@/app/worker/history/HistoryClient";

export const dynamic = "force-dynamic";

export default async function SupervisorHistoryPage() {
  const session = await getUserSession();
  if (!session) redirect("/");
  if (session.role !== "SUPERVISOR") redirect("/");

  const { jobs, scope } = await getWorkHistory();
  return <HistoryClient jobs={JSON.parse(JSON.stringify(jobs))} scope={scope} basePath="/supervisor" />;
}
