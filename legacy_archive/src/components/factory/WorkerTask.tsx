"use client";

import Link from "next/link";
import { Surface } from "@/components/design/Surface";
import { Button } from "@/components/ui/primitives";

export function WorkerTask({
  title,
  batch,
  details,
  href,
  todayWorkLabel = "Today's work",
  startCheckLabel = "Start Check",
}: {
  title: string;
  batch: string;
  details?: string;
  href: string;
  todayWorkLabel?: string;
  startCheckLabel?: string;
}) {
  return (
    <Surface>
      <div className="p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">{todayWorkLabel}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-text-primary">{title}</h2>
        <p className="mt-1 font-mono text-xs text-text-tertiary">{batch}</p>
        {details ? <p className="mt-3 text-sm text-text-secondary">{details}</p> : null}
        <Link href={href} className="mt-4 block">
          <Button className="w-full">{startCheckLabel}</Button>
        </Link>
      </div>
    </Surface>
  );
}

