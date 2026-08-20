"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ClipboardList, MapPin, Play, User } from "lucide-react";

import { Surface } from "@/components/design/Surface";
import { Button } from "@/components/ui/primitives";
import { setMyServiceJobStatus } from "@/server/actions/helpdesk";

/**
 * The job sheet a technician works from.
 *
 * Two buttons, because a visit has two moments worth recording: arriving and
 * finishing. Everything else on this screen is read-only detail — a phone held
 * in one hand at a customer's door is the wrong place to edit a work order.
 */

type Job = {
  id: string;
  woNumber: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  priority: string;
  scheduledAt: string | null;
  siteName: string | null;
  siteAddress: string | null;
  customerName: string | null;
  checklistName: string | null;
};

const timeFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export function JobClient({ job }: { job: Job }) {
  const router = useRouter();
  const [status, setStatus] = useState(job.status);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function move(to: "IN_PROGRESS" | "COMPLETED") {
    setError(null);
    startTransition(async () => {
      const result = await setMyServiceJobStatus(job.id, to);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      setStatus(to);
      // Completed work leaves the list, so send them back to it rather than
      // leaving a finished job on screen with nothing left to do.
      if (to === "COMPLETED") router.push("/worker");
      else router.refresh();
    });
  }

  const done = status === "COMPLETED";

  return (
    <div className="space-y-4">
      <Link
        href="/worker"
        className="-ml-1 flex items-center gap-1.5 text-sm font-medium text-text-secondary"
      >
        <ArrowLeft className="h-4 w-4" />
        My day
      </Link>

      <Surface className="space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
            {job.woNumber}
          </span>
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-text-secondary">
            {status.replace(/_/g, " ")}
          </span>
          {job.category && (
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-text-tertiary">
              {job.category}
            </span>
          )}
        </div>

        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-text-primary">
          {job.title}
        </h1>

        {job.scheduledAt && (
          <p className="text-sm text-text-secondary">{timeFmt.format(new Date(job.scheduledAt))}</p>
        )}

        {job.description && (
          <p className="whitespace-pre-line text-sm text-text-secondary">{job.description}</p>
        )}
      </Surface>

      {(job.siteName || job.customerName) && (
        <Surface className="space-y-3 p-5">
          {job.siteName && (
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary">{job.siteName}</p>
                {job.siteAddress && (
                  <p className="mt-0.5 text-xs text-text-secondary">{job.siteAddress}</p>
                )}
              </div>
            </div>
          )}
          {job.customerName && (
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 shrink-0 text-text-tertiary" />
              <p className="text-sm text-text-primary">{job.customerName}</p>
            </div>
          )}
        </Surface>
      )}

      {job.checklistName && (
        <Surface className="flex items-start gap-3 p-5">
          <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary" />
          <div>
            <p className="text-sm font-semibold text-text-primary">{job.checklistName}</p>
            <p className="mt-0.5 text-xs text-text-secondary">
              The inspection sheet opens for your supervisor when you mark this complete.
            </p>
          </div>
        </Surface>
      )}

      {error && <p className="px-1 text-sm text-danger">{error}</p>}

      {!done && (
        <div className="space-y-3">
          {status !== "IN_PROGRESS" && (
            <Button
              className="h-14 w-full text-base"
              onClick={() => move("IN_PROGRESS")}
              disabled={pending}
            >
              <Play className="mr-2 h-5 w-5" />
              Start work
            </Button>
          )}
          <Button
            variant={status === "IN_PROGRESS" ? "primary" : "secondary"}
            className="h-14 w-full text-base"
            onClick={() => move("COMPLETED")}
            disabled={pending}
          >
            <CheckCircle2 className="mr-2 h-5 w-5" />
            {pending ? "Saving…" : "Mark complete"}
          </Button>
        </div>
      )}
    </div>
  );
}
