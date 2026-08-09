"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { createCustomer, updateCustomer, deleteCustomer } from "@/server/actions/customers";
import { confirmDialog } from "@/components/ui/dialog-service";
import { importCustomersCsv } from "@/server/actions/customers";
import { toast } from "@/components/ui/toast";

export type CustomerRow = {
  id: string;
  customerCode: string | null;
  name: string;
  companyName: string | null;
  phone: string | null;
  email: string | null;
  gstNumber: string | null;
  altPhone: string | null;
  billingAddress: string | null;
  shippingAddress: string | null;
  notes: string | null;
  tags: string[];
  paymentTerms: string | null;
  /** Live order counters, so the book shows who is actually active. */
  activeOrders?: number;
  totalOrders?: number;
};

const BLANK = {
  name: "",
  companyName: "",
  phone: "",
  email: "",
  gstNumber: "",
  altPhone: "",
  billingAddress: "",
  shippingAddress: "",
  notes: "",
  tags: "",
  paymentTerms: "",
};

/**
 * Customers, on their own screen.
 *
 * They used to be managed as a tab in the Master Data Studio, which meant the
 * studio needed a `domainType` marker and a pile of branches to stop item-shaped
 * actions — delete, CSV import, inline cell edit — from firing at a table that
 * is not ItemMaster. A customer is a counterparty, not a thing the factory
 * makes; giving it its own screen is what lets the studio become uniform.
 *
 * Suppliers already live in Purchase, warehouses in Settings and staff in Team.
 * This was the last one without a home.
 */
