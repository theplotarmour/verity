import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { listMemberships, resolveActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { resolvePermissions } from "@/server/platform/authorization";
import { installCapabilities } from "@/server/capabilities/registry";
import { navigationFor } from "@/server/platform/contribution";
import { ShellChrome, type NavArea } from "@/components/shell/ShellChrome";

export const dynamic = "force-dynamic";

/**
 * The Verity platform shell.
 *
 * Bible V4 §2 partitions experience into four role-centric shells. This
 * milestone builds one adaptive shell rather than four, deliberately: §27 of the
 * brief defers the specialised Worker Shell, and four shells with nothing to put
 * in three of them would be scaffolding pretending to be architecture. The
 * layout adapts by role and viewport instead.
 *
 * Navigation is derived from what the actor can actually reach — the capability
 * registry and their resolved permissions — never from a hard-coded module list.
 */
export default async function ShellLayout({ children }: { children: ReactNode }) {
  installCapabilities();

  const actor = await resolveActor();
  if (!actor) redirect("/sign-in");

  const memberships = await listMemberships();
  const active = memberships.find((m) => m.membershipId === actor.membershipId) ?? memberships[0]!;

  const { capabilities, canAudit, canConfigure, grants } = await withTenant(actor.tenantId, async (tx) => {
    const activations = await tx.tenantActivation.findMany({
      where: { status: "Active" },
      include: { capability: true },
    });
    const permissions = actor.roleId ? await resolvePermissions(tx, actor.roleId) : [];
    const readable = new Set(permissions.filter((p) => p.verb === "Read").map((p) => p.entity));

    return {
      // Every active capability is offered to the contribution layer, which
      // applies the per-item permission filter. Filtering here as well would
      // hide a capability whose only visible surface is one the actor *can*
      // reach.
      capabilities: activations.map((a) => ({ id: a.capabilityId, name: a.capability.name })),
      grants: permissions.map((p) => ({ entity: p.entity, verb: p.verb })),
      canAudit: readable.size > 0,
      canConfigure: permissions.some((p) => p.verb === "Edit"),
    };
  });

  // Capability navigation is declared by the capabilities themselves. The shell
  // previously held a hard-coded id-to-route map, which meant every new
  // capability required an edit to platform code — exactly the coupling the
  // capability system exists to prevent.
  const contributed = navigationFor({
    activeCapabilityIds: capabilities.map((c) => c.id),
    shell: "platform",
    canRead: (entity, verb) => grants.some((g) => g.entity === entity && g.verb === verb),
  });

  const areas: NavArea[] = [
    { group: "Platform", items: [{ href: "/", label: "Overview" }, { href: "/workspace", label: "Workspace" }] },
    {
      group: "Capabilities",
      items: contributed
        .filter((c) => (c.group ?? "Capabilities") === "Capabilities")
        .map((c) => ({ href: c.href, label: c.label })),
    },
    {
      group: "Administration",
      items: [
        { href: "/capabilities", label: "Capability registry" },
        ...contributed
          .filter((c) => c.group === "Administration")
          .map((c) => ({ href: c.href, label: c.label })),
        ...(canConfigure ? [{ href: "/configuration", label: "Configuration" }] : []),
        ...(canAudit ? [{ href: "/audit", label: "Audit" }] : []),
      ],
    },
  ].filter((area) => area.items.length > 0);

  return (
    <ShellChrome
      areas={areas}
      memberships={memberships}
      active={active}
      userLabel={active.roleName ?? "No role assigned"}
    >
      {children}
    </ShellChrome>
  );
}
