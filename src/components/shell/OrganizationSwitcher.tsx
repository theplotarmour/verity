"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MembershipOption } from "@/server/platform/auth";
import { switchOrganization } from "@/server/actions/platform";
import { Icon } from "@/components/ui/icons";

/**
 * Answers "where am I operating right now?" and lets the actor change it.
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
   * The shell renders this twice — once in the desktop rail, once in the mobile
   * sheet — so each instance needs its own id. A shared id is invalid HTML and
   * points every label at whichever control happens to come first in the
   * document, which is the hidden one on mobile.
   */
  instanceId = "rail",
}: {
  memberships: MembershipOption[];
  active: MembershipOption;
  instanceId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const single = memberships.length <= 1;
  const selectId = `org-switcher-${instanceId}`;

  return (
    <div className="px-1">
      <p className="m-0 mb-1.5 px-2 text-[10px] font-medium uppercase tracking-[0.09em] text-text-tertiary">
        Context
      </p>

      {/* One membership is a statement of fact, not a choice. A select with a
          single option is a control that cannot do anything, so it is shown as
          the label it actually is. */}
      {single ? (
        <div className="flex items-center gap-2.5 rounded-md border border-line bg-control px-2.5 py-2">
          <Icon name="building" size={14} className="text-text-tertiary" />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium text-text">
              {active.organizationName}
            </span>
            <span className="block truncate text-[11px] text-text-tertiary">
              {active.tenantName}
            </span>
          </span>
        </div>
      ) : (
        <>
          <label htmlFor={selectId} className="sr-only">
            Active organization
          </label>
          <div className="relative flex items-center">
            <Icon
              name="building"
              size={14}
              className="pointer-events-none absolute left-2.5 text-text-tertiary"
            />
            <select
              id={selectId}
              className="h-11 w-full min-h-11 cursor-pointer appearance-none rounded-md border border-line bg-control pl-8 pr-8 text-[13px] text-text transition-colors hover:border-line-strong sm:h-[38px] sm:min-h-[38px]"
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
              size={13}
              className="pointer-events-none absolute right-2.5 text-text-tertiary"
            />
          </div>
          {/* aria-live so a switch is announced; without it the page simply
              changes under a screen-reader user with no explanation. */}
          <p aria-live="polite" className="m-0 mt-1.5 px-2 text-[11px] text-text-tertiary">
            {pending ? "Switching…" : `${active.roleName ?? "No role"} in this context`}
          </p>
        </>
      )}
    </div>
  );
}
