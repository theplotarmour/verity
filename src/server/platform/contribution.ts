import "server-only";
import type { PermissionVerb } from "@prisma/client";

/**
 * Capability experience contributions.
 *
 * Authority: PLA-CAP-001 (a capability registers its metadata with the
 * platform), Bible V1 §3 ("standardize the foundation, not every behavior"),
 * foundation-ready condition F (new specialised UI without rewriting the shell).
 *
 * This closes a real violation. Until now the shell held a hard-coded map from
 * capability id to route, so every new capability required an edit to
 * platform code — precisely the coupling the capability system exists to
 * prevent. A capability now declares its own surfaces and the shell reads them.
 *
 * Deliberately NOT a universal screen renderer. A contribution declares *where*
 * a capability appears and *what* it may do there; it does not describe how to
 * draw the page. Scheduling needs a time grid and Approval needs a queue, and
 * forcing both through one generic renderer would trade real usability for
 * uniformity nobody asked for. Metadata-driven screens remain available for the
 * cases that suit them (see `experience.ts`), and purpose-built screens remain
 * available for the cases that do not.
 */

/** Where in the shell a contribution appears. */
export type NavigationGroup = "Platform" | "Capabilities" | "Administration";

/**
 * Which shell a surface belongs to.
 *
 * Bible V4 §2 defines four role-centric shells. A capability declares which it
 * contributes to, so a Worker-only surface never appears in an admin console
 * even for an administrator who technically holds the permission.
 */
export type ShellKind = "platform" | "operations" | "worker" | "external";

export type NavigationContribution = {
  /** Route the shell links to. Owned by the capability, not the platform. */
  href: string;
  label: string;
  group?: NavigationGroup;
  shells?: ShellKind[];
  /**
   * Entity the actor must be able to read for this to appear. A menu item that
   * leads to E_FORBIDDEN is worse than no menu item.
   */
  requiresEntity?: string;
  requiresVerb?: PermissionVerb;
  /** Lower sorts first; ties fall back to label order. */
  order?: number;
};

/**
 * A count or short status a capability offers to the workspace queue.
 *
 * Returns a number, not a rendered card: Bible V4 §3 says a workspace is for
 * executing, so the shell decides presentation and the capability supplies only
 * what is waiting. This is also what keeps §31's "no fake metrics" enforceable —
 * a capability can only report something it can actually count.
 */
export type WorkspaceContribution = {
  key: string;
  label: string;
  href: string;
  /** Must return a real count. Return 0, never a placeholder. */
  count: (context: { tenantId: string; roleId: string | null; userId: string }) => Promise<number>;
  shells?: ShellKind[];
};

export type CapabilityContribution = {
  capabilityId: string;
  navigation?: NavigationContribution[];
  workspace?: WorkspaceContribution[];
};

const contributions = new Map<string, CapabilityContribution>();

/** Registers a capability's experience contributions. Idempotent by capability. */
export function registerContribution(contribution: CapabilityContribution): void {
  contributions.set(contribution.capabilityId, contribution);
}

export function clearContributions(): void {
  contributions.clear();
}

export function contributionFor(capabilityId: string): CapabilityContribution | undefined {
  return contributions.get(capabilityId);
}

/**
 * Navigation for the active capabilities, filtered by what the actor can read.
 *
 * Three filters, each necessary and none sufficient alone: the capability must
 * be activated for the tenant (PLA-CAP-002), the contribution must belong to
 * this shell (Bible V4 §2), and the actor must hold the declared permission
 * (PLA-AUT-003). None of them is authorization — the command and query
 * pipelines remain the thing that decides — they only choose what to draw.
 */
export function navigationFor(args: {
  activeCapabilityIds: string[];
  shell: ShellKind;
  canRead: (entity: string, verb: PermissionVerb) => boolean;
}): Array<NavigationContribution & { capabilityId: string }> {
  const items: Array<NavigationContribution & { capabilityId: string }> = [];

  for (const capabilityId of args.activeCapabilityIds) {
    const contribution = contributions.get(capabilityId);
    if (!contribution?.navigation) continue;

    for (const item of contribution.navigation) {
      const shells = item.shells ?? ["platform", "operations"];
      if (!shells.includes(args.shell)) continue;
      if (item.requiresEntity && !args.canRead(item.requiresEntity, item.requiresVerb ?? "Read")) {
        continue;
      }
      items.push({ ...item, capabilityId });
    }
  }

  return items.sort(
    (a, b) => (a.order ?? 100) - (b.order ?? 100) || a.label.localeCompare(b.label),
  );
}

/** Workspace queue entries offered by the active capabilities. */
export function workspaceContributionsFor(args: {
  activeCapabilityIds: string[];
  shell: ShellKind;
}): Array<WorkspaceContribution & { capabilityId: string }> {
  const items: Array<WorkspaceContribution & { capabilityId: string }> = [];

  for (const capabilityId of args.activeCapabilityIds) {
    for (const item of contributions.get(capabilityId)?.workspace ?? []) {
      const shells = item.shells ?? ["platform", "operations"];
      if (!shells.includes(args.shell)) continue;
      items.push({ ...item, capabilityId });
    }
  }
  return items;
}
