import { PageHeader, Panel } from "@/components/ui/primitives";
import { clientDirectory, requireOperator } from "@/server/platform/operator";
import { CreateClientForm } from "./CreateClientForm";
import { ClientsTable } from "./ClientsTable";

export const dynamic = "force-dynamic";

/**
 * Clients.
 *
 * The two things an operator does here are create a client and enter one.
 * Entering is a form rather than a link because it is a WRITE — it grants the
 * operator a membership in that client and records the visit in the client's own
 * audit trail (QO-3). A link would imply navigation and hide a privileged act.
 */
export default async function HqClientsPage() {
  const operator = await requireOperator();
  const clients = await clientDirectory(operator);

  return (
    <>
      <PageHeader
        title="Clients"
        description="Every tenant on this installation except the platform itself. Creating a client provisions its tenant, root organization and your operator access — no SQL, no seed script."
      />

      <div className="mb-6">
        <CreateClientForm />
      </div>

      <Panel title={`${clients.length} client${clients.length === 1 ? "" : "s"}`} flush>
        <ClientsTable clients={clients} />
      </Panel>
    </>
  );
}
