import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import { listOrganizations, listPeople, listRoles } from "@/server/platform/administration";
import { PageHeader, PermissionDenied } from "@/components/ui/primitives";
import { PeopleDesk } from "./PeopleDesk";

export const dynamic = "force-dynamic";

/**
 * §6 — the people who work here, and what each of them does.
 *
 * The client's own screen, not the operator's. The HQ equivalent under
 * `(hq)/clients/[tenantId]/people` administers somebody else's business; this
 * one is the business administering itself, and it speaks accordingly.
 */
export default async function PeoplePage() {
  installCapabilities();
  const actor = await requireActor();

  let people: Awaited<ReturnType<typeof listPeople.handler>>;
  try {
    people = await executeQuery(actor, listPeople, {});
  } catch (error) {
    if (error instanceof ForbiddenError) return <PermissionDenied what="people" />;
    throw error;
  }

  const [roles, organizations] = await Promise.all([
    executeQuery(actor, listRoles, {}).catch((error) => {
      if (error instanceof ForbiddenError) return [];
      throw error;
    }),
    executeQuery(actor, listOrganizations, {}).catch((error) => {
      if (error instanceof ForbiddenError) return [];
      throw error;
    }),
  ]);

  return (
    <>
      <PageHeader
        title="People"
        description="Everyone who can sign in to this business, where they work, and what they are allowed to do. What a role permits is set under Roles — this page decides who holds which."
      />
      <PeopleDesk
        people={people}
        roles={roles.map((role) => ({ id: role.id, name: role.name }))}
        organizations={organizations.map((organization) => ({
          id: organization.id,
          name: organization.name,
        }))}
      />
    </>
  );
}