export function CustomersClient({ customers }: { customers: CustomerRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [query, setQuery] = useState("");
  // null = closed. An id = editing that one; "" = creating.
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK);

  const q = query.trim().toLowerCase();
  const shown = q
    ? customers.filter((c) =>
        [c.name, c.companyName, c.phone, c.email, c.customerCode, c.gstNumber]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      )
    : customers;

  function open(row?: CustomerRow) {
    setEditing(row?.id ?? "");
    setForm(
      row
        ? {
            name: row.name,
            companyName: row.companyName ?? "",
            phone: row.phone ?? "",
            email: row.email ?? "",
            gstNumber: row.gstNumber ?? "",
            altPhone: row.altPhone ?? "",
            billingAddress: row.billingAddress ?? "",
            shippingAddress: row.shippingAddress ?? "",
            notes: row.notes ?? "",
            tags: (row.tags ?? []).join(", "),
            paymentTerms: row.paymentTerms ?? "",
          }
        : BLANK
    );
  }

  const CSV_HEADERS = [
    "Code", "Name", "Company", "Phone", "Alternate Phone", "Email",
    "GST", "Billing Address", "Shipping Address", "Tags", "Payment Terms", "Notes",
  ];

  const downloadCsv = (rows: Record<string, string>[], filename: string) => {
    const blob = new Blob([Papa.unparse(rows, { columns: CSV_HEADERS })], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    if (customers.length === 0) {
      // An empty export is a blank file the owner then has to guess the shape
      // of; the sample carries the headers instead.
      downloadCsv(
        [{ Code: "CUST-001", Name: "Sharma Auto", Company: "Sharma Auto Pvt Ltd", Phone: "9810000001",
           "Alternate Phone": "", Email: "", GST: "", "Billing Address": "", "Shipping Address": "",
           Tags: "DEALER", "Payment Terms": "30 days", Notes: "" }],
        "Verity_customers_sample.csv"
      );
      toast.success("No customers yet — downloaded a sample sheet instead");
      return;
    }
    downloadCsv(
      customers.map((c) => ({
        Code: c.customerCode ?? "", Name: c.name, Company: c.companyName ?? "",
        Phone: c.phone ?? "", "Alternate Phone": c.altPhone ?? "", Email: c.email ?? "",
        GST: c.gstNumber ?? "", "Billing Address": c.billingAddress ?? "",
        "Shipping Address": c.shippingAddress ?? "", Tags: (c.tags ?? []).join(", "),
        "Payment Terms": c.paymentTerms ?? "", Notes: c.notes ?? "",
      })),
      "Verity_customers.csv"
    );
  };

  const importCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        start(async () => {
          const res: any = await importCustomersCsv(results.data as any[]);
          if (res?.error) { toast.error(res.error); return; }
          const parts = [`${res.created} added`, `${res.updated} updated`];
          if (res.failures?.length) parts.push(`${res.failures.length} failed`);
          toast.success(parts.join(" · "));
          router.refresh();
        });
      },
    });
    e.target.value = "";
  };

  function save() {
    if (!form.name.trim()) {
      toast.error("A customer needs a name");
      return;
    }
    // Tags are typed as a comma-separated line and stored as an array.
    const payload = {
      ...form,
      tags: form.tags.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean),
    };
    start(async () => {
      const result = editing
        ? await updateCustomer(editing, payload)
        : await createCustomer(payload);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(editing ? "Customer updated" : "Customer added");
      setEditing(null);
      router.refresh();
    });
  }

  async function remove(row: CustomerRow) {
    const ok = await confirmDialog({
      title: `Delete ${row.name}?`,
      description:
        "A customer with orders against them cannot be deleted — you will be told if so.",
      variant: "danger",
      confirmLabel: "Delete customer",
    });
    if (!ok) return;
    start(async () => {
      const result = await deleteCustomer(row.id);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${row.name} deleted`);
      router.refresh();
    });
  }

  const control =
    "h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-text-primary outline-none focus:ring-1 focus:ring-[var(--brand)]";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-[var(--brand)]">
          <Users className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-text-primary">Customers</h1>
          <p className="text-[11px] text-text-secondary">
            {customers.length} on record. Orders are booked against these.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="h-9 rounded-xl border border-border px-3 text-xs font-bold text-text-secondary transition hover:bg-surface-secondary"
          >
            Export CSV
          </button>
          <label className="h-9 cursor-pointer rounded-xl border border-border px-3 text-xs font-bold leading-9 text-text-secondary transition hover:bg-surface-secondary">
            Import CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={importCsv} />
          </label>
          <button
            type="button"
            onClick={() => open()}
            className="h-9 rounded-xl bg-[var(--brand)] px-4 text-xs font-bold text-white transition hover:opacity-90"
          >
            + Add customer
          </button>
        </div>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search name, company, phone, GST…"
        className={`${control} max-w-md`}
      />

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-surface-secondary/40 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Code</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Company</th>
              <th className="px-3 py-2 font-medium">Phone</th>
              <th className="px-3 py-2 font-medium">GST</th>
              <th className="px-3 py-2 font-medium">Tags</th>
              <th className="px-3 py-2 text-center font-medium">Orders</th>
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((c) => (
              <tr key={c.id} className="border-t border-border hover:bg-surface-secondary/30">
                <td className="px-3 py-2 font-mono text-xs text-text-tertiary">{c.customerCode}</td>
                <td className="px-3 py-2 font-medium text-text-primary">{c.name}</td>
                <td className="px-3 py-2 text-text-secondary">{c.companyName}</td>
                <td className="px-3 py-2 text-text-secondary">{c.phone}</td>
                <td className="px-3 py-2 text-text-secondary">{c.gstNumber}</td>
                <td className="px-3 py-2">
                  <span className="flex flex-wrap gap-1">
                    {(c.tags ?? []).map((t) => (
                      <span key={t} className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-[var(--brand)]">
                        {t}
                      </span>
                    ))}
                  </span>
                </td>
                {/* Active out of total, so a glance says who is running work now. */}
                <td className="whitespace-nowrap px-3 py-2 text-center text-text-secondary">
                  <span className={(c.activeOrders ?? 0) > 0 ? "font-bold text-[var(--brand)]" : ""}>
                    {c.activeOrders ?? 0}
                  </span>
                  <span className="text-text-tertiary"> / {c.totalOrders ?? 0}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  {(c.totalOrders ?? 0) > 0 && (
                    <Link
                      href={`/owner/production?search=${encodeURIComponent(c.name)}`}
                      className="mr-3 text-xs text-[var(--brand)] hover:underline"
                    >
                      View orders
                    </Link>
                  )}
                  <button
                    onClick={() => open(c)}
                    className="mr-3 text-xs text-text-secondary hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(c)}
                    disabled={pending}
                    className="text-xs text-danger hover:underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-text-tertiary">
                  {customers.length === 0
                    ? "No customers yet. Add the first one above."
                    : "Nothing matches that search."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={editing ? "Edit customer" : "Add customer"}
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
        >
          <div className="max-h-[90dvh] w-full max-w-lg overflow-auto rounded-2xl border border-border bg-surface p-5 shadow-2xl">
            <h2 className="mb-4 text-base font-bold text-text-primary">
              {editing ? "Edit customer" : "Add customer"}
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["name", "Name", true],
                  ["companyName", "Company", false],
                  ["phone", "Phone", false],
                  ["altPhone", "Alternate phone", false],
                  ["email", "Email", false],
                  ["gstNumber", "GST number", false],
                  ["paymentTerms", "Payment terms", false],
                ] as const
              ).map(([key, label, required]) => (
                <label key={key} className="block">
                  <span className="mb-1 block text-xs font-medium text-text-secondary">
                    {label}
                    {required && <span className="ml-0.5 text-danger">*</span>}
                  </span>
                  <input
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className={control}
                  />
                </label>
              ))}
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-text-secondary">
                  Billing address
                </span>
                <textarea
                  value={form.billingAddress}
                  onChange={(e) => setForm((f) => ({ ...f, billingAddress: e.target.value }))}
                  rows={2}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:ring-1 focus:ring-[var(--brand)]"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-text-secondary">Shipping address</span>
                  {/* Most customers ship where they are billed; typing it twice
                      is how the two quietly drift apart. */}
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-text-tertiary">
                    <input
                      type="checkbox"
                      checked={!!form.billingAddress && form.shippingAddress === form.billingAddress}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, shippingAddress: e.target.checked ? f.billingAddress : "" }))
                      }
                      className="accent-[var(--brand)]"
                    />
                    Same as billing
                  </span>
                </span>
                <textarea
                  value={form.shippingAddress}
                  onChange={(e) => setForm((f) => ({ ...f, shippingAddress: e.target.value }))}
                  rows={2}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:ring-1 focus:ring-[var(--brand)]"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-text-secondary">
                  Tags <span className="text-text-tertiary">comma separated — DEALER, OEM, RETAIL</span>
                </span>
                <input
                  value={form.tags}
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                  placeholder="DEALER, PRIORITY"
                  className={control}
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-text-secondary">
                  Internal notes <span className="text-text-tertiary">not shown to the customer</span>
                </span>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Gate pass needed. Deliver before 4pm."
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:ring-1 focus:ring-[var(--brand)]"
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                className="h-9 rounded-xl border border-border px-4 text-xs font-bold text-text-secondary"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={pending}
                className="h-9 rounded-xl bg-[var(--brand)] px-4 text-xs font-bold text-white disabled:opacity-50"
              >
                {pending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
