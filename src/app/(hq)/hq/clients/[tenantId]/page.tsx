import Link from "next/link";
import { ErrorState, Panel, Stat, StatRow } from "@/components/ui/primitives";
import { runClientQuery } from "@/server/actions/hq";
import type { ModuleRow, PersonRow, RoleRow } from "@/server/platform/administration";

export const dynamic = "force-dynamic";

type Org = { id: string; name: string; parentId: string | null; memberCount: number };

/**
 * One client at a glance.
 *
 * Four counts and the way into each surface. Everything here is read through
 * the ordinary query pipeline as the operator, so a number an operator is not
 * permitted to see would not appear rather than appearing as zero.
 */
export default async function ClientOverviewPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;

  const [people, roles, organizations, modules] = await Promise.all([
    runClientQuery<PersonRow[]>(tenantId, "verity.platform.list_people", {}),
    runClientQuery<RoleRow[]>(tenantId, "verity.platform.list_roles", {}),
    runClientQuery<Org[]>(tenantId, "verity.platform.list_organizations", {}),
    runClientQuery<ModuleRow[]>(tenantId, "verity.platform.list_modules", {}),
  ]);

  const failure = [people, roles, organizations, modules].find((r) => !r.ok);
  if (failure && !failure.ok) {
    return (
      <ErrorState
        title="Could not load this client"
        message={failure.message}
        retryable={failure.retryable}
      />
    );
  }
  if (!people.ok || !roles.ok || !organizations.ok || !modules.ok) return null;

  const base = `/hq/clients/${tenantId}`;
  const active = modules.data.filter((m) => m.status === "Active");
  const withoutRole = people.data.filter((p) => !p.roleId).length;

  return (
    <>
      <StatRow className="mb-6">
        <Stat label="People" value={people.data.length} href={`${base}/people`} />
        <Stat label="Roles" value={roles.data.length} href={`${base}/roles`} />
        <Stat
          label="Organizations"
          value={organizations.data.length}
          href={`${base}/organizations`}
        />
        <Stat
          label="Modules enabled"
          value={`${active.length} of ${modules.data.length}`}
          href={`${base}/modules`}
        />
      </StatRow>

      <Panel title="Where to start">
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-[14px]">
          <li>
            <Link href={`${base}/modules`} className="text-accent-ink no-underline hover:underline">
              Enable the capabilities this client needs
            </Link>
            <span className="ml-2 text-[13px] text-text-tertiary">
              {active.length === 0
                ? "none enabled yet — the client's people will see no capability navigation"
                : active.map((m) => m.name).join(", ")}
            </span>
          </li>
          <li>
            <Link
              href={`${base}/organizations`}
              className="text-accent-ink no-underline hover:underline"
            >
              Shape the organization hierarchy
            </Link>
            <span className="ml-2 text-[13px] text-text-tertiary">
              scoped permissions resolve against it
            </span>
          </li>
          <li>
            <Link href={`${base}/roles`} className="text-accent-ink no-underline hover:underline">
              Define roles and grants
            </Link>
          </li>
          <li>
            <Link href={`${base}/people`} className="text-accent-ink no-underline hover:underline">
              Invite people and assign roles
            </Link>
            {withoutRole > 0 && (
              <span className="ml-2 text-[13px] text-warning">
                {withoutRole} {withoutRole === 1 ? "person has" : "people have"} no role and can do
                nothing
              </span>
            )}
          </li>
        </ul>
      </Panel>
    </>
  );
}
