import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getOwnerUser } from "@/lib/server/owner";
import { canUser } from "@/lib/server/permissions";
import { getDepartmentFloor } from "@/server/actions/floor";
import { PageHeader } from "@/components/design/PageHeader";
import { Button } from "@/components/ui/primitives";
import { DepartmentFloorClient } from "./DepartmentFloorClient";

export default async function DepartmentFloorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dbUser = await getOwnerUser();
  if (!dbUser) redirect("/onboarding");
  if (!(await canUser(dbUser, "QC_QUEUE"))) redirect("/unauthorized");

  const data = await getDepartmentFloor(id);
  if (!data) redirect("/owner/floor");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={data.isQcStage ? "Department · Quality" : "Department"}
        title={data.name}
        description="Live status — every active order and everyone working in this department."
        actions={
          <Link href="/owner/floor">
            <Button variant="secondary" className="gap-2 text-xs h-9">
              <ArrowLeft className="h-3.5 w-3.5" /> All departments
            </Button>
          </Link>
        }
      />
      <DepartmentFloorClient data={data} />
    </div>
  );
}
