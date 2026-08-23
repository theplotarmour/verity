import { requireActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { hasPermission } from "@/server/platform/authorization";
import { installCapabilities } from "@/server/capabilities/registry";
import { ENTITY_EVIDENCE } from "@/server/capabilities/evidence";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader, PermissionDenied, SectionHeading, Surface } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown> & {
  id: string; kind: string; subject: string; subjectId: string;
  capturedAt: string; fence: string;
};

/**
 * Evidence across the tenant (§21).
 *
 * Read-only by design. Evidence is captured in the context of the record it
 * concerns — an inspection, an asset — never from a general-purpose upload
 * screen, because evidence detached from its subject proves nothing. Capture
 * lives on the record's own page; this is the register.
 *
 * There is no edit or delete control anywhere, because the database refuses both
 * at trigger level even for a privileged role. Offering a control the backend
 * rejects teaches users to distrust the interface.
 */
export default async function EvidencePage() {
  installCapabilities();
  const actor = await requireActor();

  const rows = await withTenant(actor.tenantId, async (tx) => {
    if (!(await hasPermission(tx, actor.roleId, "Read", ENTITY_EVIDENCE))) return null;

    const evidence = await tx.evidence.findMany({ orderBy: { capturedAt: "desc" }, take: 200 });
    return evidence.map<Row>((e) => ({
      id: e.id,
      kind: e.kind,
      subject: e.entityKey.split(".").pop() ?? e.entityKey,
      subjectId: e.entityId,
      capturedAt: e.capturedAt.toISOString().replace("T", " ").slice(0, 16),
      fence:
        e.withinFence === null
          ? "Not evaluated"
          : e.withinFence
            ? "Inside"
            : "Outside",
    }));
  });

  if (!rows) return <PermissionDenied what="reading evidence" />;

  return (
    <>
      <PageHeader
        title="Evidence"
        description="Immutable field data. Once recorded, evidence cannot be edited or deleted at any privilege level."
      />

      <DataTable
        caption="Evidence"
        rows={rows}
        columns={[
          { key: "kind", header: "Kind" },
          { key: "subject", header: "Subject", variant: "link", href: "/assets/{subjectId}" },
          { key: "fence", header: "Geofence at capture" },
          { key: "capturedAt", header: "Captured" },
        ]}
        emptyTitle="No evidence captured"
        emptyDescription="Evidence is captured against a record — open an asset to capture some."
      />

      <div className="mt-8">
        <SectionHeading>Why the verdict is stored, not computed</SectionHeading>
        <Surface className="p-5">
          <p className="text-text-secondary m-0">
            The geofence result is recorded at capture time. A fence can be moved or resized later, and
            re-judging an old capture against today&rsquo;s boundary would silently rewrite history.
          </p>
        </Surface>
      </div>
    </>
  );
}
