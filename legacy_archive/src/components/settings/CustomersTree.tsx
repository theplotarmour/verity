"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { confirmDialog } from "@/components/ui/dialog-service";
import { Plus, Pencil, Loader2, X, Trash2, Building2, Phone } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { Button, Input, Select } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { listCustomers, createCustomer, updateCustomer, deleteCustomer, type CustomerInput } from "@/server/actions/customers";

// Customer Master as a studio sheet — same shape as the Item Master (ItemsTree):
// a searchable list with a side-drawer editor, add and delete. Master data only
// (contact, addresses, tags) — order history lives in Production, not here.

const TAG_OPTIONS = ["Retail", "Dealer", "OEM", "Internal"];

type Customer = any;

const emptyForm = (): CustomerInput & { id?: string } => ({
  id: undefined,
  name: "", companyName: "", phone: "", altPhone: "", email: "", gstNumber: "",
  billingAddress: "", shippingAddress: "", notes: "", tags: [], assignedSalesperson: "",
  creditLimit: 0, paymentTerms: "",
});
type Form = ReturnType<typeof emptyForm>;

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={cn("space-y-1.5", full && "sm:col-span-2")}>
      <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">{label}</label>
      {children}
    </div>
  );
}

export function CustomersTree({ query = "" }: { query?: string }) {
  const [mounted, setMounted] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setCustomers((await listCustomers()) ?? []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { setMounted(true); void load(); }, []);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => customers.filter((c) =>
    !q || [c.name, c.companyName, c.phone, c.customerCode, ...(c.tags ?? [])].filter(Boolean).some((s: string) => String(s).toLowerCase().includes(q))
  ), [customers, q]);

  const openNew = () => setDrawer(emptyForm());
  const openEdit = (c: Customer) => setDrawer({
    id: c.id, name: c.name ?? "", companyName: c.companyName ?? "", phone: c.phone ?? "", altPhone: c.altPhone ?? "",
    email: c.email ?? "", gstNumber: c.gstNumber ?? "", billingAddress: c.billingAddress ?? "", shippingAddress: c.shippingAddress ?? "",
    notes: c.notes ?? "", tags: c.tags ?? [], assignedSalesperson: c.assignedSalesperson ?? "",
    creditLimit: c.creditLimit ?? 0, paymentTerms: c.paymentTerms ?? "",
  });

  const del = async (c: Customer) => {
    if (!(await confirmDialog({ title: `Delete customer "${c.name}"?`, variant: "danger", confirmLabel: "Delete" }))) return;
    const res: any = await deleteCustomer(c.id);
    if (res?.error) { toast.error(res.error); return; }
    toast.success("Customer deleted");
    await load();
  };

  const toggleTag = (t: string) => setDrawer((d) => d ? { ...d, tags: (d.tags ?? []).includes(t) ? (d.tags ?? []).filter((x) => x !== t) : [...(d.tags ?? []), t] } : d);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drawer) return;
    if (!drawer.name.trim()) { toast.error("Customer name is required"); return; }
    setSaving(true);
    try {
      const { id, ...input } = drawer;
      const res: any = id ? await updateCustomer(id, input) : await createCustomer(input);
      if (res?.error) { toast.error(res.error); return; }
      toast.success(id ? "Customer updated" : "Customer created");
      setDrawer(null);
      await load();
    } finally { setSaving(false); }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Customers</h2>
          <p className="mt-0.5 text-xs text-text-tertiary">The customer master — retail, dealer, OEM and internal. Dealers are just tagged customers.</p>
        </div>
        <Button onClick={openNew} className="h-9 shrink-0 gap-1.5 text-xs"><Plus className="h-4 w-4" /> Customer</Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-text-tertiary"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-text-tertiary">{q ? "No matching customers." : "No customers yet. Add one above."}</p>
        ) : (
          <ul className="divide-y divide-border/50 rounded-xl border border-border/50">
            {filtered.map((c) => (
              <li key={c.id} className="group flex items-center gap-1 pr-2 hover:bg-surface-2/60">
                <button onClick={() => openEdit(c)} className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-sm font-medium text-text-primary">
                      {c.name}
                      {(c.tags ?? []).filter((t: string) => t && t !== "Retail").map((t: string) => (
                        <span key={t} className="rounded-full bg-brand-soft px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand-strong">{t}</span>
                      ))}
                    </p>
                    <p className="flex items-center gap-2 truncate text-[11px] text-text-tertiary">
                      {c.customerCode && <span className="font-mono">{c.customerCode}</span>}
                      {c.companyName && <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" />{c.companyName}</span>}
                      {c.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                      <span>· {c._count?.salesOrders ?? 0} orders</span>
                    </p>
                  </div>
                  <Pencil className="h-3.5 w-3.5 shrink-0 text-text-tertiary opacity-0 group-hover:opacity-100" />
                </button>
                <button type="button" onClick={() => del(c)} title="Delete customer" className="shrink-0 rounded-lg p-1.5 text-text-tertiary transition-colors hover:bg-danger/10 hover:text-danger">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {mounted && drawer && createPortal(
        <div className="fixed inset-0 z-[100] flex items-stretch justify-end bg-black/50 backdrop-blur-sm" onMouseDown={() => setDrawer(null)}>
          <form onMouseDown={(e) => e.stopPropagation()} onSubmit={save} className="flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand">Customer Master</p>
                <h3 className="text-lg font-bold text-text-primary">{drawer.id ? "Edit customer" : "New customer"}</h3>
              </div>
              <button type="button" onClick={() => setDrawer(null)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-2 text-text-secondary hover:bg-surface" aria-label="Close"><X className="h-4 w-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                <Field label="Name *"><Input value={drawer.name} onChange={(e) => setDrawer({ ...drawer, name: e.target.value })} placeholder="Customer name" /></Field>
                <Field label="Company"><Input value={drawer.companyName ?? ""} onChange={(e) => setDrawer({ ...drawer, companyName: e.target.value })} placeholder="Optional" /></Field>
                <Field label="Mobile"><Input type="tel" value={drawer.phone ?? ""} onChange={(e) => setDrawer({ ...drawer, phone: e.target.value })} placeholder="10-digit" /></Field>
                <Field label="Alternate Mobile"><Input type="tel" value={drawer.altPhone ?? ""} onChange={(e) => setDrawer({ ...drawer, altPhone: e.target.value })} placeholder="Optional" /></Field>
                <Field label="Email"><Input type="email" value={drawer.email ?? ""} onChange={(e) => setDrawer({ ...drawer, email: e.target.value })} placeholder="name@example.com" /></Field>
                <Field label="GSTIN"><Input value={drawer.gstNumber ?? ""} onChange={(e) => setDrawer({ ...drawer, gstNumber: e.target.value })} placeholder="GST number" /></Field>
                <Field label="Billing Address" full>
                  <textarea value={drawer.billingAddress ?? ""} onChange={(e) => setDrawer({ ...drawer, billingAddress: e.target.value })} rows={2}
                    className="w-full rounded-[12px] border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none focus:border-[var(--brand)]/70" />
                </Field>
                <Field label="Shipping Address" full>
                  <textarea value={drawer.shippingAddress ?? ""} onChange={(e) => setDrawer({ ...drawer, shippingAddress: e.target.value })} rows={2}
                    className="w-full rounded-[12px] border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none focus:border-[var(--brand)]/70" />
                </Field>

                <Field label="Tags" full>
                  <div className="flex flex-wrap gap-2">
                    {TAG_OPTIONS.map((t) => (
                      <button key={t} type="button" onClick={() => toggleTag(t)}
                        className={cn("rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all",
                          (drawer.tags ?? []).includes(t) ? "border-transparent bg-[var(--brand)] text-white" : "border-border bg-transparent text-text-secondary hover:bg-surface-2")}>
                        {t}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Assigned Salesperson"><Input value={drawer.assignedSalesperson ?? ""} onChange={(e) => setDrawer({ ...drawer, assignedSalesperson: e.target.value })} /></Field>
                <Field label="Credit Limit"><Input type="number" value={drawer.creditLimit ?? ""} onChange={(e) => setDrawer({ ...drawer, creditLimit: e.target.value === "" ? 0 : Number(e.target.value) })} placeholder="0" /></Field>
                <Field label="Payment Terms"><Input value={drawer.paymentTerms ?? ""} onChange={(e) => setDrawer({ ...drawer, paymentTerms: e.target.value })} placeholder="e.g. Net 30" /></Field>

                <Field label="Notes" full>
                  <textarea value={drawer.notes ?? ""} onChange={(e) => setDrawer({ ...drawer, notes: e.target.value })} rows={3}
                    className="w-full rounded-[12px] border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none focus:border-[var(--brand)]/70" />
                </Field>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
              <Button type="button" variant="secondary" onClick={() => setDrawer(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}{drawer.id ? "Save customer" : "Create customer"}</Button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
}
