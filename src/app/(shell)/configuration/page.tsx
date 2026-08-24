import { requireActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader, Panel, Stat, StatRow } from "@/components/ui/primitives";
import { AppearanceControls } from "@/components/shell/AppearanceControls";
import { ACCENT_PRESETS, DEFAULT_ACCENT } from "@/server/platform/accent";

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

      {/* Which of these values this tenant actually owns, and which are the
          platform's own read-only defaults. That distinction is the whole point
          of the resolution order, so it belongs above the table. */}
      {/* Appearance lives here rather than in a second settings architecture:
          Configuration is already the platform's resolution surface, and theme
          and accent are per-user interface preferences, not tenant policy — so
          they are cookies, not ConfigParameter rows, and platform configuration
          semantics are untouched. */}
      <Panel title="Appearance" className="mb-6">
        <AppearanceControls presets={ACCENT_PRESETS} defaultAccent={DEFAULT_ACCENT} />
      </Panel>

      <StatRow cols={3} className="mb-6">
        <Stat label="Parameters" value={rows.length} />
        <Stat label="Set by this tenant" value={rows.filter((r) => r.scope !== "Global").length} />
        <Stat label="Platform defaults" value={rows.filter((r) => r.scope === "Global").length} />
      </StatRow>

      <DataTable
        caption="Configuration parameters"
        rows={rows}
        columns={[
          { key: "key", header: "Key", subKey: "source" },
          { key: "scope", header: "Scope" },
          { key: "value", header: "Value" },
        ]}
        emptyTitle="No configuration set"
        emptyDescription="Capabilities read their defaults until a tenant overrides them. Nothing has been overridden here."
      />

      <div className="mt-6">
        <Panel title="Precedence">
          <p className="m-0 max-w-[70ch] text-[13px] leading-relaxed text-text-secondary">
            The first matching scope wins outright. A branch that overrides a value replaces it
            rather than blending it with the tenant default, because a partially-overridden value is
            ambiguous.
          </p>
        </Panel>
      </div>
    </>
  );
}
