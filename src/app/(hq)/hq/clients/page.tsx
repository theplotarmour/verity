import Link from "next/link";
import { PageHeader, Panel, EmptyState, Button } from "@/components/ui/primitives";
import { clientDirectory, requireOperator } from "@/server/platform/operator";
import { enterClientAction } from "@/server/actions/hq";
import { CreateClientForm } from "./CreateClientForm";

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
        {clients.length === 0 ? (
          <EmptyState
            compact
            title="No clients yet"
            description="Create one above. Nothing is provisioned automatically, and no demo client is created for you."
          />
        ) : (
          <table className="w-full border-collapse">
            <caption className="sr-only">Clients on this installation</caption>
            <thead>
              <tr>
                {["Client", "People", "Organizations", "Created", "", ""].map((h, i) => (
                  <th
                    key={h || i}
                    className={
                      "border-b border-line px-3 py-3 text-[12px] font-normal text-text-tertiary " +
                      (i === 0 ? "text-left" : "text-right")
                    }
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.tenantId}>
                  <td className="border-b border-line px-3 py-3 text-[14px]">
                    <Link
                      href={`/hq/clients/${client.tenantId}`}
                      className="text-text no-underline hover:text-accent"
                    >
                      {client.name}
                    </Link>
                  </td>
                  <td className="tabular border-b border-line px-3 py-3 text-right text-[14px]">
                    {client.memberCount}
                  </td>
                  <td className="tabular border-b border-line px-3 py-3 text-right text-[14px]">
                    {client.organizationCount}
                  </td>
                  <td className="border-b border-line px-3 py-3 text-right text-[13px] text-text-secondary">
                    {client.createdAt.toISOString().slice(0, 10)}
                  </td>
                  <td className="border-b border-line px-3 py-3 text-right">
                    <Link
                      href={`/hq/clients/${client.tenantId}`}
                      className="text-[13px] text-text-secondary no-underline hover:text-text"
                    >
                      Administer
                    </Link>
                  </td>
                  <td className="border-b border-line px-3 py-3 text-right">
                    <form action={enterClientAction}>
                      <input type="hidden" name="tenantId" value={client.tenantId} />
                      <Button type="submit" size="sm">
                        Enter client
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}
