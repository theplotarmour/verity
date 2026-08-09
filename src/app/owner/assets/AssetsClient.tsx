"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import type { AssetStatus } from "@prisma/client";

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
  formatMoney,
  humanise,
  toDateInput,
} from "@/components/service/kit";
import { createAsset, deleteAsset, updateAsset } from "@/server/actions/assets";

export type AssetRow = {
  id: string;
  assetCode: string;
  name: string;
  category: string | null;
  serialNumber: string | null;
  manufacturer: string | null;
  model: string | null;
  status: AssetStatus;
  siteId: string | null;
  siteName: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  location: string | null;
  purchaseDate: string | null;
  purchaseCost: number;
  warrantyUntil: string | null;
  notes: string | null;
  maintenanceCount: number;
  nextDueAt: string | null;
  maintenanceOverdue: boolean;
  underWarranty: boolean;
};

const STATUSES: AssetStatus[] = ["ACTIVE", "IN_REPAIR", "IDLE", "RETIRED", "DISPOSED"];

const BLANK = {
  name: "",
  category: "",
  serialNumber: "",
  manufacturer: "",
  model: "",
  status: "ACTIVE" as AssetStatus,
  siteId: "",
  assignedToId: "",
  location: "",
  purchaseDate: "",
  purchaseCost: "",
  warrantyUntil: "",
  notes: "",
};

