"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MembershipOption } from "@/server/platform/auth";
import { switchOrganization } from "@/server/actions/platform";

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
    <div className="px-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary m-0 mb-1.5">
        Context
      </p>

      {single ? (
        <div>
          <p className="text-[14px] font-medium text-text m-0">{active.organizationName}</p>
          <p className="text-[13px] text-text-tertiary m-0">{active.tenantName}</p>
        </div>
      ) : (
        <>
          <label htmlFor={selectId} className="sr-only">
            Active organization
          </label>
          <select
            id={selectId}
            className="w-full h-10 min-h-11 sm:min-h-10 px-2 rounded-md bg-surface text-text border border-line-strong text-[14px]"
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
          <p className="text-[13px] text-text-tertiary m-0 mt-1">
            {pending ? "Switching…" : `${active.roleName ?? "No role"} in this context`}
          </p>
        </>
      )}
    </div>
  );
}
