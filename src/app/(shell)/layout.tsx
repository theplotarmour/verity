import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { listMemberships, resolveActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { resolvePermissions } from "@/server/platform/authorization";
import { installCapabilities } from "@/server/capabilities/registry";
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

  const { capabilities, canAudit, canConfigure } = await withTenant(actor.tenantId, async (tx) => {
    const activations = await tx.tenantActivation.findMany({
      where: { status: "Active" },
      include: { capability: true },
    });
    const permissions = actor.roleId ? await resolvePermissions(tx, actor.roleId) : [];
    const readable = new Set(permissions.filter((p) => p.verb === "Read").map((p) => p.entity));

    return {
      // A capability appears only if it is active *and* the actor can read at
      // least one of its entities. A menu item that leads to E_FORBIDDEN is
      // worse than no menu item.
      capabilities: activations
        .filter((a) => a.capability.entityTypes.some((e) => readable.has(e)))
        .map((a) => ({ id: a.capabilityId, name: a.capability.name })),
      canAudit: readable.size > 0,
      canConfigure: permissions.some((p) => p.verb === "Edit"),
    };
  });

  const capabilityRoutes: Record<string, string> = {
    "verity.capability.location": "/locations",
    "verity.capability.asset": "/assets",
    "verity.capability.scheduling": "/scheduling",
    "verity.capability.evidence": "/evidence",
    "verity.capability.approval": "/approvals",
  };

  const areas: NavArea[] = [
    { group: "Platform", items: [{ href: "/", label: "Overview" }, { href: "/workspace", label: "Workspace" }] },
    {
      group: "Capabilities",
      items: capabilities
        .filter((c) => capabilityRoutes[c.id])
        .map((c) => ({ href: capabilityRoutes[c.id]!, label: c.name })),
    },
    {
      group: "Administration",
      items: [
        { href: "/capabilities", label: "Capability registry" },
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
