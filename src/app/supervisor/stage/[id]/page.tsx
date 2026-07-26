import { getStageJob } from "@/server/actions/stages";
import { getUserSession } from "@/lib/server/auth";
import { redirect } from "next/navigation";
import StageClient from "@/app/worker/stage/[id]/client";

export const dynamic = "force-dynamic";

export default async function SupervisorStagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getUserSession();
  if (!session) redirect("/");
  if (session.role !== "SUPERVISOR") redirect("/");

  const data = await getStageJob(id);
  if (!data) redirect("/supervisor");
  if (!data.stage || data.stage.isQcStage) redirect("/inspector");

  return <StageClient data={{ ...data, homePath: "/supervisor" }} />;
}
