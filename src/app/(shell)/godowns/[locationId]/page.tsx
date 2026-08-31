import { notFound } from "next/navigation";
import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import { godownDetail } from "@/server/capabilities/plywood";
import { PermissionDenied } from "@/components/ui/primitives";
import { GodownView } from "./GodownView";

export const dynamic = "force-dynamic";

/**
 * §11 — one godown: what it holds, what is promised out of it, what is coming.
 *
 * A godown outside this actor's scope renders as not-found rather than as
 * forbidden. Distinguishing the two would tell a warehouse operator that a site
 * they may not read is nevertheless there, which is the fact the scope was
 * meant to withhold.
 */
export default async function GodownPage({
  params,
}: {
  params: Promise<{ locationId: string }>;
}) {
  installCapabilities();
  const actor = await requireActor();
  const { locationId } = await params;

  let godown: Awaited<ReturnType<typeof godownDetail.handler>>;
  try {
    godown = await executeQuery(actor, godownDetail, { locationId });
  } catch (error) {
    if (error instanceof ForbiddenError) return <PermissionDenied what="godowns" />;
    throw error;
  }
  if (!godown) notFound();

  return <GodownView godown={godown} />;
}
