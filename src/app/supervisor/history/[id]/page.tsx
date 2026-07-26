import { notFound, redirect } from "next/navigation";
import { getUserSession } from "@/lib/server/auth";
import { getHistoryDetail } from "@/server/actions/history";
import { HistoryDetailClient } from "@/app/worker/history/[id]/HistoryDetailClient";

export const dynamic = "force-dynamic";

export default async function SupervisorHistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getUserSession();
  if (!session) redirect("/");
  if (session.role !== "SUPERVISOR") redirect("/");

  const job = await getHistoryDetail(id);
  if (!job) notFound();
  return <HistoryDetailClient job={JSON.parse(JSON.stringify(job))} basePath="/supervisor" />;
}
