"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import type { SiteStatus } from "@prisma/client";

import { PageHeader } from "@/components/design/PageHeader";
import { Button, EmptyState, Input } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/Dialog";
import { toast } from "@/components/ui/toast";
import { confirmDialog } from "@/components/ui/dialog-service";
import {
  Field,
  FilterPills,
  FormGrid,
  OptionalSelect,
  Select,
  Stat,
  StatStrip,
  StatusPill,
  TextArea,
  formatDay,
  humanise,
  toDateInput,
} from "@/components/service/kit";
import { createSite, deleteSite, updateSite } from "@/server/actions/sites";

export type SiteRow = {
  id: string;
  name: string;
  siteCode: string;
  address: string | null;
  city: string | null;
  state: string | null;
  status: SiteStatus;
  customerId: string | null;
  customerName: string | null;
  managerUserId: string | null;
  managerName: string | null;
  contractStart: string | null;
  contractEnd: string | null;
  slaHours: number | null;
  notes: string | null;
  activeStaff: number;
  openWorkOrders: number;
  openTickets: number;
  slaBreaches: number;
};

const STATUSES: SiteStatus[] = ["ACTIVE", "ON_HOLD", "TERMINATED"];

const BLANK = {
  name: "",
  address: "",
  city: "",
  state: "",
  customerId: "",
  status: "ACTIVE" as SiteStatus,
  managerUserId: "",
  contractStart: "",
  contractEnd: "",
  slaHours: "",
  notes: "",
};

/**
 * The site register.
 *
 * The three counts per row are the whole point: a site with no one deployed and
 * four open work orders is a problem you can see from the list, without opening
 * anything.
 */
