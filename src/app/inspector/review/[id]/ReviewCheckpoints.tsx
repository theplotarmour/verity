"use client";

import { useState, useMemo, useEffect, Fragment } from "react";
import {
  CheckCircle,
  XCircle,
  Camera,
  ZoomIn,
  X,
  ArrowLeft,
  AlertCircle,
  Video as VideoIcon,
} from "lucide-react";
import { verifyCheckpoint, approveInspection, rejectInspection } from "@/server/actions/inspector";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Input, Button, Badge, Select } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { OrderSpecCard } from "@/components/factory/OrderSpecCard";

// The QC review renders the ACTUAL template the inspection ran against — its
// real sections and checkpoints — not a fixed set of hardcoded tabs. Each
// section shows every worker answer, its photos, and (for the walkthrough)
// the video. The supervisor approves/flags each section, reviews the video,
// and only then can sign off. Nothing can be skipped.

const FINAL_TAB = "__final__";

type Section = { id: string; title: string; subs: any[] };

export function ReviewCheckpoints({
  inspection,
  queue = [],
  backUrl,
  isOwner,
  dict,
  packingOperators = [],
}: {
  inspection: any;
  queue?: any[];
  backUrl: string;
  isOwner: boolean;
  dict: any;
  packingOperators?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [packerId, setPackerId] = useState("");

  const reworkTargets: Array<{ id: string; stageName: string }> = inspection.reworkTargets ?? [];
  const [rejectTargetId, setRejectTargetId] = useState<string>(reworkTargets[0]?.id ?? "");

  const [localSubmissions, setLocalSubmissions] = useState<any[]>(inspection.submissions || []);
  useEffect(() => setLocalSubmissions(inspection.submissions || []), [inspection.submissions]);
  const submissions = localSubmissions;

  const hasVideo = !!inspection.videoUrl;
  const videoRequired = hasVideo || !!inspection.template?.requiresVideo;
  // The video has no server-side verdict field, so the supervisor's review is
  // tracked here and required before sign-off.
  const [videoVerdict, setVideoVerdict] = useState<"APPROVED" | "REJECTED" | null>(null);

  // ---- Build the tab list from the real template sections -----------------
  // Sections come from the template (in order); submissions are matched to them
  // by their checkpoint's section. Anything without a section (legacy data)
  // falls into a catch-all so it is never hidden.
  const sections: Section[] = useMemo(() => {
    const byId = new Map<string, Section>();
    const order: string[] = [];

    const templateSections: any[] = inspection.template?.sections ?? [];
    for (const s of templateSections) {
      byId.set(s.id, { id: s.id, title: s.title, subs: [] });
      order.push(s.id);
    }

    for (const sub of submissions) {
      const sec = sub.checkpoint?.section;
      const key = sec?.id ?? "__unsectioned__";
      if (!byId.has(key)) {
        byId.set(key, { id: key, title: sec?.title ?? "Checks", subs: [] });
        order.push(key);
      }
      byId.get(key)!.subs.push(sub);
    }

    // Only keep sections that actually have submissions to review.
    return order.map((id) => byId.get(id)!).filter((s) => s.subs.length > 0);
  }, [inspection.template?.sections, submissions]);

  const tabs = useMemo(
    () => [...sections.map((s) => ({ id: s.id, label: s.title })), { id: FINAL_TAB, label: "Final Approval" }],
    [sections],
  );

  const [activeTab, setActiveTab] = useState<string>(tabs[0]?.id ?? FINAL_TAB);
  useEffect(() => {
    // Keep the active tab valid if the section list changes.
    if (!tabs.some((t) => t.id === activeTab)) setActiveTab(tabs[0]?.id ?? FINAL_TAB);
  }, [tabs, activeTab]);

  const isFinalTab = activeTab === FINAL_TAB;
  const currentSection = sections.find((s) => s.id === activeTab) ?? null;
  const tabSubs = currentSection?.subs ?? [];

  // ---- Progress -----------------------------------------------------------
  const totalApproved = submissions.filter((s: any) => s.verificationStatus === "APPROVED").length;
  const totalRejected = submissions.filter((s: any) => s.verificationStatus === "REJECTED").length;
  const allCheckpointsVerified = submissions.length > 0 && submissions.every((s: any) => !!s.verificationStatus);
  const videoOk = !videoRequired || videoVerdict === "APPROVED";
  const canApprove = allCheckpointsVerified && videoOk;

  const sectionVerified = (sec: Section) =>
    sec.subs.length > 0 && sec.subs.every((s) => !!s.verificationStatus);
  const sectionsDone = sections.filter(sectionVerified).length;

  // ---- Actions ------------------------------------------------------------
  const applyVerdictLocal = (ids: Set<string>, status: "APPROVED" | "REJECTED" | null, comment?: string) => {
    setLocalSubmissions((prev) =>
      prev.map((s) => (ids.has(s.id)
        ? { ...s, verificationStatus: status, inspectorComment: comment ?? s.inspectorComment, verifiedAt: status ? new Date() : null }
        : s)),
    );
  };

  const verifySection = async (sec: Section, status: "APPROVED" | "REJECTED") => {
    let comment = "";
    if (status === "REJECTED") {
      comment = (window.prompt("Reason for flagging this section:") || "").trim();
      if (!comment) return;
    }
    const ids = new Set(sec.subs.map((s) => s.id));
    applyVerdictLocal(ids, status, comment);
    setVerifyingId(sec.id);
    try {
      await Promise.all(sec.subs.map((s) => verifyCheckpoint(s.id, status, comment)));
      router.refresh();
      // Advance to the next unreviewed section, else the final tab.
      const nextTab = tabs.find((t) => t.id !== FINAL_TAB && t.id !== sec.id && !sectionVerified(sections.find((x) => x.id === t.id)!));
      setActiveTab(nextTab?.id ?? FINAL_TAB);
    } catch (e: any) {
      setLocalSubmissions(inspection.submissions || []);
      if (e.message === "NEXT_REDIRECT") throw e;
      toast.error(e.message || "Failed to verify section");
    } finally {
      setVerifyingId(null);
    }
  };

  const resetSection = async (sec: Section) => {
    const ids = new Set(sec.subs.map((s) => s.id));
    applyVerdictLocal(ids, null);
    setVerifyingId(sec.id);
    try {
      await Promise.all(sec.subs.map((s) => verifyCheckpoint(s.id, "PENDING", "")));
      router.refresh();
    } catch (e: any) {
      setLocalSubmissions(inspection.submissions || []);
      if (e.message === "NEXT_REDIRECT") throw e;
      toast.error(e.message || "Failed to reset section");
    } finally {
      setVerifyingId(null);
    }
  };

  const finalApprove = async () => {
    if (!allCheckpointsVerified) {
      toast.error("Review every section first — QC steps cannot be skipped");
      setActiveTab(sections.find((s) => !sectionVerified(s))?.id ?? FINAL_TAB);
      return;
    }
    if (videoRequired && videoVerdict !== "APPROVED") {
      toast.error(hasVideo ? "Review the walkthrough video before signing off" : "This inspection requires a walkthrough video");
      return;
    }
    try {
      await approveInspection(inspection.id, "Approved", packerId || undefined);
      router.push(backUrl);
    } catch (e: any) {
      if (e.message === "NEXT_REDIRECT") throw e;
      toast.error(e.message || "Failed to approve inspection");
    }
  };

  const finalReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectReason.trim()) return;
    try {
      await rejectInspection(inspection.id, rejectReason, rejectTargetId || undefined);
      router.push(backUrl);
    } catch (e: any) {
      if (e.message === "NEXT_REDIRECT") throw e;
      toast.error(e.message || "Failed to reject inspection");
    }
  };

  // ---- Shared fragments ---------------------------------------------------
  const renderTabBar = (mobile?: boolean) => (
    <div className={cn(
      "flex items-center gap-1 overflow-x-auto scrollbar-none shrink-0 border-b border-border",
      mobile ? "px-3 py-2 bg-surface-2/30" : "px-4 pt-3 bg-surface-2/30",
    )}>
      {tabs.map((tab) => {
        const sec = sections.find((s) => s.id === tab.id);
        const done = tab.id === FINAL_TAB ? canApprove : sec ? sectionVerified(sec) : false;
        const count = sec?.subs.length ?? 0;
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap font-semibold transition-all",
              mobile
                ? cn("shrink-0 rounded-xl border px-3 py-1.5 text-[10px]",
                    active ? "bg-[var(--brand)] text-white border-transparent"
                      : done ? "border-success/30 text-success bg-success-soft/30"
                      : "border-border text-text-secondary bg-surface")
                : cn("border-b-2 px-3 py-2.5 text-xs",
                    active ? "border-[var(--brand)] text-[var(--brand)]"
                      : "border-transparent text-text-secondary hover:text-text-primary"),
            )}
          >
            {tab.label}
            {tab.id !== FINAL_TAB && (
              <span className={cn(
                "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold",
                done ? "bg-success text-white" : "bg-surface-2 text-text-tertiary",
              )}>
                {done ? "✓" : count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  const renderCheckpointRow = (sub: any, idx: number) => {
    const failed = sub.passFail === "FAIL";
    const approved = sub.verificationStatus === "APPROVED";
    const rejected = sub.verificationStatus === "REJECTED";
    const images: any[] = sub.evidences ?? [];
    return (
      <div className={cn(
        "rounded-2xl border bg-surface p-4 shadow-sm",
        approved ? "border-success/35" : rejected ? "border-danger/35" : "border-border",
      )}>
        <div className="flex items-start gap-2">
          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-[9px] font-bold text-text-tertiary">{idx + 1}</span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold leading-snug text-text-primary">{sub.checkpoint?.name}</h3>
            {sub.checkpoint?.instructions && <p className="mt-0.5 text-[11px] text-text-secondary">{sub.checkpoint.instructions}</p>}
          </div>
          {failed ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-[9px] font-bold uppercase text-warning"><AlertCircle className="h-2.5 w-2.5" /> Issue</span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[9px] font-bold uppercase text-success"><CheckCircle className="h-2.5 w-2.5" /> OK</span>
          )}
        </div>

        {sub.remarks && <p className="mt-2 text-[11px] italic text-text-secondary">“{sub.remarks}”</p>}

        {images.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {images.map((ev: any) => (
              <button key={ev.id ?? ev.publicUrl} onClick={() => setZoomedImage(ev.publicUrl)}
                className="group relative h-16 w-16 overflow-hidden rounded-lg border border-border">
                <img src={ev.publicUrl} alt="Evidence" className="h-full w-full object-cover" />
                <span className="absolute inset-0 hidden items-center justify-center bg-black/40 text-white group-hover:flex"><ZoomIn className="h-4 w-4" /></span>
              </button>
            ))}
          </div>
        )}

        {(approved || rejected) && (
          <p className={cn("mt-2 text-[10px] font-bold", approved ? "text-success" : "text-danger")}>
            {approved ? "✓ Approved by you" : "✗ Flagged for rework"}
            {sub.inspectorComment ? ` — ${sub.inspectorComment}` : ""}
          </p>
        )}
      </div>
    );
  };

  const renderSectionVerdictBar = (sec: Section) => {
    const reviewed = sectionVerified(sec);
    if (reviewed) {
      const rejected = sec.subs.some((s) => s.verificationStatus === "REJECTED");
      return (
        <div className={cn("flex items-center justify-between gap-3 rounded-2xl border p-3",
          rejected ? "border-danger/20 bg-danger-soft/30 text-danger" : "border-success/20 bg-success-soft/30 text-success")}>
          <span className="flex items-center gap-2 text-sm font-bold">
            {rejected ? <XCircle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
            {rejected ? "Flagged for rework" : "Section approved"}
          </span>
          <Button onClick={() => resetSection(sec)} disabled={verifyingId !== null} variant="secondary" className="h-9 text-xs">Reset</Button>
        </div>
      );
    }
    return (
      <div className="flex gap-2">
        <Button onClick={() => verifySection(sec, "REJECTED")} disabled={verifyingId !== null} variant="danger" className="flex-1 gap-1.5 text-xs"><XCircle className="h-4 w-4" /> Flag section</Button>
        <Button onClick={() => verifySection(sec, "APPROVED")} disabled={verifyingId !== null} variant="success" className="flex-1 gap-1.5 text-xs"><CheckCircle className="h-4 w-4" /> Approve section</Button>
      </div>
    );
  };

  const renderVideoReview = () => {
    if (!videoRequired) return null;
    return (
      <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-text-tertiary">
          <VideoIcon className="h-3.5 w-3.5" /> Walkthrough video
        </p>
        {hasVideo ? (
          <>
            <div className="overflow-hidden rounded-xl border border-border bg-black">
              <video src={inspection.videoUrl} controls playsInline preload="metadata" className="max-h-72 w-full" />
            </div>
            {videoVerdict ? (
              <div className={cn("flex items-center justify-between rounded-xl border p-2.5 text-xs font-bold",
                videoVerdict === "APPROVED" ? "border-success/20 bg-success-soft/30 text-success" : "border-danger/20 bg-danger-soft/30 text-danger")}>
                <span>{videoVerdict === "APPROVED" ? "✓ Video approved" : "✗ Video flagged"}</span>
                <button onClick={() => setVideoVerdict(null)} className="underline">Change</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button onClick={() => setVideoVerdict("REJECTED")} variant="danger" className="flex-1 gap-1.5 text-xs"><XCircle className="h-4 w-4" /> Flag video</Button>
                <Button onClick={() => setVideoVerdict("APPROVED")} variant="success" className="flex-1 gap-1.5 text-xs"><CheckCircle className="h-4 w-4" /> Approve video</Button>
              </div>
            )}
          </>
        ) : (
          <p className="rounded-xl border border-dashed border-warning/40 bg-warning-soft/30 p-3 text-[11px] font-medium text-warning">
            This template requires a walkthrough video, but the worker has not uploaded one. Send it back for rework.
          </p>
        )}
      </div>
    );
  };

  // Plain render helpers, not components. Declared inside the page they close
  // over its state, and mounting them as <FinalPanel /> made React treat each
  // render as a brand-new component type — remounting the subtree and losing
  // input focus and local state every keystroke. Calling them returns the same
  // elements without ever creating a component during render.
  const renderFinalPanel = () => (
    <div className="mx-auto w-full max-w-md space-y-4">
      <OrderSpecCard order={inspection.batch?.order} defaultOpen={false} />
      {renderVideoReview()}
      <div className="rounded-2xl border border-border bg-surface p-4">
        <p className="text-sm font-bold text-text-primary">Sign off the quality passport</p>
        <p className="mt-1 text-xs text-text-secondary">
          {sectionsDone}/{sections.length} sections reviewed · {totalApproved} approved{totalRejected ? ` · ${totalRejected} flagged` : ""}
          {videoRequired ? ` · video ${videoVerdict ? videoVerdict.toLowerCase() : "pending"}` : ""}
        </p>
        {packingOperators.length > 0 && (
          <div className="mt-3">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Assign packing operator</label>
            <Select value={packerId} onChange={(e) => setPackerId(e.target.value)}
              className="mt-1 h-9 w-full rounded-xl border border-border bg-background px-2 text-xs font-medium text-text-primary">
              <option value="">Leave unassigned</option>
              {packingOperators.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </div>
        )}
        <Button onClick={finalApprove} disabled={!canApprove} className="mt-3 w-full gap-2 disabled:opacity-40">
          <CheckCircle className="h-4 w-4" /> {canApprove ? "Approve passport" : "Review everything first"}
        </Button>
        <form onSubmit={finalReject} className="mt-3 space-y-2 border-t border-border pt-3">
          <Input placeholder="Rejection reason…" value={rejectReason}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRejectReason(e.target.value)} className="h-10 rounded-xl text-xs" required />
          {reworkTargets.length > 0 && (
            <Select value={rejectTargetId} onChange={(e) => setRejectTargetId(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-text-primary">
              {reworkTargets.map((t) => <option key={t.id} value={t.id}>Return to: {t.stageName}</option>)}
            </Select>
          )}
          <Button type="submit" variant="danger" className="w-full gap-1.5 text-xs"><XCircle className="h-4 w-4" /> Send for rework</Button>
        </form>
      </div>
    </div>
  );

  const renderSectionPanel = (sec: Section) => (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      {sec.subs.map((sub, idx) => <Fragment key={sub.id}>{renderCheckpointRow(sub, idx)}</Fragment>)}
      {renderSectionVerdictBar(sec)}
    </div>
  );

  const renderHeader = () => (
    <div className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 shrink-0 md:px-6 md:py-4">
      <div className="flex min-w-0 items-center gap-3">
        <Link href={backUrl} className="shrink-0 text-text-secondary hover:text-text-primary"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="min-w-0">
          <span className="block text-[10px] font-mono font-bold uppercase text-text-tertiary">Reviewing {inspection.batch?.batchNumber}</span>
          <h1 className="truncate text-base font-bold tracking-tight text-text-primary md:text-lg">
            {inspection.batch?.order?.itemName || inspection.batch?.order?.productName || inspection.batch?.order?.orderNumber}
          </h1>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant="neutral" className="bg-success-soft px-2.5 py-1 text-[10px] tracking-widest text-success">{totalApproved}/{submissions.length} passed</Badge>
        {totalRejected > 0 && <Badge variant="neutral" className="bg-danger-soft px-2.5 py-1 text-[10px] tracking-widest text-danger">{totalRejected} flagged</Badge>}
      </div>
    </div>
  );

  const emptyState = submissions.length === 0;

  return (
    <div className="relative flex h-[calc(100vh-64px)] w-full min-w-0 overflow-hidden">
      {/* Desktop queue */}
      <aside className="hidden w-[280px] shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="shrink-0 border-b border-border p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary">Active Queue</h2>
          <p className="mt-1 text-xs text-text-secondary">{queue.length} jobs pending verification</p>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {queue.map((item) => {
            const active = item.id === inspection.id;
            return (
              <Link key={item.id} href={`/inspector/review/${item.id}`} className="block">
                <div className={cn("rounded-2xl border p-4 transition-all",
                  active ? "border-[var(--brand)]/40 bg-[var(--brand)]/10" : "border-border bg-surface-2/40 hover:bg-surface-2/80")}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[9px] font-mono font-bold uppercase text-text-tertiary">{item.batch?.batchNumber}</span>
                    <span className={cn("h-2 w-2 rounded-full", item.status === "WAITING_QC" ? "bg-warning" : "bg-danger")} />
                  </div>
                  <p className="mt-1.5 truncate text-sm font-bold text-text-primary">{item.batch?.order?.itemName || item.batch?.order?.productName || item.batch?.order?.orderNumber}</p>
                  <p className="mt-1 text-[11px] text-text-secondary">By {item.batch?.order?.worker?.name || "Worker"}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {renderHeader()}
        {emptyState ? (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-text-tertiary">
            <div>
              <Camera className="mx-auto mb-2 h-10 w-10 opacity-30" />
              <p className="text-sm">No checkpoints were submitted for this inspection.</p>
            </div>
          </div>
        ) : (
          <>
            {renderTabBar()}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              {isFinalTab ? renderFinalPanel() : currentSection ? renderSectionPanel(currentSection) : null}
            </div>
          </>
        )}
      </main>

      {/* Zoom overlay */}
      {zoomedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95 p-4 backdrop-blur-sm" onClick={() => setZoomedImage(null)}>
          <button className="absolute right-4 top-4 rounded-full border border-white/20 bg-white/10 p-2 text-white" onClick={() => setZoomedImage(null)}><X className="h-5 w-5" /></button>
          <img src={zoomedImage} alt="Evidence" className="max-h-full max-w-full rounded-xl object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
