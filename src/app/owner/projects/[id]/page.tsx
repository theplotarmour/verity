import { notFound, redirect } from "next/navigation";

import { getOwnerUser } from "@/lib/server/owner";
import { guardModulePage } from "@/platform/modules/guard";
import { getProjectDetail } from "@/server/actions/projects";
import { ProjectDetailClient } from "./ProjectDetailClient";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await guardModulePage("projects");
  const user = await getOwnerUser();
  if (!user) redirect("/");

  const { id } = await params;
  const data = await getProjectDetail(id);
  if (!data) notFound();

  return (
    <ProjectDetailClient
      project={data.project}
      tasks={data.tasks}
      timesheets={data.timesheets}
      members={data.members}
    />
  );
}
