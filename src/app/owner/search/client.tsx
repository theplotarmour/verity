"use client";

import Link from "next/link";
import { Badge, Button } from "@/components/ui/primitives";
import { Surface } from "@/components/design/Surface";
import { PageHeader } from "@/components/design/PageHeader";
import { Search, ClipboardList, Factory, User as UserIcon, Users } from "lucide-react";
import { titleCaseStatus } from "@/lib/utils";

type SearchResults = {
  orders: any[];
  batches: any[];
  customers: any[];
  workers: any[];
  designs?: any[];
  materials?: any[];
  dispatches?: any[];
};

export function SearchClient({
  query,
  results,
}: {
  query: string;
  results: SearchResults;
}) {
  const hasResults =
    results.orders.length > 0 ||
    results.batches.length > 0 ||
    results.customers.length > 0 ||
    results.workers.length > 0 ||
    (results.designs?.length ?? 0) > 0 ||
    (results.materials?.length ?? 0) > 0 ||
    (results.dispatches?.length ?? 0) > 0;

  return (
    <div className="flex lg:h-full flex-col space-y-6">
      <PageHeader
        eyebrow="Global Search"
        title={query ? `Search results for "${query}"` : "Search"}
        description={query ? "Found matching records across the factory." : "Enter a search term in the top bar to find orders, batches, customers, or workers."}
      />

      {!query ? (
        <Surface className="flex flex-col items-center justify-center py-24 text-center">
          <Search className="mb-4 h-12 w-12 text-text-tertiary" />
          <p className="text-base font-semibold text-text-primary">What are you looking for?</p>
          <p className="mt-2 max-w-sm text-sm text-text-secondary">
            Use the search bar above to quickly find anything across your entire factory workspace.
          </p>
        </Surface>
      ) : !hasResults ? (
        <Surface className="flex flex-col items-center justify-center py-24 text-center">
          <Search className="mb-4 h-12 w-12 text-text-tertiary" />
          <p className="text-base font-semibold text-text-primary">No results found</p>
          <p className="mt-2 max-w-sm text-sm text-text-secondary">
            We couldn't find any matches for "{query}". Try searching with different keywords.
          </p>
        </Surface>
      ) : (
        <div className="flex-1 lg:min-h-0 overflow-y-auto space-y-6 pb-12">
          {results.orders.length > 0 && (
            <Surface className="p-5">
              <div className="flex items-center gap-2 border-b border-border pb-4 mb-4">
                <ClipboardList className="h-5 w-5 text-[var(--brand)]" />
                <h2 className="text-[15px] font-semibold text-text-primary">Orders</h2>
                <Badge variant="neutral" className="ml-2">{results.orders.length}</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {results.orders.map((order) => (
                  <Link key={order.id} href="/owner/production" className="block p-4 rounded-[18px] border border-border bg-surface-2 transition hover:border-brand/30 hover:bg-background">
                    <div className="flex justify-between items-start">
                      <p className="font-semibold text-text-primary">{order.orderNumber}</p>
                      <Badge variant="neutral">{titleCaseStatus(order.status)}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-text-secondary">{order.customer?.name}</p>
                    <p className="text-xs text-text-tertiary">{order.vehicleBrand?.name} {order.vehicleModel?.name}</p>
                  </Link>
                ))}
              </div>
            </Surface>
          )}

          {results.batches.length > 0 && (
            <Surface className="p-5">
              <div className="flex items-center gap-2 border-b border-border pb-4 mb-4">
                <Factory className="h-5 w-5 text-[var(--brand)]" />
                <h2 className="text-[15px] font-semibold text-text-primary">Batches</h2>
                <Badge variant="neutral" className="ml-2">{results.batches.length}</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {results.batches.map((batch) => (
                  <Link key={batch.id} href={batch.inspection?.id ? `/owner/review/${batch.inspection.id}` : "/owner/production"} className="block p-4 rounded-[18px] border border-border bg-surface-2 transition hover:border-brand/30 hover:bg-background">
                    <div className="flex justify-between items-start">
                      <p className="font-semibold text-text-primary">{batch.batchNumber}</p>
                      <Badge variant="neutral">{titleCaseStatus(batch.status)}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-text-secondary">Order: {batch.order?.orderNumber}</p>
                    <p className="text-xs text-text-tertiary">Qty: {batch.quantity}</p>
                  </Link>
                ))}
              </div>
            </Surface>
          )}

          {results.customers.length > 0 && (
            <Surface className="p-5">
              <div className="flex items-center gap-2 border-b border-border pb-4 mb-4">
                <UserIcon className="h-5 w-5 text-[var(--brand)]" />
                <h2 className="text-[15px] font-semibold text-text-primary">Customers</h2>
                <Badge variant="neutral" className="ml-2">{results.customers.length}</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {results.customers.map((customer) => (
                  <div key={customer.id} className="p-4 rounded-[18px] border border-border bg-surface-2">
                    <p className="font-semibold text-text-primary">{customer.name}</p>
                    <p className="mt-1 text-sm text-text-secondary">{customer.contactEmail || "No email"}</p>
                  </div>
                ))}
              </div>
            </Surface>
          )}

          {results.workers.length > 0 && (
            <Surface className="p-5">
              <div className="flex items-center gap-2 border-b border-border pb-4 mb-4">
                <Users className="h-5 w-5 text-[var(--brand)]" />
                <h2 className="text-[15px] font-semibold text-text-primary">Team Members</h2>
                <Badge variant="neutral" className="ml-2">{results.workers.length}</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {results.workers.map((worker) => (
                  <Link key={worker.id} href="/owner/users" className="block p-4 rounded-[18px] border border-border bg-surface-2 transition hover:border-brand/30 hover:bg-background">
                    <p className="font-semibold text-text-primary">{worker.name}</p>
                    <div className="mt-2 flex justify-between items-center">
                      <p className="text-xs text-text-secondary">{worker.role.replaceAll("_", " ")}</p>
                      <p className="text-xs font-mono text-text-tertiary">{worker.phone}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </Surface>
          )}

          {(results.designs?.length ?? 0) > 0 && (
            <Surface className="p-5">
              <div className="flex items-center gap-2 border-b border-border pb-4 mb-4">
                <ClipboardList className="h-5 w-5 text-[var(--brand)]" />
                <h2 className="text-[15px] font-semibold text-text-primary">Designs</h2>
                <Badge variant="neutral" className="ml-2">{results.designs!.length}</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {results.designs!.map((design) => (
                  <div key={design.id} className="p-4 rounded-[18px] border border-border bg-surface-2">
                    <p className="font-semibold text-text-primary">{design.name}</p>
                    <p className="mt-1 text-xs text-text-secondary uppercase tracking-wide">{design.category ?? "Uncategorised"}</p>
                  </div>
                ))}
              </div>
            </Surface>
          )}

          {(results.materials?.length ?? 0) > 0 && (
            <Surface className="p-5">
              <div className="flex items-center gap-2 border-b border-border pb-4 mb-4">
                <Factory className="h-5 w-5 text-[var(--brand)]" />
                <h2 className="text-[15px] font-semibold text-text-primary">Materials</h2>
                <Badge variant="neutral" className="ml-2">{results.materials!.length}</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {results.materials!.map((m) => (
                  <div key={m.id} className="p-4 rounded-[18px] border border-border bg-surface-2">
                    <p className="font-semibold text-text-primary">{m.name}</p>
                    <p className="mt-1 text-xs font-mono text-text-tertiary">{m.sku}</p>
                  </div>
                ))}
              </div>
            </Surface>
          )}

          {(results.dispatches?.length ?? 0) > 0 && (
            <Surface className="p-5">
              <div className="flex items-center gap-2 border-b border-border pb-4 mb-4">
                <ClipboardList className="h-5 w-5 text-[var(--brand)]" />
                <h2 className="text-[15px] font-semibold text-text-primary">Shipments</h2>
                <Badge variant="neutral" className="ml-2">{results.dispatches!.length}</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {results.dispatches!.map((d) => (
                  <Link key={d.id} href="/owner/logistics" className="block p-4 rounded-[18px] border border-border bg-surface-2 transition hover:border-brand/30 hover:bg-background">
                    <p className="font-semibold text-text-primary">{d.salesOrder?.soNumber}</p>
                    <p className="mt-1 text-xs text-text-secondary">{d.destinationType === "CUSTOMER" ? d.customerName ?? "Customer" : d.destinationWarehouse?.name}</p>
                    <Badge className={`mt-2 ${d.status === "DELIVERED" ? "bg-success-soft text-success" : "bg-brand-soft text-brand"}`}>{d.status.replace("_", " ")}</Badge>
                  </Link>
                ))}
              </div>
            </Surface>
          )}
        </div>
      )}
    </div>
  );
}
