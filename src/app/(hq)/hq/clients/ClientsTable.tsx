"use client";

import { Button } from "@/components/ui/primitives";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { enterClientAction } from "@/server/actions/hq";

const columns: Column[] = [
  { key: "name", header: "Client", sortable: true, variant: "link", href: "/hq/clients/{tenantId}" },
  { key: "memberCount", header: "People", numeric: true, sortable: true },
  { key: "organizationCount", header: "Organizations", numeric: true, sortable: true },
  { key: "created", header: "Created", sortable: true },
  { key: "administer", header: "", variant: "link", href: "/hq/clients/{tenantId}" },
];

type ClientRow = {
  tenantId: string;
  name: string;
  memberCount: number;
  organizationCount: number;
  createdAt: Date;
};

/**
 * The client list's table half, split out from `page.tsx` (a Server
 * Component) because `DataTable`'s `rowActions` is a plain closure — it
 * cannot cross the Server/Client boundary the way a `"use server"` action
 * can. `enterClientAction` itself stays a real server action, called from
 * the row's own `<form>`, same write-not-navigation shape the page's own
 * doc comment requires (QO-3: entering a client is a privileged act with
 * an audit record, not a link).
 */
export function ClientsTable({ clients }: { clients: ClientRow[] }) {
  return (
    <DataTable
      columns={columns}
      rows={clients.map((client) => ({
        id: client.tenantId,
        tenantId: client.tenantId,
        name: client.name,
        memberCount: client.memberCount,
        organizationCount: client.organizationCount,
        created: client.createdAt.toISOString().slice(0, 10),
        administer: "Administer",
      }))}
      caption="Clients on this installation"
      emptyTitle="No clients yet"
      emptyDescription="Create one above. Nothing is provisioned automatically, and no demo client is created for you."
      rowActions={(row) => (
        <form action={enterClientAction}>
          <input type="hidden" name="tenantId" value={String(row.tenantId)} />
          <Button type="submit" size="sm">
            Enter client
          </Button>
        </form>
      )}
    />
  );
}
