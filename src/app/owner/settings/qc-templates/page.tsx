import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getOwnerUser } from "@/lib/server/owner";
import { canUser } from "@/lib/server/permissions";
import { PageHeader } from "@/components/design/PageHeader";
import { Surface } from "@/components/design/Surface";
import { Button } from "@/components/ui/primitives";
import { QCTemplateBuilder } from "../QCTemplateBuilder";

export default async function QCTemplatesPage() {
  const dbUser = await getOwnerUser();
  if (!dbUser) redirect("/");
  if (!(await canUser(dbUser, "ACCESS_SETTINGS"))) redirect("/unauthorized");

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Workflow"
        title="Templates"
        description="Build and edit checklist templates for any department or task."
        actions={
          <Link href="/owner/settings">
            <Button variant="secondary" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Settings
            </Button>
          </Link>
        }
      />
      <Surface className="p-5">
        <QCTemplateBuilder />
      </Surface>
    </div>
  );
}
