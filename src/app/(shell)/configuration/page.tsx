import { requireActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader, SectionHeading, Surface } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown> & { id: string; key: string; scope: string; value: string; source: string };

/**
 * Configuration (§23).
 *
 * Grouped by precedence scope so the resolution order is visible rather than
 * implied: narrowest wins, and a value is replaced rather than merged. Platform
 * defaults are shown but marked read-only, because a tenant cannot author or
 * overwrite one — the database refuses it, and showing an editable control would
 * misrepresent that.
 *
 * Internal technical settings are deliberately absent; the brief asks for the
 * configuration mechanism, not every knob.
 */
export default async function ConfigurationPage() {
  const actor = await requireActor();

  const rows = await withTenant(actor.tenantId, async (tx) => {
    const parameters = await tx.configParameter.findMany({ orderBy: [{ key: "asc" }] });
    return parameters.map<Row>((p) => ({
      id: p.id,
      key: p.key,
      scope: p.scope,
      value: JSON.stringify(p.value),
      source: p.scope === "Global" ? "Platform default (read-only)" : "This tenant",
    }));
  });

  return (
    <>
      <PageHeader
        title="Configuration"
        description="Values resolve narrowest-first: user, then organization, then tenant, then platform default."
      />

      <DataTable
        caption="Configuration parameters"
        rows={rows}
        columns={[
          { key: "key", header: "Key" },
          { key: "scope", header: "Scope" },
          { key: "value", header: "Value" },
          { key: "source", header: "Source" },
        ]}
        emptyTitle="No configuration set"
        emptyDescription="Capabilities read defaults until a tenant overrides them."
      />

      <div className="mt-8">
        <SectionHeading>Precedence</SectionHeading>
        <Surface className="p-5">
          <p className="text-text-secondary m-0">
            The first matching scope wins outright. A branch that overrides a value replaces it rather
            than blending it with the tenant default, because a partially-overridden value is ambiguous.
          </p>
        </Surface>
      </div>
    </>
  );
}
