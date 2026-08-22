import { redirect } from "next/navigation";

import { getOwnerUser } from "@/lib/server/owner";
import { guardModulePage } from "@/platform/modules/guard";
import { getProjectsData } from "@/server/actions/projects";
import { ProjectsClient } from "./ProjectsClient";

export default async function ProjectsPage() {
  await guardModulePage("projects");
  const user = await getOwnerUser();
  if (!user) redirect("/");

  const { projects, customers, managers, sites } = await getProjectsData();

  return (
    <ProjectsClient projects={projects} customers={customers} managers={managers} sites={sites} />
  );
}
