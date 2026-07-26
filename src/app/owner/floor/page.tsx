import { redirect } from "next/navigation";
import { getOwnerUser } from "@/lib/server/owner";
import { canUser } from "@/lib/server/permissions";
import { getFloorOverview } from "@/server/actions/floor";
import { PageHeader } from "@/components/design/PageHeader";
import { FloorClient } from "./FloorClient";

export default async function FloorPage() {
  const dbUser = await getOwnerUser();
  if (!dbUser) redirect("/onboarding");
  if (!(await canUser(dbUser, "QC_QUEUE"))) redirect("/unauthorized");

  const departments = await getFloorOverview();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Live"
        title="Floor"
        description="Every department at a glance — what is running now, who is on it, and which orders. Open a department for full live status."
      />
      <FloorClient departments={departments} />
    </div>
  );
}
