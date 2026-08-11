import { notFound, redirect } from "next/navigation";

import { getOwnerUser } from "@/lib/server/owner";
import { guardModulePage } from "@/platform/modules/guard";
import { getProjectDetail, getProjectsData } from "@/server/actions/projects";
import { Workspace } from "@/components/layout/Workspace";
import { QueuePane } from "@/components/service/QueuePane";
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
  const [data, queue] = await Promise.all([getProjectDetail(id), getProjectsData()]);
  if (!data) notFound();

  return (
    <Workspace
      selectedId={id}
      backHref="/owner/projects"
      list={
        <QueuePane
          label="Projects"
          activeId={id}
          items={queue.projects.map((project) => ({
            id: project.id,
            href: `/owner/projects/${project.id}`,
            code: project.projectNumber,
            title: project.name,
            meta: project.customerName ?? project.siteName ?? null,
            status: project.status.replace(/_/g, " ").toLowerCase(),
          }))}
        />
      }
      detail={
        <div className="p-4">
          <ProjectDetailClient
            project={data.project}
            tasks={data.tasks}
            timesheets={data.timesheets}
            members={data.members}
          />
        </div>
      }
    />
  );
}
