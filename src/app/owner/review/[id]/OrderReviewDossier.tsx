"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Package, ListChecks, Layers, Boxes, Users, ClipboardCheck, CheckCircle2, XCircle,
  ChevronDown, ChevronRight, FileText, Calendar, Hash, Truck, User as UserIcon,
  Loader2, Lock,
} from "lucide-react";
import { Surface } from "@/components/design/Surface";
import { Select } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { reassignJobCard } from "@/server/actions/assignments";
import { cn } from "@/lib/utils";

// A complete order dossier for the review page: order, spec, materials and the
// per-department checklist trail (each department, the template it ran, and the
// checklist results captured on the floor). Presentational only — data comes
// from getOrderReview.

type ChecklistItem = { name: string; ok: boolean | null; remarks?: string | null; images?: string[] };

// One department row in the Assignments card. Completed stages are locked so
// finished history can't be rewritten; everything else is a live picker.
function AssignmentRow({ jc }: { jc: any }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [value, setValue] = useState<string>(jc.assignedTo?.id ?? "");

  const stageName = jc.department?.name ?? jc.stage?.name ?? `Step ${jc.sequence}`;
  const roster: any[] = jc.department?.members ?? [];
  const locked = jc.status === "COMPLETED";

  const change = async (next: string) => {
    const previous = value;
    setValue(next);
    setSaving(true);
    try {
      const res: any = await reassignJobCard(jc.id, next || null);
      if (res?.error) {
        setValue(previous);
        toast.error(res.error);
        return;
      }
      toast.success(next ? `${stageName} reassigned` : `${stageName} unassigned`);
      router.refresh();
    } catch (e: any) {
      setValue(previous);
      toast.error(e?.message ?? "Failed to reassign");
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-surface-2/40 px-3 py-2">
      <span className="text-xs font-semibold text-text-primary">{stageName}</span>
      {locked ? (
        <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
          <Lock className="h-3.5 w-3.5 text-text-tertiary" />
          {jc.assignedTo?.name ?? "Unassigned"}
        </span>
      ) : roster.length === 0 ? (
        <span className="inline-flex items-center gap-1.5 text-xs text-text-tertiary">
          <UserIcon className="h-3.5 w-3.5" />
          No one staffed in {stageName}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5">
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-text-tertiary" />}
          <Select
            className="h-8 w-auto min-w-[9rem] text-xs"
            value={value}
            disabled={saving}
            onChange={(e) => change(e.target.value)}
          >
            <option value="">Unassigned</option>
            {roster.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}{m.role === "SUPERVISOR" ? " (supervisor)" : ""}
              </option>
            ))}
          </Select>
        </span>
      )}
    </li>
  );
}

function statusTone(status: string): string {
  const s = (status || "").toUpperCase();
  if (["COMPLETED", "APPROVED", "READY", "DISPATCHED"].includes(s)) return "text-success bg-success/10 border-success/30";
  if (["REWORK_REQUIRED", "BLOCKED", "REJECTED", "ON_HOLD"].includes(s)) return "text-danger bg-danger/10 border-danger/30";
  if (["IN_PROGRESS", "QC_PENDING", "AWAITING_APPROVAL", "WAITING"].includes(s)) return "text-[var(--brand)] bg-[var(--brand)]/10 border-[var(--brand)]/30";
  return "text-text-secondary bg-surface-2 border-border";
}

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", className)}>{children}</span>;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-text-tertiary">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-text-primary">{value ?? "—"}</p>
    </div>
  );
}

function SectionCard({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Surface className="p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">{icon}</div>
        <div>
          <h3 className="text-sm font-bold text-text-primary">{title}</h3>
          {subtitle && <p className="text-[11px] text-text-tertiary">{subtitle}</p>}
        </div>
      </div>
      {children}
    </Surface>
  );
}

