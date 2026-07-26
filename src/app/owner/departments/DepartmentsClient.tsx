"use client";

import { useState } from "react";
import { confirmDialog } from "@/components/ui/dialog-service";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, X, Loader2, ChevronUp, ChevronDown, Users, ClipboardList, Trash2, Pencil, ShieldCheck, Camera, MessageSquare, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/design/PageHeader";
import { Surface } from "@/components/design/Surface";
import { Badge, Button, Input, Select, EmptyState } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import {
  createDepartment,
  updateDepartment,
  deleteDepartment,
  reorderDepartments,
  addDepartmentMember,
  removeDepartmentMember,
} from "@/server/actions/departments";

type Template = { id: string; name: string };
type Member = { id: string; name: string; role: string };
type Dept = any;
type UserRow = { id: string; name: string; role: string; departmentId: string | null };

const ROSTER_ROLES = ["WORKER", "SUPERVISOR"];

export function DepartmentsClient({ departments, users, templates }: { departments: Dept[]; users: UserRow[]; templates: Template[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<null | Dept | "new">(null);
  const [roster, setRoster] = useState<null | Dept>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const active = departments.filter((d) => d.active);
  const inactive = departments.filter((d) => !d.active);

  const run = async (id: string, fn: () => Promise<any>, okMsg?: string) => {
    setBusyId(id);
    try {
      const res: any = await fn();
      if (res?.error) { toast.error(res.error); return false; }
      if (okMsg) toast.success(res?.deactivated ? "Department deactivated (has history)" : okMsg);
      router.refresh();
      return true;
    } finally {
      setBusyId(null);
    }
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = [...active];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    run("reorder", () => reorderDepartments(next.map((d) => d.id)));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Production"
        title="Departments"
        description="Your production chain. Each department is a stage — reorder the flow, give it a checklist template, and staff it with workers and inspectors."
        actions={
          <Button onClick={() => setEditing("new")} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Department
          </Button>
        }
      />

      <Surface className="overflow-hidden p-0">
        <div className="border-b border-border px-5 py-3">
          <p className="text-sm font-semibold text-text-primary">Production chain <span className="font-normal text-text-tertiary">(top → bottom is the order work flows)</span></p>
        </div>
        {active.length === 0 ? (
          <div className="p-10"><EmptyState title="No departments yet" description="Add your first department to start the production chain." /></div>
        ) : (
          <ul className="divide-y divide-border/70">
            {active.map((d, i) => (
              <li key={d.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="flex flex-col">
                  <button onClick={() => move(i, -1)} disabled={i === 0 || busyId === "reorder"} className="text-text-tertiary hover:text-text-primary disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                  <button onClick={() => move(i, 1)} disabled={i === active.length - 1 || busyId === "reorder"} className="text-text-tertiary hover:text-text-primary disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand shrink-0">{i + 1}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-text-primary">{d.name}</span>
                    {d.isQcStage && <Badge className="bg-brand-soft text-brand gap-1"><ShieldCheck className="h-3 w-3" /> QC</Badge>}
                    {d.requiresApproval && <Badge className="bg-brand-soft text-brand gap-1"><ShieldCheck className="h-3 w-3" /> Approval</Badge>}
                    {d.requirePhoto && <Badge className="bg-brand-soft text-brand gap-1"><Camera className="h-3 w-3" /> Photo</Badge>}
                    {d.requireRemarks && <Badge className="bg-warning-soft text-warning gap-1"><MessageSquare className="h-3 w-3" /> Remarks</Badge>}
                    {d.template ? (
                      <Badge className="bg-success-soft text-success gap-1"><ClipboardList className="h-3 w-3" /> {d.template.name}</Badge>
                    ) : (
                      <Badge className="bg-surface-2 text-text-secondary">No template</Badge>
                    )}
                  </div>
                  {d.description && <p className="mt-0.5 text-xs text-text-secondary">{d.description}</p>}
                  <p className="mt-1 text-xs text-text-tertiary">
                    {d.members.length} member{d.members.length === 1 ? "" : "s"}
                    {d._count?.jobCards ? ` · ${d._count.jobCards} job cards` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" className="h-9 gap-1.5 text-xs" onClick={() => setRoster(d)}>
                    <Users className="h-3.5 w-3.5" /> Roster
                  </Button>
                  <Button variant="secondary" className="h-9 gap-1.5 text-xs" onClick={() => setEditing(d)}>
                    <Pencil className="h-3.5 w-3.5" /> Configure
                  </Button>
                  <button
                    onClick={async () => { if (await confirmDialog({ title: `Remove ${d.name}?`, variant: "danger", confirmLabel: "Delete" })) run(d.id, () => deleteDepartment(d.id), "Department removed"); }}
                    disabled={busyId === d.id}
                    className="text-text-tertiary hover:text-danger"
                    title="Remove department"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Surface>

      {inactive.length > 0 && (
        <Surface className="overflow-hidden p-0">
          <div className="border-b border-border px-5 py-3">
            <p className="text-sm font-semibold text-text-tertiary">Retired departments <span className="font-normal">(kept for history — not in the chain)</span></p>
          </div>
          <ul className="divide-y divide-border/70">
            {inactive.map((d) => (
              <li key={d.id} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm font-medium text-text-secondary">{d.name}<span className="ml-2 text-xs text-text-tertiary">{d._count?.jobCards ?? 0} job cards</span></span>
                <Button variant="secondary" className="h-8 text-xs" disabled={busyId === d.id} onClick={() => run(d.id, () => updateDepartment(d.id, { active: true }), "Department restored")}>
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        </Surface>
      )}

      {editing && (
        <DepartmentModal
          dept={editing === "new" ? null : editing}
          templates={templates}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); router.refresh(); }}
        />
      )}

      {roster && (
        <RosterModal
          dept={roster}
          users={users}
          onClose={() => setRoster(null)}
          onChanged={() => router.refresh()}
        />
      )}
    </div>
  );
}

function DepartmentModal({ dept, templates, onClose, onSaved }: { dept: Dept | null; templates: Template[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: dept?.name ?? "",
    description: dept?.description ?? "",
    isQcStage: dept?.isQcStage ?? false,
    requirePhoto: dept?.requirePhoto ?? false,
    requireRemarks: dept?.requireRemarks ?? false,
    requiresApproval: dept?.requiresApproval ?? false,
    templateId: dept?.templateId ?? "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        isQcStage: form.isQcStage,
        requirePhoto: form.requirePhoto,
        requireRemarks: form.requireRemarks,
        requiresApproval: form.requiresApproval,
        templateId: form.templateId || null,
      };
      const res: any = dept ? await updateDepartment(dept.id, payload) : await createDepartment(payload);
      if (res?.error) { toast.error(res.error); return; }
      toast.success(dept ? "Department updated" : "Department created");
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell title={dept ? "Configure department" : "New department"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 p-6">
        <Field label="Department Name *"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Description"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>

        <div className="space-y-2 rounded-[16px] border border-border bg-surface-2/40 p-4">
          <Toggle label="QC stage" hint="Runs the inspection/pass-fail flow instead of a stage checklist" checked={form.isQcStage} onChange={(v) => setForm({ ...form, isQcStage: v })} />
          <Toggle label="Requires supervisor approval" hint="A worker's submission waits for this department's supervisor to approve before the chain advances" checked={form.requiresApproval} onChange={(v) => setForm({ ...form, requiresApproval: v })} />
          <Toggle label="Require photo" hint="Worker must attach a photo to complete the stage" checked={form.requirePhoto} onChange={(v) => setForm({ ...form, requirePhoto: v })} />
          <Toggle label="Require remarks" hint="Worker must write remarks to complete the stage" checked={form.requireRemarks} onChange={(v) => setForm({ ...form, requireRemarks: v })} />
        </div>

        <Field label={form.isQcStage ? "QC Template" : "Checklist Template"}>
          <Select value={form.templateId} onChange={(e) => setForm({ ...form, templateId: e.target.value })}>
            <option value="">{form.isQcStage ? "Auto — resolve by product" : "No template"}</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          <p className="mt-1 text-[11px] text-text-tertiary">
            {form.isQcStage
              ? "Pick any of your templates to run this QC. Leave on “Auto” to use the product's QC template."
              : "The checklist a worker clears to complete this stage. Choose any template."}
          </p>
          <Link href="/owner/settings/qc-templates" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">
            Build or edit templates <ExternalLink className="h-3 w-3" />
          </Link>
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {dept ? "Save changes" : "Create department"}
          </Button>
        </div>
      </form>
    </Shell>
  );
}

function RosterModal({ dept, users, onClose, onChanged }: { dept: Dept; users: UserRow[]; onClose: () => void; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [addId, setAddId] = useState("");

  const members: Member[] = dept.members ?? [];
  const memberIds = new Set(members.map((m) => m.id));
  // Only workers/inspectors/supervisors are staffable, and only those not
  // already assigned to another department.
  const assignable = users.filter(
    (u) => ROSTER_ROLES.includes(u.role) && !memberIds.has(u.id) && (!u.departmentId || u.departmentId === dept.id)
  );

  const run = async (fn: () => Promise<any>, okMsg: string) => {
    setBusy(true);
    try {
      const res: any = await fn();
      if (res?.error) toast.error(res.error);
      else { toast.success(okMsg); onChanged(); }
    } finally { setBusy(false); }
  };

  return (
    <Shell title={`${dept.name} — roster`} onClose={onClose}>
      <div className="space-y-4 p-6">
        <div className="flex gap-2">
          <Select value={addId} onChange={(e) => setAddId(e.target.value)}>
            <option value="">Add a worker or inspector…</option>
            {assignable.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role.toLowerCase()})</option>)}
          </Select>
          <Button disabled={busy || !addId} onClick={() => run(async () => { const r = await addDepartmentMember(dept.id, addId); setAddId(""); return r; }, "Member added")}>
            Add
          </Button>
        </div>

        {members.length === 0 ? (
          <p className="text-sm text-text-tertiary">No one staffed here yet. Add workers and inspectors above.</p>
        ) : (
          <ul className="divide-y divide-border/70 rounded-[16px] border border-border">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text-primary">{m.name}</span>
                  <Badge className={m.role === "SUPERVISOR" ? "bg-brand-soft text-brand" : "bg-brand-soft text-brand"}>{m.role.toLowerCase()}</Badge>
                </div>
                <button onClick={() => run(() => removeDepartmentMember(m.id), "Member removed")} disabled={busy} className="text-text-tertiary hover:text-danger" title="Remove from department">
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-text-tertiary">A person belongs to one department. Their role (worker / inspector) decides what they do inside it.</p>
      </div>
    </Shell>
  );
}

function Shell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/35 backdrop-blur-md" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-lg overflow-hidden rounded-[26px] border border-border bg-surface shadow-[0_30px_100px_rgba(15,23,42,0.22)] max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-text-primary">{title}</h2>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-2 text-text-secondary transition hover:bg-surface" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">{label}</label>
      {children}
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5" />
      <span>
        <span className="block text-sm font-medium text-text-primary">{label}</span>
        <span className="block text-xs text-text-tertiary">{hint}</span>
      </span>
    </label>
  );
}
