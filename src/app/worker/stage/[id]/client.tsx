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
import { createStageVideoUploadUrl, resolveStageVideoUrl } from "@/server/actions/stage-video";
import { createClient as createSupabaseBrowserClient } from "@/lib/supabase/client";
import { OrderSpecCard } from "@/components/factory/OrderSpecCard";
import { HOLD_CAUSES, HOLD_CAUSE_KEYS, isUrgentHold, type HoldCause } from "@/lib/stage-holds";
import { cn } from "@/lib/utils";

type StageImage = { dataUrl: string; fileName: string; contentType: string; size: number };

type ChecklistState = Record<string, { ok: boolean; value: string; remarks: string; images: StageImage[] }>;

// A worker who pauses mid-stage must return to exactly what they had typed and
// photographed. localStorage would blow its ~5MB quota on a few phone photos, so
// the draft (text + checklist + before/after images) lives in IndexedDB, keyed
// by job id. Cleared once the stage is completed.
const stageDraftDB = async () => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open('verity_stage_drafts', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('drafts')) db.createObjectStore('drafts', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};
const idbGet = async (id: string): Promise<any> => {
  try {
    const db = await stageDraftDB();
    return await new Promise((resolve) => {
      const r = db.transaction('drafts').objectStore('drafts').get(id);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => resolve(null);
    });
  } catch { return null; }
};
const idbPut = async (val: any) => {
  try { const db = await stageDraftDB(); db.transaction('drafts', 'readwrite').objectStore('drafts').put(val); } catch { /* best effort */ }
};
const idbDel = async (id: string) => {
  try { const db = await stageDraftDB(); db.transaction('drafts', 'readwrite').objectStore('drafts').delete(id); } catch { /* best effort */ }
};

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
  // The pause panel: a cause, and an optional note for the supervisor.
  const [holdPanel, setHoldPanel] = useState(false);
  const [holdNote, setHoldNote] = useState("");
  // Set when the worker reopens an already-submitted response to amend it.
  const [editing, setEditing] = useState(false);
  const [beforeImages, setBeforeImages] = useState<StageImage[]>([]);
  const [afterImages, setAfterImages] = useState<StageImage[]>([]);
  const [measurements, setMeasurements] = useState("");
  const [materialNotes, setMaterialNotes] = useState("");
  const [remarks, setRemarks] = useState("");
  const [checklist, setChecklist] = useState<ChecklistState>({});
  const [busy, setBusy] = useState(false);
  const draftLoaded = useRef(false);
  // Walkthrough clip for stages whose checklist asks for one (e.g. Packing).
  const [video, setVideo] = useState<{ url: string; path: string; durationSec?: number } | null>(null);
  const [videoBusy, setVideoBusy] = useState(false);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const videoRequired = !!template?.requiresVideo;

  // Checkpoints the owner configured to capture a typed answer (Measurements,
  // Material used, ...) instead of a pass/fail tick.
  const typedCheckpoints = checkpoints.filter((cp: any) => (cp.inputType ?? "PASS_FAIL") !== "PASS_FAIL");
  const passFailCheckpoints = checkpoints.filter((cp: any) => (cp.inputType ?? "PASS_FAIL") === "PASS_FAIL");

  const uploadVideo = async (file: File) => {
    setVideoBusy(true);
    try {
      const ticket: any = await createStageVideoUploadUrl({
        jobCardId: job.id,
        fileName: file.name,
        mimeType: file.type || "video/mp4",
        sizeBytes: file.size,
      });
      if (ticket?.error) throw new Error(ticket.error);
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.storage
        .from(ticket.bucket)
        .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type || "video/mp4" });
      if (error) throw new Error(error.message || "Upload failed");
      const resolved: any = await resolveStageVideoUrl(ticket.path);
      if (resolved?.error) throw new Error(resolved.error);
      setVideo({ url: resolved.url, path: ticket.path });
      toast.success("Video uploaded");
    } catch (e: any) {
      toast.error(e.message || "Could not upload video");
    } finally {
      setVideoBusy(false);
    }
  };

  // Restore a paused draft once on mount, so "Pause & come back later" resumes
  // exactly where the worker left off instead of an empty form.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const draft = await idbGet(job.id);
      if (cancelled || !draft) { draftLoaded.current = true; return; }
      if (typeof draft.measurements === 'string') setMeasurements(draft.measurements);
      if (typeof draft.materialNotes === 'string') setMaterialNotes(draft.materialNotes);
      if (typeof draft.remarks === 'string') setRemarks(draft.remarks);
      if (draft.checklist) setChecklist(draft.checklist);
      if (Array.isArray(draft.beforeImages)) setBeforeImages(draft.beforeImages);
      if (Array.isArray(draft.afterImages)) setAfterImages(draft.afterImages);
      draftLoaded.current = true;
    })();
    return () => { cancelled = true; };
  }, [job.id]);

  // Persist the draft on every change (after the initial restore), so a paused
  // stage survives a closed tab, not just an in-app navigation.
  useEffect(() => {
    if (!draftLoaded.current) return;
    void idbPut({ id: job.id, measurements, materialNotes, remarks, checklist, beforeImages, afterImages });
  }, [job.id, measurements, materialNotes, remarks, checklist, beforeImages, afterImages]);

  const cpState = (id: string) => checklist[id] ?? { ok: false, value: "", remarks: "", images: [] };
  const updateCp = (id: string, patch: Partial<{ ok: boolean; value: string; remarks: string; images: StageImage[] }>) =>
    setChecklist((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { ok: false, value: "", remarks: "", images: [] }), ...patch } }));
  const addCpImage = (id: string, img: StageImage) =>
    setChecklist((prev) => {
      const cur = prev[id] ?? { ok: false, value: "", remarks: "", images: [] };
      return { ...prev, [id]: { ...cur, images: [...cur.images, img] } };
    });
  const removeCpImage = (id: string, idx: number) =>
    setChecklist((prev) => {
      const cur = prev[id] ?? { ok: false, value: "", remarks: "", images: [] };
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

  // Pausing asks why. A bare "on hold" told a supervisor nothing — a broken
  // machine and a tea break looked identical on the floor board — so the cause is
  // collected here and drives whether the alert shouts.
  const handleHold = async (cause: HoldCause) => {
    setBusy(true);
    try {
      const res = await holdStage(job.id, holdNote.trim() || undefined, cause);
      if ((res as any)?.error) throw new Error((res as any).error);
      setStatus("ON_HOLD");
      toast.success(
        isUrgentHold(cause) ? "Stage on hold — your supervisor has been alerted" : "Stage on hold"
      );
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
      if (cp.isRequired === false) continue;
      if ((cp.inputType ?? "PASS_FAIL") === "PASS_FAIL") {
        if (!r.ok) { toast.error(`Checklist: "${cp.name}" is not marked done`); return; }
      } else if (!r.value.trim()) {
        toast.error(`Checklist: "${cp.name}" needs an answer`); return;
      }
      if (cp.requireImage && r.images.length === 0) { toast.error(`Checklist: "${cp.name}" needs a photo`); return; }
      if (cp.requireRemarks && !r.remarks.trim()) { toast.error(`Checklist: "${cp.name}" needs a remark`); return; }
    }
    if (videoRequired && !video) {
      toast.error("Record or upload the walkthrough video before completing");
      return;
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
          return { checkpointId: cp.id, ok: r.ok, value: r.value, remarks: r.remarks, images: r.images };
        }),
        video,
      });
      if ((res as any)?.error) throw new Error((res as any).error);
      // Submitted — the paused draft is no longer needed.
      await idbDel(job.id);
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
          {passFailCheckpoints.length > 0 && (
            <Surface className="p-4 space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">
                {template.name} — checklist
              </p>
              {passFailCheckpoints.map((cp: any) => (
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

          {/* Template-driven detail questions (Measurements, Material used, ...).
              These are ordinary checkpoints the owner configures, so they can be
              renamed, reordered, made optional or dropped entirely. */}
          {typedCheckpoints.length > 0 && (
            <Surface className="p-4 space-y-3">
              {typedCheckpoints.map((cp: any) => {
                const st = cpState(cp.id);
                return (
                  <div key={cp.id} className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">
                      {cp.name}{cp.isRequired === false ? "" : " *"}
                    </label>
                    {cp.instructions && <p className="text-[11px] text-text-secondary">{cp.instructions}</p>}
                    {cp.referenceImageUrl && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={cp.referenceImageUrl} alt="reference" className="h-20 w-20 rounded-lg border border-border object-cover" />
                    )}
                    <Input
                      type={cp.inputType === "NUMBER" ? "number" : "text"}
                      inputMode={cp.inputType === "NUMBER" ? "numeric" : undefined}
                      placeholder={cp.placeholder || ""}
                      value={st.value}
                      onChange={(e) => updateCp(cp.id, { value: e.target.value })}
                    />
                  </div>
                );
              })}
            </Surface>
          )}

          {/* Remarks stays because the department itself can demand it
              (stage.requireRemarks); Measurements and Material used are no longer
              hardcoded — a department that wants them adds them as checkpoints in
              the checklist builder. */}
          {stage.requireRemarks && (
            <Surface className="p-4 space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">
                  Remarks *
                </label>
                <Input placeholder="Notes or exceptions..." value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              </div>
            </Surface>
          )}

          {/* Walkthrough video — shown when this stage's checklist asks for one
              (e.g. Packing). QC records its clip on the inspection; a department
              stage records it here. */}
          {videoRequired && (
            <Surface className="p-4 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">
                Walkthrough video *
              </p>
              {video ? (
                <div className="space-y-2">
                  <video src={video.url} controls className="w-full rounded-xl border border-border" />
                  <button type="button" onClick={() => setVideo(null)} className="text-[11px] font-semibold text-danger hover:underline">
                    Remove and record again
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-[11px] text-text-secondary">
                    Record a short clip of the finished work before completing this stage.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={videoBusy}
                    onClick={() => videoInputRef.current?.click()}
                    className="w-full gap-2"
                  >
                    {videoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    {videoBusy ? "Uploading..." : "Record / upload video"}
                  </Button>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadVideo(f); e.target.value = ""; }}
                  />
                </>
              )}
            </Surface>
          )}

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
            ) : holdPanel ? (
              <Surface className="p-4 space-y-3">
                <p className="text-xs font-semibold text-text-primary">Why are you pausing?</p>
                <Input
                  placeholder="Anything the supervisor should know (optional)"
                  value={holdNote}
                  onChange={(e) => setHoldNote(e.target.value)}
                />
                <div className="grid gap-2">
                  {HOLD_CAUSE_KEYS.map((cause) => (
                    <Button
                      key={cause}
                      onClick={() => handleHold(cause)}
                      disabled={busy}
                      variant={isUrgentHold(cause) ? "primary" : "secondary"}
                      className="w-full justify-start gap-2"
                    >
                      {isUrgentHold(cause) ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <PauseCircle className="h-4 w-4" />
                      )}
                      {HOLD_CAUSES[cause]}
                    </Button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setHoldPanel(false)}
                  disabled={busy}
                  className="w-full text-xs font-medium text-text-tertiary hover:text-text-secondary"
                >
                  Never mind, keep working
                </button>
              </Surface>
            ) : (
              <Button onClick={() => setHoldPanel(true)} disabled={busy} variant="secondary" className="w-full gap-2">
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
          {cp.isRequired === false && (
            <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-wider text-text-tertiary">Optional</span>
          )}
          {/* The correct result to compare against, same as the camera and typed
              checkpoints show. */}
          {cp.referenceImageUrl && (
            <img
              src={cp.referenceImageUrl}
              alt="reference"
              className="mt-2 h-20 w-20 rounded-lg border border-border object-cover"
            />
          )}
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
          {/* Photo capture belongs only to checkpoints with "Require Camera Snap
              Verification" on. Anything already attached stays visible (and
              removable) even if the setting was turned off afterwards. */}
          {(cp.requireImage || state.images.length > 0) && (
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
              {cp.requireImage && (
                <>
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
                </>
              )}
            </div>
          )}
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