// Normalize a job card's captured results into a common checklist shape: QC
// cards from inspection submissions, other departments from their stage entry.
function checklistFor(jc: any): ChecklistItem[] {
  const subs = jc.inspection?.submissions ?? [];
  if (subs.length > 0) {
    return subs.map((s: any) => ({
      name: s.checkpoint?.name ?? "Checkpoint",
      ok: s.passFail == null ? null : /pass|ok|yes|true/i.test(String(s.passFail)),
      remarks: s.remarks,
      images: (s.evidences ?? []).map((e: any) => e.publicUrl).filter(Boolean),
    }));
  }
  const entry = (jc.stageEntries ?? [])[0];
  const raw = entry?.checklist;
  if (Array.isArray(raw)) {
    return raw.map((c: any) => ({ name: c.name ?? "Item", ok: c.ok ?? null, remarks: c.remarks, images: c.images ?? [] }));
  }
  return [];
}

function DeptRow({ jc, isQc }: { jc: any; isQc: boolean }) {
  const items = checklistFor(jc);
  const [open, setOpen] = useState(items.length > 0);
  const deptName = jc.department?.name ?? jc.stage?.name ?? `Step ${jc.sequence}`;
  const passed = items.filter((i) => i.ok === true).length;
  const failed = items.filter((i) => i.ok === false).length;

  return (
    <div className="rounded-xl border border-border/70 bg-surface-2/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        {open ? <ChevronDown className="h-4 w-4 text-text-tertiary" /> : <ChevronRight className="h-4 w-4 text-text-tertiary" />}
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-[11px] font-bold text-text-secondary">{jc.sequence}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-text-primary">{deptName}</span>
            {isQc && <Pill className="border-[var(--brand)]/30 bg-[var(--brand)]/10 text-[var(--brand)]">QC</Pill>}
          </div>
          <p className="mt-0.5 truncate text-[11px] text-text-tertiary">
            {jc.template?.name ? <span className="inline-flex items-center gap-1"><FileText className="h-3 w-3" />{jc.template.name}</span> : "No template"}
            {jc.assignedTo?.name ? <span> · {jc.assignedTo.name}</span> : ""}
          </p>
        </div>
        {items.length > 0 && (
          <span className="text-[11px] font-semibold text-text-tertiary">
            {passed > 0 && <span className="text-success">{passed}✓</span>}
            {failed > 0 && <span className="ml-1 text-danger">{failed}✗</span>}
          </span>
        )}
        <Pill className={statusTone(jc.status)}>{jc.status?.replace(/_/g, " ")}</Pill>
      </button>

      {open && (
        <div className="border-t border-border/60 px-4 py-3">
          {/* The QC walkthrough clip — whole-item evidence alongside the
              per-checkpoint photos. */}
          {isQc && jc.inspection?.videoUrl && (
            <div className="mb-3 overflow-hidden rounded-xl border border-border bg-black">
              <video
                src={jc.inspection.videoUrl}
                controls
                playsInline
                preload="metadata"
                className="h-auto w-full max-h-64"
              />
              <p className="bg-surface px-3 py-1.5 text-[11px] text-text-tertiary">
                QC walkthrough{jc.inspection.videoDurationSec ? ` · ${Math.round(jc.inspection.videoDurationSec)}s` : ""}
              </p>
            </div>
          )}
          {items.length === 0 ? (
            <p className="text-[11px] text-text-tertiary">No checklist captured for this department.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((it, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  {it.ok === true ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  ) : it.ok === false ? (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                  ) : (
                    <div className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-border" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-text-primary">{it.name}</p>
                    {it.remarks && <p className="text-[11px] text-text-tertiary">{it.remarks}</p>}
                    {it.images && it.images.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {it.images.map((src, k) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={k} src={src} alt="" className="h-14 w-14 rounded-lg border border-border object-cover" />
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function OrderReviewDossier({ review }: { review: any }) {
  const { order, spec, materials, jobCards, template } = review;
  const qty = (order.plans ?? []).reduce((s: number, p: any) => s + (p.quantity ?? 0), 0) || 1;
  const dispatched = (order.dispatches?.length ?? 0) > 0;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* Order details */}
      <SectionCard icon={<Package className="h-4 w-4" />} title="Order details" subtitle={order.soNumber}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Field label="Order #" value={<span className="inline-flex items-center gap-1"><Hash className="h-3 w-3 text-text-tertiary" />{order.soNumber}</span>} />
          <Field label="Status" value={<Pill className={statusTone(order.status)}>{order.status?.replace(/_/g, " ")}</Pill>} />
          <Field label="Customer" value={order.customer?.name} />
          <Field label="Phone" value={order.customer?.phone} />
          <Field label="Quantity" value={qty} />
          <Field label="Order date" value={<span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3 text-text-tertiary" />{new Date(order.orderDate).toLocaleDateString()}</span>} />
          {order.scheduledFor && <Field label="Scheduled for" value={new Date(order.scheduledFor).toLocaleDateString()} />}
          <Field label="Label code" value={order.labelCode} />
          {(order.fulfilledFromStockQty ?? 0) > 0 && <Field label="From stock" value={`${order.fulfilledFromStockQty} pc`} />}
          <Field label="Dispatch" value={dispatched ? <Pill className="border-success/30 bg-success/10 text-success"><Truck className="mr-1 h-3 w-3" />Dispatched</Pill> : "Not dispatched"} />
        </div>
        {order.remarks && (
          <div className="mt-4 rounded-lg border border-border/60 bg-surface-2/40 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-text-tertiary">Remarks</p>
            <p className="mt-0.5 text-xs text-text-secondary">{order.remarks}</p>
          </div>
        )}
      </SectionCard>

      {/* Spec details — the item's own fields, product-agnostic. */}
      <SectionCard icon={<ListChecks className="h-4 w-4" />} title="Specification" subtitle="What is being produced">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Field label="Product" value={spec.product} />
          {spec.specDetails.map((d: { label: string; value: string }) => (
            <Field key={d.label} label={d.label} value={d.value} />
          ))}
        </div>

        {/* Every picture the SKU carries: the product render plus whatever its
            referenced specs bring (fabric swatch, design artwork). */}
        {(spec.images ?? []).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {(spec.images as string[]).map((src) => (
              <a key={src} href={src} target="_blank" rel="noopener noreferrer">
                <img
                  src={src}
                  alt=""
                  className="h-20 w-20 rounded-lg border border-border object-cover transition hover:ring-2 hover:ring-[var(--brand)]/40"
                />
              </a>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Material details */}
      <SectionCard icon={<Boxes className="h-4 w-4" />} title="Materials (BOM)" subtitle={`${materials.length} item${materials.length === 1 ? "" : "s"} · for ${qty} pc`}>
        {materials.length === 0 ? (
          <p className="text-xs text-text-tertiary">No BOM defined for this variant yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-tertiary">
                  <th className="pb-2 font-semibold">Material</th>
                  <th className="pb-2 text-right font-semibold">Per unit</th>
                  <th className="pb-2 text-right font-semibold">Waste %</th>
                  <th className="pb-2 text-right font-semibold">Order total</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m: any, i: number) => (
                  <tr key={i} className="border-b border-border/40">
                    <td className="py-2 font-semibold text-text-primary">{m.name}{m.sku && <span className="ml-1 text-[10px] text-text-tertiary">{m.sku}</span>}</td>
                    <td className="py-2 text-right text-text-secondary">{m.perUnit} {m.uom}</td>
                    <td className="py-2 text-right text-text-secondary">{m.wastePercent || 0}%</td>
                    <td className="py-2 text-right font-semibold text-text-primary">{m.totalForOrder} {m.uom}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Assignments — editable: a stage can be handed to someone else at any
          time before it is completed. */}
      <SectionCard icon={<Users className="h-4 w-4" />} title="Assignments" subtitle="Who works each department — tap to reassign">
        <ul className="space-y-2">
          {jobCards.map((jc: any) => (
            <AssignmentRow key={jc.id} jc={jc} />
          ))}
        </ul>
        {order.inspector?.name && (
          <p className="mt-3 text-[11px] text-text-tertiary">QC inspector: <span className="font-semibold text-text-secondary">{order.inspector.name}</span></p>
        )}
      </SectionCard>

      {/* Department checklist trail */}
      <div className="lg:col-span-2">
        <SectionCard
          icon={<ClipboardCheck className="h-4 w-4" />}
          title="Department checklist trail"
          subtitle={`Every department this order passed through${template?.name ? ` · Template: ${template.name}` : ""}`}
        >
          <div className="space-y-2.5">
            {jobCards.map((jc: any) => (
              <DeptRow key={jc.id} jc={jc} isQc={!!(jc.department?.isQcStage || jc.stage?.isQcStage)} />
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
