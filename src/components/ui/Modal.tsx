"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/primitives";

/**
 * A modal dialog.
 *
 * Task 71 item 6. Creating a supplier, an order or a payment used to expand a
 * panel *inside* the page, which pushed the table it belonged to down the
 * screen and left the user filling a form with unrelated rows still competing
 * for attention. Worse, two panels could be open at once and neither said which
 * of them a refusal banner referred to.
 *
 * Implemented on the native `<dialog>` element rather than a div with a
 * z-index. `showModal()` gives the top layer, the inert backdrop, focus
 * containment and Escape-to-close from the platform — all four of which are
 * where hand-rolled modals go wrong, and none of which we can implement better.
 *
 * ADR-011: the dialog surface is the elevated material and carries glass. The
 * form inside does not — these are dense forms, and ADR-011 keeps dense forms
 * solid. So the glass is on the shell and the body is `bg-surface`.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** One line under the title. Say what the form does, not what it is. */
  description?: string;
  children: ReactNode;
  /** Actions. Rendered right-aligned on a hairline; the primary goes last. */
  footer?: ReactNode;
  width?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  // `open` is React state; the dialog's own openness is DOM state. They are
  // synchronised here rather than by rendering the `open` attribute, because
  // the attribute opens a NON-modal dialog — no top layer, no backdrop, no
  // focus containment. Only showModal() gives those.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // The page behind a modal must not scroll: on a phone, a form with the
  // keyboard up otherwise scrolls the list underneath instead of the form.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const handleCancel = useCallback(
    (event: React.SyntheticEvent<HTMLDialogElement>) => {
      // Escape fires `cancel`, which would close the dialog directly and leave
      // React's `open` prop saying it is still open.
      event.preventDefault();
      onClose();
    },
    [onClose],
  );

  // Rendered into the body so an ancestor's `overflow: hidden`, `transform` or
  // stacking context cannot clip or trap it. Skipped entirely before mount so
  // this stays safe in a server-rendered tree.
  if (typeof document === "undefined") return null;

  return createPortal(
    <dialog
      ref={ref}
      onCancel={handleCancel}
      onClick={(event) => {
        // The backdrop is painted by the dialog element itself, so a click on
        // it targets the dialog rather than a child. Comparing the target to
        // the element is how you tell "outside" from "inside" without adding a
        // wrapper div that would break the native backdrop.
        if (event.target === ref.current) onClose();
      }}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={
        "m-auto w-[calc(100vw-2rem)] rounded-2xl border border-line p-0 " +
        "text-text shadow-[var(--shadow-lg)] backdrop:bg-[rgba(15,17,21,0.45)] " +
        "backdrop:backdrop-blur-[2px] open:animate-none " +
        (width === "sm"
          ? "max-w-[420px] "
          : width === "lg"
            ? "max-w-[900px] "
            : "max-w-[640px] ")
      }
      style={{ background: "var(--color-surface)" }}
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h2 id={titleId} className="m-0 text-[16px] font-medium text-text">
            {title}
          </h2>
          {description && (
            <p
              id={descriptionId}
              className="m-0 mt-1 text-[13px] text-text-secondary"
            >
              {description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={
            "-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-lg text-text-tertiary " +
            "transition-colors duration-150 hover:bg-glass-2 hover:text-text " +
            "focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--color-accent-subtle)]"
          }
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>

      {/* Capped so a long form scrolls inside the dialog rather than growing
          past the viewport with its submit button unreachable. */}
      <div className="max-h-[min(70vh,640px)] overflow-y-auto px-5 py-4">
        {children}
      </div>

      {footer && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3">
          {footer}
        </div>
      )}
    </dialog>,
    document.body,
  );
}

/** The cancel button every modal footer wants, so none of them re-decide it. */
export function ModalCancel({
  onClose,
  disabled,
  children = "Cancel",
}: {
  onClose: () => void;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <Button type="button" onClick={onClose} disabled={disabled}>
      {children}
    </Button>
  );
}
