"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Surface } from "@/components/design/Surface";

export function OrderFlow({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Surface className={cn("p-5", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">
        {title}
      </p>
      <div className="mt-4 space-y-4">{children}</div>
    </Surface>
  );
}

