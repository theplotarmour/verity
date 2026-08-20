import { notFound } from "next/navigation";

import { enforceRole } from "@/lib/server/auth";
import { getMyServiceJob } from "@/server/actions/helpdesk";
import { JobClient } from "./client";

export const dynamic = "force-dynamic";

/**
 * One assigned visit, for the technician working it.
 *
 * `getMyServiceJob` scopes on `assignedToId`, so a job id belonging to a
 * colleague is a 404 rather than a redacted page. That is the whole
 * authorisation for this route — the role check below only says the caller is
 * deskless, not which round is theirs.
 */
export default async function WorkerJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await enforceRole(["WORKER", "SUPERVISOR"]);
  const { id } = await params;

  const job = await getMyServiceJob(id);
  if (!job) notFound();

  return <JobClient job={job} />;
}
