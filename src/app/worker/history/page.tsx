import { redirect } from "next/navigation";
import { getUserSession } from "@/lib/server/auth";
import { getWorkHistory } from "@/server/actions/history";
import { HistoryClient } from "./HistoryClient";

export const dynamic = "force-dynamic";

export default async function WorkerHistoryPage() {
  const session = await getUserSession();
  if (!session) redirect("/");
  if (!["WORKER", "SUPERVISOR", "OWNER", "CO_OWNER", "MANAGER"].includes(session.role)) redirect("/");

  const { jobs, scope } = await getWorkHistory();
  return <HistoryClient jobs={JSON.parse(JSON.stringify(jobs))} scope={scope} basePath="/worker" />;
}
