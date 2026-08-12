"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, Check, Info, X } from "lucide-react";

import { dismissAllNotifications, dismissNotification } from "@/server/actions/notifications";
import { cn } from "@/lib/utils";

export type WarningRow = {
  id: string;
  title: string;
  message: string;
  type: string;
  linkUrl: string | null;
  createdAt: string | Date;
};

/**
 * The operational warnings queue.
 *
 * The alerts the QC and stage-hold triggers write have to land somewhere an owner
 * actually looks. The bell in the shell is behind a click and had no way to clear
 * anything, so an unread pile there is indistinguishable from an empty one.
 *
 * Dismissal is optimistic — a queue that takes 400ms to acknowledge a click gets
 * clicked twice. The row is removed immediately and restored if the write fails,
 * because silently swallowing the failure would leave the owner believing they had
 * cleared something they had not.
 */
export function WarningsQueue({ initial }: { initial: WarningRow[] }) {
  const [rows, setRows] = useState(initial);
  const [pending, startTransition] = useTransition();

  const dismissOne = (id: string) => {
    const previous = rows;
    setRows((current) => current.filter((row) => row.id !== id));
    startTransition(async () => {
      const result = await dismissNotification(id);
      if ((result as { error?: string })?.error) setRows(previous);
    });
  };

  const dismissAll = () => {
    const previous = rows;
    setRows([]);
    startTransition(async () => {
      const result = await dismissAllNotifications();
      if ((result as { error?: string })?.error) setRows(previous);
    });
  };

  if (rows.length === 0) {
    return (
      <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-2 py-6 text-center">
        <Check className="h-5 w-5 text-success" />
        <p className="max-w-[38ch] text-[13px] text-text-secondary">
          Nothing outstanding. Failed QC audits and stopped stages appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rows.length > 1 ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={dismissAll}
            disabled={pending}
            className="text-[11px] font-semibold text-text-tertiary transition hover:text-text-secondary disabled:opacity-50"
          >
            Clear all {rows.length}
          </button>
        </div>
      ) : null}

      {rows.map((row) => {
        // ACTION_REQUIRED is what the QC-score and machine-failure triggers send.
        const urgent = row.type === "ACTION_REQUIRED" || row.type === "ERROR";
        const Icon = urgent ? AlertTriangle : Info;

        return (
          <div
            key={row.id}
            className={cn(
              "flex items-start gap-3 rounded-[18px] border bg-surface-2 px-4 py-3",
              urgent ? "border-[var(--brand)]/30" : "border-border"
            )}
          >
            <Icon
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0",
                urgent ? "text-[var(--brand)]" : "text-text-tertiary"
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-text-primary">{row.title}</p>
              <p className="mt-0.5 text-[12px] leading-snug text-text-secondary">{row.message}</p>
              <div className="mt-1 flex items-center gap-2">
                <time
                  dateTime={new Date(row.createdAt).toISOString()}
                  className="font-mono text-[10px] text-text-tertiary"
                >
                  {relativeTime(row.createdAt)}
                </time>
                {row.linkUrl ? (
                  <Link
                    href={row.linkUrl}
                    className="text-[11px] font-semibold text-[var(--brand)] underline-offset-4 hover:underline"
                  >
                    Open
                  </Link>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={() => dismissOne(row.id)}
              disabled={pending}
              // The icon alone is not a name, and this is the only control here
              // that discards something.
              aria-label={`Dismiss: ${row.title}`}
              title="Dismiss"
              className="shrink-0 rounded-lg p-1 text-text-tertiary transition hover:bg-surface hover:text-text-primary disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/**
 * "12m ago" — the only thing an operations reader wants from a timestamp on an
 * alert. Rendered client-side on purpose: a server-formatted relative time is
 * wrong the moment the page is cached.
 */
function relativeTime(value: string | Date): string {
  const then = new Date(value).getTime();
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
