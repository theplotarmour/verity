import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAuthUser, listMemberships, resolveActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { resolvePermissions } from "@/server/platform/authorization";
import { installCapabilities } from "@/server/capabilities/registry";
import { installAdministration } from "@/server/platform/administration";
import { navigationFor } from "@/server/platform/contribution";
import { ShellChrome, type NavArea, type NavItem } from "@/components/shell/ShellChrome";
import { isIconName } from "@/components/ui/icons";

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
  // Pre-existing gap, not introduced here: only HQ routes called this
  // (`hq.ts`), so `verity.platform.set_configuration` and the rest of the
  // administration command/query registry were unregistered on any request
  // that never touched `/hq` in this server process — including this client
  // shell's own `/configuration` Save button. Idempotent, same as above.
  installAdministration();

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

  // Icons come from the contribution, never from a route-to-icon map here —
  // that map is the same coupling the capability system exists to prevent, and
  // it would have to be edited for every capability installed.
  const toItem = (c: (typeof contributed)[number]): NavItem => ({
    href: c.href,
    label: c.label,
    icon: isIconName(c.icon) ? c.icon : undefined,
  });

  const areas: NavArea[] = [
    {
      group: "Platform",
      items: [
        { href: "/", label: "Overview", icon: "overview" as const },
        { href: "/workspace", label: "Workspace", icon: "workspace" as const },
      ],
    },
    {
      group: "Capabilities",
      items: contributed
        .filter((c) => (c.group ?? "Capabilities") === "Capabilities")
        .map(toItem),
    },
    {
      group: "Administration",
      items: [
        // Raw system-level capability toggling is platform-tenant-only (see
        // capabilities/page.tsx) — a client tenant must never see the link.
        ...(active.isPlatform
          ? [{ href: "/capabilities", label: "Capability registry", icon: "capabilities" as const }]
          : []),
        ...contributed.filter((c) => c.group === "Administration").map(toItem),
        ...(canConfigure
          ? [{ href: "/configuration", label: "Configuration", icon: "configuration" as const }]
          : []),
        ...(canAudit ? [{ href: "/audit", label: "Audit", icon: "audit" as const }] : []),
      ],
    },
  ].filter((area) => area.items.length > 0);

  // The platform stores no display name — Party is a bare identity primitive
  // (ADR-001) and a profile belongs to a capability, not here. The verified
  // sign-in address is the one name the platform legitimately knows.
  const authUser = await getAuthUser();
  const email = authUser?.email ?? "";
  const userLabel = email.split("@")[0] || "Signed in";
  const userInitials = (userLabel.match(/\b[a-z0-9]/gi)?.slice(0, 2).join("") || "V").toUpperCase();

  return (
    <ShellChrome
      areas={areas}
      memberships={memberships}
      active={active}
      userLabel={userLabel}
      userInitials={userInitials}
    >
      {children}
    </ShellChrome>
  );
}