export function AssetsClient({
  assets,
  sites,
  holders,
  stats,
}: {
  assets: AssetRow[];
  sites: { id: string; name: string; siteCode: string }[];
  holders: { id: string; name: string }[];
  stats: { active: number; inRepair: number; overdue: number; totalValue: number } | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<AssetStatus | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = assets.filter((a) => {
      if (status && a.status !== status) return false;
      if (!q) return true;
      return [a.assetCode, a.name, a.category, a.serialNumber, a.manufacturer, a.model, a.siteName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
    // Overdue maintenance floats to the top: the register is a to-do list
    // before it is an inventory.
    return [...filtered].sort((a, b) => {
      if (a.maintenanceOverdue !== b.maintenanceOverdue) return a.maintenanceOverdue ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [assets, query, status]);

  function open(row?: AssetRow) {
    setEditing(row?.id ?? "");
    setForm(
      row
        ? {
            name: row.name,
            category: row.category ?? "",
            serialNumber: row.serialNumber ?? "",
            manufacturer: row.manufacturer ?? "",
            model: row.model ?? "",
            status: row.status,
            siteId: row.siteId ?? "",
            assignedToId: row.assignedToId ?? "",
            location: row.location ?? "",
            purchaseDate: toDateInput(row.purchaseDate),
            purchaseCost: String(row.purchaseCost || ""),
            warrantyUntil: toDateInput(row.warrantyUntil),
            notes: row.notes ?? "",
          }
        : BLANK,
    );
  }

  async function remove(row: AssetRow) {
    const ok = await confirmDialog({
      title: `Delete ${row.name}?`,
      description:
        "An asset with maintenance history cannot be deleted — set it to Disposed so the cost record survives.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    start(async () => {
      const result = await deleteAsset(row.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Asset deleted.");
      router.refresh();
    });
  }

  function submit() {
    if (!form.name.trim()) {
      toast.error("An asset name is required.");
      return;
    }
    const payload = {
      name: form.name,
      category: form.category || null,
      serialNumber: form.serialNumber || null,
      manufacturer: form.manufacturer || null,
      model: form.model || null,
      status: form.status,
      siteId: form.siteId || null,
      assignedToId: form.assignedToId || null,
      location: form.location || null,
      purchaseDate: form.purchaseDate || null,
      purchaseCost: Number(form.purchaseCost) || 0,
      warrantyUntil: form.warrantyUntil || null,
      notes: form.notes || null,
    };

    start(async () => {
      const result = editing ? await updateAsset(editing, payload) : await createAsset(payload);
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(editing ? "Asset updated." : "Asset added.");
      setEditing(null);
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <PageHeader
        eyebrow="Operations"
        title="Assets"
        description="The register of everything the business owns and has to keep running."
        actions={
          <Button onClick={() => open()}>
            <Plus className="h-4 w-4" />
            New asset
          </Button>
        }
      />

      {stats ? (
        <StatStrip>
          <Stat label="Active" value={stats.active} tone="success" />
          <Stat label="In repair" value={stats.inRepair} tone="warning" />
          <Stat
            label="Maintenance overdue"
            value={stats.overdue}
            tone={stats.overdue ? "danger" : "success"}
          />
          <Stat label="Book value" value={formatMoney(stats.totalValue)} />
        </StatStrip>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterPills options={STATUSES} value={status} onChange={setStatus} />
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder="Search assets..."
            className="pl-9"
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          title="No assets"
          description={
            assets.length === 0
              ? "Add the first piece of equipment to start tracking its service history."
              : "No asset matches that filter."
          }
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto rounded-[16px] border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-border bg-surface-2">
              <tr className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                <th className="px-4 py-3">Asset</th>
                <th className="px-4 py-3">Where</th>
                <th className="px-4 py-3">Held by</th>
                <th className="px-4 py-3">Next service</th>
                <th className="px-4 py-3 text-right">Cost</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.map((a) => (
                <tr key={a.id} className="transition-colors hover:bg-surface-2/60">
                  <td className="px-4 py-3">
                    <Link href={`/owner/assets/${a.id}`} className="block min-w-0">
                      <span className="font-mono text-[11px] font-semibold text-text-tertiary">
                        {a.assetCode}
                      </span>
                      <span className="block truncate font-semibold text-text-primary">{a.name}</span>
                      <span className="text-[11px] text-text-tertiary">
                        {[a.manufacturer, a.model, a.category].filter(Boolean).join(" · ") || "—"}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    <span className="block truncate">{a.siteName ?? a.location ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{a.assignedToName ?? "—"}</td>
                  <td className="px-4 py-3">
                    {a.nextDueAt ? (
                      <span
                        className={
                          a.maintenanceOverdue
                            ? "text-xs font-semibold text-danger"
                            : "text-xs text-text-secondary"
                        }
                      >
                        {formatDay(a.nextDueAt)}
                        {a.maintenanceOverdue ? " · overdue" : ""}
                      </span>
                    ) : (
                      <span className="text-xs text-text-tertiary">No schedule</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-text-secondary">
                    {formatMoney(a.purchaseCost)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={a.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => open(a)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger"
                        onClick={() => remove(a)}
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
          {editing ? "Edit asset" : "New asset"}
        </h2>

        <div className="mt-5 max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          <FormGrid>
            <Field label="Name">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.currentTarget.value })}
                placeholder="250 kVA generator"
              />
            </Field>
            <Field label="Category">
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.currentTarget.value })}
                placeholder="Power, HVAC, Vehicle"
              />
            </Field>
            <Field label="Manufacturer">
              <Input
                value={form.manufacturer}
                onChange={(e) => setForm({ ...form, manufacturer: e.currentTarget.value })}
              />
            </Field>
            <Field label="Model">
              <Input
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.currentTarget.value })}
              />
            </Field>
            <Field label="Serial number">
              <Input
                value={form.serialNumber}
                onChange={(e) => setForm({ ...form, serialNumber: e.currentTarget.value })}
              />
            </Field>
            <Field label="Status">
              <Select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.currentTarget.value as AssetStatus })}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {humanise(s)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Site"
              hint={sites.length === 0 ? "Enable the Sites module to place assets." : undefined}
            >
              <OptionalSelect
                value={form.siteId}
                onChange={(v) => setForm({ ...form, siteId: v })}
                placeholder="No site"
                disabled={sites.length === 0}
                options={sites.map((s) => ({ value: s.id, label: `${s.name} (${s.siteCode})` }))}
              />
            </Field>
            <Field label="Held by">
              <OptionalSelect
                value={form.assignedToId}
                onChange={(v) => setForm({ ...form, assignedToId: v })}
                placeholder="Nobody"
                options={holders.map((h) => ({ value: h.id, label: h.name }))}
              />
            </Field>
            <Field label="Location note">
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.currentTarget.value })}
                placeholder="Basement plant room"
              />
            </Field>
            <Field label="Purchase date">
              <Input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => setForm({ ...form, purchaseDate: e.currentTarget.value })}
              />
            </Field>
            <Field label="Purchase cost">
              <Input
                type="number"
                min={0}
                value={form.purchaseCost}
                onChange={(e) => setForm({ ...form, purchaseCost: e.currentTarget.value })}
              />
            </Field>
            <Field label="Warranty until">
              <Input
                type="date"
                value={form.warrantyUntil}
                onChange={(e) => setForm({ ...form, warrantyUntil: e.currentTarget.value })}
              />
            </Field>
          </FormGrid>

          <Field label="Notes">
            <TextArea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.currentTarget.value })}
            />
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setEditing(null)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Saving..." : editing ? "Save changes" : "Add asset"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
