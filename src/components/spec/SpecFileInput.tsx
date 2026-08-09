"use client";

import { useRef, useState, useTransition } from "react";
import { uploadStorageImage } from "@/server/actions/storage";
import { toast } from "@/components/ui/toast";

/**
 * Upload a file and keep its public URL as the field's answer.
 *
 * The URL is stored in valueText like any other string — an IMAGE field is a
 * TEXT field whose input happens to be a file picker and whose cell happens to
 * render a thumbnail. That is why adding these types needed no new column.
 */
export function SpecFileInput({
  value,
  onChange,
  kind,
  disabled,
  fieldKey,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  kind: "IMAGE" | "FILE";
  disabled?: boolean;
  /** Used to keep uploaded paths readable in the bucket. */
  fieldKey: string;
}) {
  const [pending, start] = useTransition();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function upload(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      start(async () => {
        try {
          const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
          const result = await uploadStorageImage({
            path: `spec/${fieldKey}/${Date.now()}-${safe}`,
            dataUrl,
            fileName: file.name,
            mimeType: file.type,
            size: file.size,
          });
          onChange(result.publicUrl);
        } catch (error) {
          // The upload validator rejects by type and size; surfacing its own
          // message beats a generic failure the owner cannot act on.
          toast.error(error instanceof Error ? error.message : "Upload failed");
        }
      });
    };
    reader.readAsDataURL(file);
  }

  if (value) {
    return (
      <div className="flex items-center gap-2">
        {kind === "IMAGE" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt=""
            className="h-12 w-12 shrink-0 rounded-lg border border-border object-cover"
          />
        ) : (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 flex-1 truncate text-sm text-[var(--brand)] hover:underline"
          >
            {value.split("/").pop()}
          </a>
        )}
        <button
          type="button"
          disabled={disabled || pending}
          onClick={() => onChange(null)}
          className="shrink-0 text-[11px] text-text-tertiary hover:text-red-600"
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled || pending}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) upload(file);
      }}
      className={`flex h-[42px] w-full items-center justify-center rounded-xl border border-dashed text-xs font-bold transition ${
        dragging
          ? "border-[var(--brand)] bg-brand-soft text-[var(--brand)]"
          : "border-border text-text-tertiary hover:border-[var(--brand)]/50 hover:text-text-primary"
      } disabled:opacity-50`}
    >
      {pending ? "Uploading…" : kind === "IMAGE" ? "Upload image" : "Upload file"}
      <input
        ref={inputRef}
        type="file"
        accept={kind === "IMAGE" ? "image/*" : undefined}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) upload(file);
        }}
      />
    </button>
  );
}
