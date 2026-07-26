"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Camera, CheckCircle2, Loader2, Lock, PauseCircle,
  AlertTriangle, X, Pencil,
} from "lucide-react";
import { Button, Input, Badge } from "@/components/ui/primitives";
import { Surface } from "@/components/design/Surface";
import { toast } from "@/components/ui/toast";
import { promptDialog } from "@/components/ui/dialog-service";
import { startStage, holdStage, completeStage, approveStageCard, rejectStageCard } from "@/server/actions/stages";
import { OrderSpecCard } from "@/components/factory/OrderSpecCard";
import { cn } from "@/lib/utils";

type StageImage = { dataUrl: string; fileName: string; contentType: string; size: number };

type ChecklistState = Record<string, { ok: boolean; remarks: string; images: StageImage[] }>;

export default function StageClient({ data }: { data: any }) {
  const router = useRouter();
  const { job, stage, template, entries, siblings, canApprove, viewerId } = data;
  const homePath = data.homePath || "/worker";

  // Flattened checkpoints from the department's stage template (if any).
  const checkpoints: any[] = (template?.sections ?? []).flatMap((s: any) => s.checkpoints ?? []);

  // Optimistically updated by the actions below, then reconciled with the server
  // after each router.refresh() — without this the screen kept whatever status it
  // mounted with, so a hold/approval elsewhere never showed up.
  const [status, setStatus] = useState<string>(job.status);
  useEffect(() => { setStatus(job.status); }, [job.status]);
  // Set when the worker reopens an already-submitted response to amend it.
  const [editing, setEditing] = useState(false);
  const [beforeImages, setBeforeImages] = useState<StageImage[]>([]);
  const [afterImages, setAfterImages] = useState<StageImage[]>([]);
  const [measurements, setMeasurements] = useState("");
  const [materialNotes, setMaterialNotes] = useState("");
  const [remarks, setRemarks] = useState("");
  const [checklist, setChecklist] = useState<ChecklistState>({});
  const [busy, setBusy] = useState(false);

  const cpState = (id: string) => checklist[id] ?? { ok: false, remarks: "", images: [] };
  const updateCp = (id: string, patch: Partial<{ ok: boolean; remarks: string; images: StageImage[] }>) =>
    setChecklist((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { ok: false, remarks: "", images: [] }), ...patch } }));
  const addCpImage = (id: string, img: StageImage) =>
    setChecklist((prev) => {
      const cur = prev[id] ?? { ok: false, remarks: "", images: [] };
      return { ...prev, [id]: { ...cur, images: [...cur.images, img] } };
    });
  const removeCpImage = (id: string, idx: number) =>
    setChecklist((prev) => {
      const cur = prev[id] ?? { ok: false, remarks: "", images: [] };
      return { ...prev, [id]: { ...cur, images: cur.images.filter((_, i) => i !== idx) } };
    });

  const beforeInputRef = useRef<HTMLInputElement | null>(null);
  const afterInputRef = useRef<HTMLInputElement | null>(null);

  const readFiles = (files: FileList | null, setter: (updater: (prev: StageImage[]) => StageImage[]) => void) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = () => {
        setter((prev) => [...prev, {
          dataUrl: String(reader.result),
          fileName: file.name,
          contentType: file.type || "image/jpeg",
          size: file.size,
        }]);
      };
      reader.readAsDataURL(file);
    }
  };

  // Opening this screen IS the intent to work on the card, so it starts itself
  // instead of making the worker tap "Start" first. Best-effort: it only stamps
  // startedAt and flips the card to IN_PROGRESS for the floor view — the server
  // accepts a completion straight from WAITING too, so a failure here never
  // blocks the worker. BLOCKED cards are excluded (they render a locked state).
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current) return;
    if (!["WAITING", "ON_HOLD", "REWORK_REQUIRED"].includes(status)) return;
    autoStarted.current = true;
    void (async () => {
      const res: any = await startStage(job.id);
      // A real refusal (e.g. a production scheduled for a later date) is worth
      // showing; the card simply stays where it was.
      if (res?.error) { toast.error(res.error); return; }
      setStatus("IN_PROGRESS");
      router.refresh();
    })();
  }, [status, job.id, router]);

  const handleHold = async () => {
    setBusy(true);
    try {
      const res = await holdStage(job.id);
      if ((res as any)?.error) throw new Error((res as any).error);
      setStatus("ON_HOLD");
      toast.success("Stage on hold");
      router.push(homePath);
    } catch (e: any) {
      toast.error(e.message || "Failed to hold stage");
      setBusy(false);
    }
  };


  const handleComplete = async () => {
    if (stage.requirePhoto && afterImages.length === 0) {
      toast.error("Add at least one after-photo before completing");
      return;
    }
    if (stage.requireRemarks && !remarks.trim()) {
      toast.error("Remarks are required for this stage");
      return;
    }
    // Enforce the department checklist before completing.
    for (const cp of checkpoints) {
      const r = cpState(cp.id);
      if (!r.ok) { toast.error(`Checklist: "${cp.name}" is not marked done`); return; }
      if (cp.requireImage && r.images.length === 0) { toast.error(`Checklist: "${cp.name}" needs a photo`); return; }
      if (cp.requireRemarks && !r.remarks.trim()) { toast.error(`Checklist: "${cp.name}" needs a remark`); return; }
    }
    setBusy(true);
    try {
      const res = await completeStage(job.id, {
        beforeImages,
        afterImages,
        measurements,
        materialNotes,
        remarks,
        checklist: checkpoints.map((cp) => {
          const r = cpState(cp.id);
          return { checkpointId: cp.id, ok: r.ok, remarks: r.remarks, images: r.images };
        }),
      });
      if ((res as any)?.error) throw new Error((res as any).error);
      // When the department needs sign-off the card is held, not finished — stay
      // on the page so the worker can see it's now with their supervisor.
      if ((res as any)?.pendingApproval) {
        setStatus("AWAITING_APPROVAL");
        toast.success(editing ? "Response updated — waiting for supervisor approval" : "Submitted — waiting for supervisor approval");
        setEditing(false);
        setBusy(false);
        router.refresh();
        return;
      }
      toast.success(`${stage.name} completed`);
      router.push(homePath);
    } catch (e: any) {
      toast.error(e.message || "Failed to complete stage");
      setBusy(false);
    }
  };

  const handleApprove = async () => {
    setBusy(true);
    try {
      const res = await approveStageCard(job.id);
      if ((res as any)?.error) throw new Error((res as any).error);
      toast.success(`${stage.name} approved`);
      router.push(homePath);
    } catch (e: any) {
      toast.error(e.message || "Failed to approve");
      setBusy(false);
    }
  };

  const handleReject = async () => {
    const reason = await promptDialog({
      title: "Send back for rework",
      description: `${stage.name} will return to the worker who submitted it.`,
      label: "Reason",
      placeholder: "What needs redoing?",
      required: true,
      confirmLabel: "Send back",
    });
    if (!reason?.trim()) return;
    setBusy(true);
    try {
      const res = await rejectStageCard(job.id, reason.trim());
      if ((res as any)?.error) throw new Error((res as any).error);
      toast.success("Sent back for rework");
      router.push(homePath);
    } catch (e: any) {
      toast.error(e.message || "Failed to reject");
      setBusy(false);
    }
  };

  const isBlocked = status === "BLOCKED";
  const isActive = status === "IN_PROGRESS";
  const isRework = status === "REWORK_REQUIRED";
  const isDone = status === "COMPLETED";
  const isAwaitingApproval = status === "AWAITING_APPROVAL";

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={homePath} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-text-secondary">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">{job.batchNumber}</p>
          <h1 className="truncate text-xl font-semibold tracking-[-0.03em] text-text-primary">{stage.name}</h1>
        </div>
      </div>

      {/* Route progress */}
      <Surface className="p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Production route</p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {siblings.map((s: any, i: number) => (
            <div key={s.id} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-text-tertiary text-xs">→</span>}
              <span className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-bold",
                s.id === job.id
                  ? "bg-[var(--brand)] text-white"
                  : s.status === "COMPLETED"
                    ? "bg-success-soft text-success"
                    : s.status === "REWORK_REQUIRED"
                      ? "bg-danger-soft text-danger"
                      : "bg-surface-2 text-text-tertiary"
              )}>
                {s.stageName}
              </span>
            </div>
          ))}
        </div>
      </Surface>

      {/* Full build spec — everything the floor needs, minus the customer. */}
      <OrderSpecCard order={job.order} />

      {/* Rework banner */}
      {isRework && (
        <div className="flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger-soft/40 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <div>
            <p className="text-sm font-bold text-danger">Rework required</p>
            <p className="mt-0.5 text-xs text-text-secondary">{job.reworkReason || "QC returned this job to your stage."}</p>
          </div>
        </div>
      )}

      {isBlocked ? (
        <Surface className="p-8 text-center">
          <Lock className="mx-auto h-10 w-10 text-text-tertiary" />
          <p className="mt-3 text-base font-semibold text-text-primary">Waiting for the previous stage</p>
          <p className="mt-1 text-sm text-text-secondary">This step unlocks automatically once the earlier stage is completed.</p>
        </Surface>
      ) : isDone ? (
        <Surface className="p-8 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
          <p className="mt-3 text-base font-semibold text-text-primary">Stage completed</p>
        </Surface>
      ) : isAwaitingApproval && !editing ? (
        <Surface className="p-6 text-center space-y-4">
          <CheckCircle2 className="mx-auto h-10 w-10 text-warning" />
          <div>
            <p className="text-base font-semibold text-text-primary">Submitted — awaiting supervisor approval</p>
            <p className="mt-1 text-sm text-text-secondary">
              {canApprove
                ? "Review the submission below, then approve to advance or send back for rework."
                : "Your supervisor will review and approve this stage. You can still change your response until then."}
            </p>
          </div>

          {/* Nothing is final until the supervisor signs off, so the worker can
              reopen their own submission and correct it. */}
          {!canApprove && (
            <Button
              variant="secondary"
              className="w-full gap-2"
              onClick={() => {
                const latest = (entries ?? [])[0];
                setRemarks(latest?.remarks ?? "");
                setMeasurements(latest?.measurements ?? "");
                setMaterialNotes(latest?.materialNotes ?? "");
                setEditing(true);
              }}
            >
              <Pencil className="h-4 w-4" /> Change my response
            </Button>
          )}
          {canApprove && (() => {
            // Show the worker's latest submission so the supervisor can review
            // before approving.
            const latest = (entries ?? [])[0];
            const afterImgs: string[] = latest?.afterImages ?? [];
            const checklist: any[] = Array.isArray(latest?.checklist) ? latest.checklist : [];
            return (
              <div className="space-y-4 text-left">
                {(afterImgs.length > 0 || latest?.remarks || checklist.length > 0) && (
                  <div className="rounded-xl border border-border bg-surface-2/40 p-4 space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Worker submission</p>
                    {afterImgs.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {afterImgs.map((src, i) => (
                          <a key={i} href={src} target="_blank" rel="noopener noreferrer" className="block h-20 w-20 overflow-hidden rounded-lg border border-border">
                            <img src={src} alt="" className="h-full w-full object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                    {latest?.remarks && <p className="text-sm text-text-secondary">“{latest.remarks}”</p>}
                    {checklist.length > 0 && (
                      <ul className="space-y-1">
                        {checklist.map((c: any, i: number) => (
                          <li key={i} className="flex items-center gap-2 text-xs text-text-secondary">
                            <CheckCircle2 className={`h-3.5 w-3.5 ${c.ok ? "text-success" : "text-text-tertiary"}`} />
                            {c.name}{c.remarks ? ` — ${c.remarks}` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Button onClick={handleApprove} disabled={busy} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Approve stage
                  </Button>
                  <Button onClick={handleReject} disabled={busy} variant="secondary" className="gap-2">
                    <AlertTriangle className="h-4 w-4" /> Send back for rework
                  </Button>
                </div>
              </div>
            );
          })()}
        </Surface>
      ) : (
        <>
          {/* Photo capture */}
          <Surface className="p-4 space-y-4">
            <PhotoSection
              label="Before photos"
              hint="Material / job condition before starting"
              images={beforeImages}
              onAdd={() => beforeInputRef.current?.click()}
              onRemove={(idx) => setBeforeImages((prev) => prev.filter((_, i) => i !== idx))}
            />
            <input ref={beforeInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden"
              onChange={(e) => { readFiles(e.target.files, setBeforeImages); e.target.value = ""; }} />

            <PhotoSection
              label={`After photos${stage.requirePhoto ? " *" : ""}`}
              hint="Completed work for this stage"
              images={afterImages}
              onAdd={() => afterInputRef.current?.click()}
              onRemove={(idx) => setAfterImages((prev) => prev.filter((_, i) => i !== idx))}
            />
            <input ref={afterInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden"
              onChange={(e) => { readFiles(e.target.files, setAfterImages); e.target.value = ""; }} />
          </Surface>

          {/* Department checklist (template) */}
          {checkpoints.length > 0 && (
            <Surface className="p-4 space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">
                {template.name} — checklist
              </p>
              {checkpoints.map((cp: any) => (
                <ChecklistRow
                  key={cp.id}
                  cp={cp}
                  state={cpState(cp.id)}
                  onToggle={(ok) => updateCp(cp.id, { ok })}
                  onRemarks={(v) => updateCp(cp.id, { remarks: v })}
                  onAddImage={(img) => addCpImage(cp.id, img)}
                  onRemoveImage={(idx) => removeCpImage(cp.id, idx)}
                />
              ))}
            </Surface>
          )}

          {/* Details */}
          <Surface className="p-4 space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Measurements</label>
              <Input placeholder="e.g. Back panel 58 x 64 cm" value={measurements} onChange={(e) => setMeasurements(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Material used</label>
              <Input placeholder="e.g. Napa Black roll #12" value={materialNotes} onChange={(e) => setMaterialNotes(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">
                Remarks{stage.requireRemarks ? " *" : ""}
              </label>
              <Input placeholder="Notes or exceptions..." value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </div>
          </Surface>

          {/* Actions — the stage is already running by the time this renders
              (opening the screen starts it), so Complete is the primary action. */}
          <div className="space-y-2">
            <Button onClick={handleComplete} disabled={busy} className="w-full gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {editing ? "Re-submit for approval" : `Complete ${stage.name}`}
            </Button>
            {editing ? (
              <Button onClick={() => setEditing(false)} disabled={busy} variant="secondary" className="w-full gap-2">
                Cancel
              </Button>
            ) : (
              <Button onClick={handleHold} disabled={busy} variant="secondary" className="w-full gap-2">
                <PauseCircle className="h-4 w-4" />
                Pause &amp; come back later
              </Button>
            )}
          </div>
        </>
      )}

      {/* Previous submissions (rework history) */}
      {entries.length > 0 && (
        <Surface className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">Previous submissions</p>
          <div className="mt-3 space-y-3">
            {entries.map((entry: any) => (
              <div key={entry.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between">
                  <Badge className={entry.outcome === "APPROVED" ? "bg-success-soft text-success" : entry.outcome === "REWORK" ? "bg-danger-soft text-danger" : "bg-brand-soft text-brand"}>
                    {entry.outcome}
                  </Badge>
                  <span className="text-[10px] text-text-tertiary">{new Date(entry.createdAt).toLocaleString()}</span>
                </div>
                {entry.remarks && <p className="mt-2 text-xs text-text-secondary">{entry.remarks}</p>}
                {Array.isArray(entry.checklist) && entry.checklist.length > 0 && (
                  <div className="mt-2 space-y-0.5">
                    {entry.checklist.map((c: any, i: number) => (
                      <p key={i} className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                        <CheckCircle2 className={cn("h-3 w-3", c.ok ? "text-success" : "text-text-tertiary")} />
                        {c.name}{c.remarks ? ` — ${c.remarks}` : ""}
                      </p>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  {[...(entry.beforeImages ?? []), ...(entry.afterImages ?? []), ...((entry.checklist ?? []).flatMap((c: any) => c.images ?? []))].map((url: string, i: number) => (
                    <img key={i} src={url} alt="Stage evidence" className="h-14 w-14 rounded-lg border border-border object-cover" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Surface>
      )}
    </div>
  );
}

function ChecklistRow({ cp, state, onToggle, onRemarks, onAddImage, onRemoveImage }: {
  cp: any;
  state: { ok: boolean; remarks: string; images: StageImage[] };
  onToggle: (ok: boolean) => void;
  onRemarks: (v: string) => void;
  onAddImage: (img: StageImage) => void;
  onRemoveImage: (idx: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const onFiles = (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = () => onAddImage({
        dataUrl: String(reader.result),
        fileName: file.name,
        contentType: file.type || "image/jpeg",
        size: file.size,
      });
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={cn(
      "rounded-xl border p-3 transition-colors",
      state.ok ? "border-success/40 bg-success-soft/30" : "border-border"
    )}>
      <button
        type="button"
        onClick={() => onToggle(!state.ok)}
        className="flex w-full items-start gap-3 text-left"
      >
        <span className={cn(
          "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
          state.ok ? "border-success bg-success text-white" : "border-border bg-surface"
        )}>
          {state.ok && <CheckCircle2 className="h-4 w-4" />}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-text-primary">
            {cp.name}
            {cp.requireImage && <span className="ml-1 text-[10px] font-bold text-brand">PHOTO</span>}
            {cp.requireRemarks && <span className="ml-1 text-[10px] font-bold text-warning">REMARK</span>}
          </span>
          {cp.instructions && <span className="block text-[11px] text-text-tertiary">{cp.instructions}</span>}
        </span>
      </button>

      {state.ok && (
        <div className="mt-3 space-y-2 pl-8">
          {cp.requireRemarks || state.remarks ? (
            <Input
              placeholder={`Remark${cp.requireRemarks ? " (required)" : ""}...`}
              value={state.remarks}
              onChange={(e) => onRemarks(e.target.value)}
              className="h-9 text-xs"
            />
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            {state.images.map((img, idx) => (
              <div key={idx} className="relative">
                <img src={img.dataUrl} alt={img.fileName} className="h-12 w-12 rounded-lg border border-border object-cover" />
                <button
                  type="button"
                  onClick={() => onRemoveImage(idx)}
                  className="absolute -right-1.5 -top-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-danger text-white"
                  aria-label="Remove photo"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
            <Button variant="secondary" onClick={() => inputRef.current?.click()} className="h-9 gap-1.5 text-xs">
              <Camera className="h-3.5 w-3.5" /> {cp.requireRemarks && !state.remarks ? "Photo" : "Add photo"}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PhotoSection({ label, hint, images, onAdd, onRemove }: {
  label: string;
  hint: string;
  images: StageImage[];
  onAdd: () => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">{label}</p>
          <p className="text-[11px] text-text-tertiary">{hint}</p>
        </div>
        <Button variant="secondary" onClick={onAdd} className="h-9 gap-1.5 text-xs">
          <Camera className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
      {images.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {images.map((img, idx) => (
            <div key={idx} className="relative">
              <img src={img.dataUrl} alt={img.fileName} className="h-16 w-16 rounded-lg border border-border object-cover" />
              <button
                onClick={() => onRemove(idx)}
                className="absolute -right-1.5 -top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white"
                aria-label="Remove photo"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
