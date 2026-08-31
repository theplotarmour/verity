import { requireActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { hasPermission } from "@/server/platform/authorization";
import { ENTITY_TENANT } from "@/server/platform/administration";
import { PageHeader, Panel, PermissionDenied, Stat, StatRow } from "@/components/ui/primitives";
import { AppearanceControls } from "@/components/shell/AppearanceControls";
import { ACCENT_PRESETS, DEFAULT_ACCENT } from "@/server/platform/accent";
import { configKeyInfo, humanizeSegment } from "@/server/platform/label";
import { ConfigurationEditor } from "./ConfigurationEditor";

export const dynamic = "force-dynamic";



/**
 * Configuration (§23).
 *
 * Precedence is visible rather than implied: narrowest wins, and a value is
 * replaced rather than merged. A platform default is shown with its value and
 * labelled inherited — a tenant does not edit the Global row, it writes its own
 * Tenant-scoped one that shadows it, which is what saving does here.
 *
 * Internal technical settings are deliberately absent; the brief asks for the
 * configuration mechanism, not every knob.
 *
 * The screen was read-only until a tenant could not be set up without SQL. Every
 * write now goes through `verity.platform.set_configuration`, the command HQ
 * already registered — not a helper the page calls directly, because a second
 * write path is a second place authorization and audit get forgotten.
 *
 * A platform default is shown with its value filled in and labelled as
 * inherited. That distinction is the whole point of the resolution order, and
 * saving is what turns the platform's value into this tenant's own.
 */
export default async function ConfigurationPage() {
  const actor = await requireActor();

  // THE HOLE THIS CLOSES. This page had no authorization check of any kind. It
  // called `requireActor()` — which only establishes *who* is asking — and then
  // read every configuration parameter for the tenant. Writes went through
  // `verity.platform.set_configuration`, which authorizes properly, so the gap
  // was reads: any authenticated member of the tenant, with any role or none,
  // could read the business's whole configuration by typing the URL. The nav
  // link was hidden from most of them, which made it look controlled.
  //
  // Gated on the same Edit-on-Tenant the write command requires, deliberately:
  // §0 says a normal client must never be shown raw configuration keys, so the
  // set of people who may read them is the set who may change them, not a
  // wider one invented here.
  const permitted = await withTenant(actor.tenantId, (tx) =>
    hasPermission(tx, actor.roleId, "Edit", ENTITY_TENANT),
  );
  if (!permitted) return <PermissionDenied what="configuration" />;

  const rows = await withTenant(actor.tenantId, async (tx) => {
    const [parameters, capabilities] = await Promise.all([
      tx.configParameter.findMany({ orderBy: [{ key: "asc" }] }),
      tx.capabilityDefinition.findMany({ select: { id: true, name: true } }),
    ]);
    const capabilityName = new Map(capabilities.map((c) => [c.id, c.name]));

    // One row per key, showing what actually resolves. A tenant value shadows
    // the platform default rather than sitting beside it, so listing both would
    // show a value that is not in force.
    const byKey = new Map<string, { key: string; value: string; inherited: boolean }>();
    for (const parameter of parameters) {
      const tenantOwned = parameter.scope !== "Global";
      const existing = byKey.get(parameter.key);
      if (existing && !tenantOwned) continue;
      byKey.set(parameter.key, {
        key: parameter.key,
        // Rendered without JSON quotes: an operator types 07, not "07", and the
        // command stores what they typed.
        value:
          typeof parameter.value === "string"
            ? parameter.value
            : JSON.stringify(parameter.value),
        inherited: !tenantOwned,
      });
    }

    return [...byKey.values()]
      .map((row) => {
        const info = configKeyInfo(row.key);
        const groupLabel =
          capabilityName.get(`verity.capability.${info.groupSlug}`) ?? humanizeSegment(info.groupSlug);
        return { ...row, ...info, groupLabel };
      })
      .sort((a, b) => a.groupLabel.localeCompare(b.groupLabel) || a.key.localeCompare(b.key));
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
        <Stat label="Set by this tenant" value={rows.filter((r) => !r.inherited).length} />
        <Stat label="Platform defaults" value={rows.filter((r) => r.inherited).length} />
      </StatRow>

      <ConfigurationEditor parameters={rows} />

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