export function SitesClient({
  sites,
  customers,
  managers,
}: {
  sites: SiteRow[];
  customers: { id: string; name: string; companyName?: string | null }[];
  managers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<SiteStatus | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sites.filter((s) => {
      if (status && s.status !== status) return false;
      if (!q) return true;
      return [s.name, s.siteCode, s.customerName, s.city, s.state, s.managerName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [sites, query, status]);

  const totals = useMemo(
    () => ({
      active: sites.filter((s) => s.status === "ACTIVE").length,
      staff: sites.reduce((sum, s) => sum + s.activeStaff, 0),
      work: sites.reduce((sum, s) => sum + s.openWorkOrders + s.openTickets, 0),
      breaches: sites.reduce((sum, s) => sum + s.slaBreaches, 0),
    }),
    [sites],
  );

  function open(row?: SiteRow) {
    setEditing(row?.id ?? "");
    setForm(
      row
        ? {
            name: row.name,
            address: row.address ?? "",
            city: row.city ?? "",
            state: row.state ?? "",
            customerId: row.customerId ?? "",
            status: row.status,
            managerUserId: row.managerUserId ?? "",
            contractStart: toDateInput(row.contractStart),
            contractEnd: toDateInput(row.contractEnd),
            slaHours: row.slaHours != null ? String(row.slaHours) : "",
            notes: row.notes ?? "",
          }
        : BLANK,
    );
  }

  async function remove(row: SiteRow) {
    const ok = await confirmDialog({
      title: `Delete ${row.name}?`,
      description:
        "Only a site with no tickets, work orders or invoices can be deleted. Otherwise set it to Terminated.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    start(async () => {
      const result = await deleteSite(row.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Site deleted.");
      router.refresh();
    });
  }

  function submit() {
    if (!form.name.trim()) {
      toast.error("A site name is required.");
      return;
    }
    const slaHours = form.slaHours.trim() === "" ? null : Number(form.slaHours);
    if (slaHours !== null && (!Number.isFinite(slaHours) || slaHours < 0)) {
      toast.error("SLA hours must be a positive number.");
      return;
    }

    const payload = {
      name: form.name,
      address: form.address || null,
      city: form.city || null,
      state: form.state || null,
      customerId: form.customerId || null,
      status: form.status,
      managerUserId: form.managerUserId || null,
      contractStart: form.contractStart || null,
      contractEnd: form.contractEnd || null,
      slaHours,
      notes: form.notes || null,
    };

    start(async () => {
      const result = editing ? await updateSite(editing, payload) : await createSite(payload);
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(editing ? "Site updated." : "Site created.");
      setEditing(null);
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <PageHeader
        eyebrow="Service"
        title="Sites"
        description="Every client location, who is posted there, and what work is outstanding."
        actions={
          <Button onClick={() => open()}>
            <Plus className="h-4 w-4" />
            New site
          </Button>
        }
      />

      <StatStrip>
        <Stat label="Active sites" value={totals.active} tone="success" />
        <Stat label="Staff deployed" value={totals.staff} tone="brand" />
        <Stat label="Open work" value={totals.work} />
        <Stat label="SLA breaches" value={totals.breaches} tone={totals.breaches ? "danger" : "success"} />
      </StatStrip>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterPills options={STATUSES} value={status} onChange={setStatus} />
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder="Search sites..."
            className="pl-9"
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          title="No sites yet"
          description={
            sites.length === 0
              ? "Add the first client location and staff can be deployed to it."
              : "No site matches that filter."
          }
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto rounded-[16px] border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-border bg-surface-2">
              <tr className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                <th className="px-4 py-3">Site</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Manager</th>
                <th className="px-4 py-3 text-right">Staff</th>
                <th className="px-4 py-3 text-right">Open work</th>
                <th className="px-4 py-3">SLA</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-surface-2/60">
                  <td className="px-4 py-3">
                    <Link href={`/owner/sites/${s.id}`} className="block min-w-0">
                      <span className="font-mono text-[11px] font-semibold text-text-tertiary">
                        {s.siteCode}
                      </span>
                      <span className="block truncate font-semibold text-text-primary">{s.name}</span>
                      {s.city ? (
                        <span className="text-[11px] text-text-tertiary">
                          {[s.city, s.state].filter(Boolean).join(", ")}
                        </span>
                      ) : null}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{s.customerName ?? "—"}</td>
                  <td className="px-4 py-3 text-text-secondary">{s.managerName ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-mono text-text-primary">
                    {s.activeStaff}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-text-primary">
                    {s.openWorkOrders + s.openTickets}
                  </td>
                  <td className="px-4 py-3">
                    {s.slaBreaches > 0 ? (
                      <span className="text-xs font-semibold text-danger">
                        {s.slaBreaches} breached
                      </span>
                    ) : s.slaHours ? (
                      <span className="text-xs text-text-secondary">{s.slaHours}h</span>
                    ) : (
                      <span className="text-xs text-text-tertiary">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={s.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => open(s)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger"
                        onClick={() => remove(s)}
                        disabled={pending}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog isOpen={editing !== null} onClose={() => setEditing(null)} className="max-w-2xl">
        <h2 className="text-[17px] font-semibold tracking-[-0.03em] text-text-primary">
          {editing ? "Edit site" : "New site"}
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          The SLA window here becomes the deadline on every ticket and work order raised at this site.
        </p>

        <div className="mt-5 max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          <Field label="Site name">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.currentTarget.value })}
              placeholder="DLF Tower — Block A"
            />
          </Field>

          <Field label="Address">
            <TextArea
              rows={2}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.currentTarget.value })}
            />
          </Field>

          <FormGrid>
            <Field label="City">
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.currentTarget.value })}
              />
            </Field>
            <Field label="State">
              <Input
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.currentTarget.value })}
              />
            </Field>

            <Field label="Client">
              <OptionalSelect
                value={form.customerId}
                onChange={(v) => setForm({ ...form, customerId: v })}
                placeholder="No client"
                options={customers.map((c) => ({ value: c.id, label: c.companyName ?? c.name }))}
              />
            </Field>

            <Field label="Site manager">
              <OptionalSelect
                value={form.managerUserId}
                onChange={(v) => setForm({ ...form, managerUserId: v })}
                placeholder="Unassigned"
                options={managers.map((m) => ({ value: m.id, label: m.name }))}
              />
            </Field>

            <Field label="Contract start">
              <Input
                type="date"
                value={form.contractStart}
                onChange={(e) => setForm({ ...form, contractStart: e.currentTarget.value })}
              />
            </Field>

            <Field label="Contract end">
              <Input
                type="date"
                value={form.contractEnd}
                onChange={(e) => setForm({ ...form, contractEnd: e.currentTarget.value })}
              />
            </Field>

            <Field label="SLA response (hours)" hint="Leave blank if this site has no SLA.">
              <Input
                type="number"
                min={0}
                value={form.slaHours}
                onChange={(e) => setForm({ ...form, slaHours: e.currentTarget.value })}
                placeholder="24"
              />
            </Field>

            <Field label="Status">
              <Select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.currentTarget.value as SiteStatus })}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {humanise(s)}
                  </option>
                ))}
              </Select>
            </Field>
          </FormGrid>

          <Field label="Notes">
            <TextArea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.currentTarget.value })}
            />
          </Field>

          {editing ? (
            <p className="text-[11px] text-text-tertiary">
              Contract runs {formatDay(form.contractStart || null)} to{" "}
              {formatDay(form.contractEnd || null)}.
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setEditing(null)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Saving..." : editing ? "Save changes" : "Create site"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
