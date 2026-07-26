"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Video, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { confirmDialog } from "@/components/ui/dialog-service";
import { createClient as createSupabaseBrowserClient } from "@/lib/supabase/client";
import { createQcVideoUploadUrl, attachQcVideo, removeQcVideo } from "@/server/actions/qc-video";

// A walkthrough of the finished piece, captured during QC — any length. Photos
// prove individual checkpoints; this proves the whole item.
//
// The clip goes straight from the browser to Supabase Storage using a signed
// URL minted by the server — a phone video is far too big to pass through a
// server action.

// Best-effort duration read for display only (never a gate). A malformed clip
// simply reports 0s.
function readDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(video.duration || 0); };
      video.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
      video.src = url;
    } catch {
      resolve(0);
    }
  });
}

export function QcVideoCapture({
  inspectionId,
  videoUrl,
  durationSec,
  readOnly = false,
}: {
  inspectionId: string;
  videoUrl?: string | null;
  durationSec?: number | null;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const rounded = Math.round(await readDuration(file));

      const ticket: any = await createQcVideoUploadUrl({
        inspectionId,
        fileName: file.name || "qc-video.mp4",
        mimeType: file.type || "video/mp4",
        sizeBytes: file.size,
        durationSec: rounded,
      });
      if (ticket?.error) { setError(ticket.error); return; }

      // Straight to storage — never through the server action.
      const supabase = createSupabaseBrowserClient();
      const { error: upErr } = await supabase.storage
        .from(ticket.bucket)
        .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type || "video/mp4" });
      if (upErr) { setError(`Upload failed: ${upErr.message}`); return; }

      const saved: any = await attachQcVideo({ inspectionId, path: ticket.path, durationSec: rounded });
      if (saved?.error) { setError(saved.error); return; }

      toast.success(rounded ? `QC video attached (${rounded}s)` : "QC video attached");
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Could not attach the video");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onRemove = async () => {
    const ok = await confirmDialog({
      title: "Remove QC video?",
      description: "You will need to record a new walkthrough.",
      variant: "danger",
      confirmLabel: "Remove",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res: any = await removeQcVideo(inspectionId);
      if (res?.error) { toast.error(res.error); return; }
      toast.success("Video removed");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">
            QC walkthrough video
          </p>
          <p className="text-[11px] text-text-tertiary">
            A walkthrough of the finished piece
          </p>
        </div>
        {!readOnly && (
          videoUrl ? (
            <Button size="sm" variant="secondary" disabled={busy} onClick={onRemove} className="gap-1.5">
              <Trash2 className="h-3.5 w-3.5" /> Replace
            </Button>
          ) : (
            <Button size="sm" disabled={busy} onClick={() => inputRef.current?.click()} className="gap-1.5">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Video className="h-3.5 w-3.5" />}
              {busy ? "Uploading…" : "Record / upload"}
            </Button>
          )
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,video/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0])}
      />

      {videoUrl ? (
        <div className="overflow-hidden rounded-xl border border-border bg-black">
          <video src={videoUrl} controls playsInline preload="metadata" className="h-auto w-full max-h-72" />
          {durationSec ? (
            <p className="bg-surface px-3 py-1.5 text-[11px] text-text-tertiary">
              {Math.round(durationSec)}s walkthrough
            </p>
          ) : null}
        </div>
      ) : (
        !readOnly && (
          <div className="rounded-xl border border-dashed border-border bg-surface-2/40 px-3 py-4 text-center">
            <p className="text-[11px] text-text-tertiary">
              No walkthrough yet — record one on the phone to complete the evidence pack.
            </p>
          </div>
        )
      )}

      {error && (
        <p className="flex items-start gap-1.5 text-[11px] font-medium text-danger">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
