"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MembershipOption } from "@/server/platform/auth";
import { switchOrganization } from "@/server/actions/platform";
import { Icon } from "@/components/ui/icons";

/**
 * Answers "where am I operating right now?" and lets the actor change it.
 *
 * Drawn as the board's context pill: a bordered 38px control with a glyph, a
 * label and a chevron, sitting in the masthead row beside the page title. That
 * is where the board puts operating context and where a reader looks for it —
 * above the content, not buried at the top of a navigation rail.
 *
 * The control submits a *membership* id, never a tenant or organization id. The
 * server re-verifies that the membership belongs to the authenticated user
 * before honouring it, so this cannot be used to enter a tenant the user does
 * not belong to (PLA-TEN-006). The client is telling the platform which of its
 * own memberships to activate, not which tenant to become.
 */
export function OrganizationSwitcher({
  memberships,
  active,
  /**
   * The shell renders this twice — once in the masthead, once in the mobile
   * sheet — so each instance needs its own id. A shared id is invalid HTML and
   * points every label at whichever control happens to come first in the
   * document, which is the hidden one on mobile.
   */
  instanceId = "header",
}: {
  memberships: MembershipOption[];
  active: MembershipOption;
  instanceId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const single = memberships.length <= 1;
  const selectId = `org-switcher-${instanceId}`;
  const stacked = instanceId === "sheet";

  // One membership is a statement of fact, not a choice. A select with a single
  // option is a control that cannot do anything, so it is shown as the label it
  // actually is.
  if (single) {
    return (
      <div
        className={
          "flex items-center gap-2.5 rounded-md border border-line bg-surface px-3 " +
          (stacked ? "h-12 w-full" : "h-[38px] max-w-[16rem]")
        }
      >
        <Icon name="building" size={16} className="shrink-0 text-text-tertiary" />
        <span className="min-w-0">
          <span className="block truncate text-[13px] text-text">{active.organizationName}</span>
          <span className="block truncate text-[11px] text-text-tertiary">{active.tenantName}</span>
        </span>
      </div>
    );
  }

  return (
    <div className={stacked ? "w-full" : "max-w-[18rem]"}>
      <label htmlFor={selectId} className="sr-only">
        Active organization
      </label>
      <div className="relative flex items-center">
        <Icon
          name="building"
          size={16}
          className="pointer-events-none absolute left-3 text-text-tertiary"
        />
        <select
          id={selectId}
          className={
            "w-full cursor-pointer appearance-none truncate rounded-md border border-line bg-surface " +
            "pl-10 pr-9 text-[13px] text-text transition-colors hover:border-line-strong " +
            "focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-subtle)] focus:outline-none " +
            (stacked ? "h-12 min-h-12" : "h-11 min-h-11 lg:h-[38px] lg:min-h-[38px]")
          }
          value={active.membershipId}
          disabled={pending}
          onChange={(event) => {
            const membershipId = event.target.value;
            startTransition(async () => {
              await switchOrganization(membershipId);
              router.refresh();
            });
          }}
        >
          {memberships.map((m) => (
            <option key={m.membershipId} value={m.membershipId}>
              {m.organizationName} — {m.tenantName}
            </option>
          ))}
        </select>
        <Icon
          name="chevronDown"
          size={15}
          className="pointer-events-none absolute right-3 text-text-tertiary"
        />
      </div>
      {/* aria-live so a switch is announced; without it the page simply changes
          under a screen-reader user with no explanation. In the masthead there
          is no room for a caption, so the announcement carries no visual weight
          — the pill itself already shows the current context. */}
      <p
        aria-live="polite"
        className={stacked ? "m-0 mt-1.5 px-1 text-[12px] text-text-tertiary" : "sr-only"}
      >
        {pending ? "Switching…" : `${active.roleName ?? "No role"} in this context`}
      </p>
    </div>
  );
}
