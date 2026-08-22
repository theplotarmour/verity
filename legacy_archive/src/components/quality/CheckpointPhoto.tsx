"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Loader2, X } from "lucide-react";

import { uploadStorageImage } from "@/server/actions/storage";
import { toast } from "@/components/ui/toast";

/**
 * Photo evidence on a checklist checkpoint.
 *
 * `capture="environment"` is the point of this over a generic file input: on a
 * phone it opens the rear camera directly rather than the photo library. A
 * hygiene or visual-standards audit is done standing in front of the thing
 * being audited, and making someone take a photo, leave the app and come back
 * to attach it is how the photo stops being taken.
 *
 * The upload is anchored to the caller's own factory server-side by
 * `uploadStorageImage`, so the path here is a hint for readability, not a
 * security boundary.
 */
export function CheckpointPhoto({
  value,
  onChange,
  disabled,
  required,
  inspectionId,
  checkpointId,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
  required?: boolean;
  inspectionId: string;
  checkpointId: string;
}) {
  const [pending, start] = useTransition();
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function upload(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      // Show it immediately. A phone camera photo takes a noticeable moment to
      // upload, and without this the tap appears to have done nothing.
      setPreview(dataUrl);
      start(async () => {
        try {
          const result = await uploadStorageImage({
            path: `inspections/${inspectionId}/${checkpointId}-${Date.now()}.jpg`,
            dataUrl,
            fileName: file.name,
            mimeType: file.type,
            size: file.size,
          });
          onChange(result.publicUrl);
        } catch (error) {
          setPreview(null);
          toast.error(error instanceof Error ? error.message : "Could not upload that photo");
        }
      });
    };
    reader.readAsDataURL(file);
  }

  const shown = value ?? preview;

  return (
    <div className="mt-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          if (file) upload(file);
          // Reset, so retaking the same file fires a change event again.
          e.currentTarget.value = "";
        }}
      />

      {shown ? (
        <div className="flex items-center gap-2">
          {/* A plain img, not next/image: the source is either a data URL from
              the camera or a Supabase public URL, and neither benefits from the
              optimiser. */}
          <img
            src={shown}
            alt="Checkpoint evidence"
            className="h-16 w-16 rounded-[10px] border border-border object-cover"
          />
          {pending ? (
            <span className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
              <Loader2 className="h-3 w-3 animate-spin" />
              Uploading…
            </span>
          ) : null}
          {!disabled && !pending ? (
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                onChange(null);
              }}
              className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-border text-text-tertiary transition hover:text-[var(--brand)]"
              aria-label="Remove photo"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || pending}
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-11 items-center gap-2 rounded-[12px] border border-border px-3 text-[13px] font-semibold text-text-secondary transition hover:border-[var(--brand)]/50 hover:text-text-primary disabled:opacity-50"
        >
          <Camera className="h-4 w-4" />
          {required ? "Photo required" : "Add photo"}
        </button>
      )}
    </div>
  );
}
