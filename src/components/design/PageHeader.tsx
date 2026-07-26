"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";

import { usePathname } from "next/navigation";
import { useMemo } from "react";

export function PageHeader({
  eyebrow,
  breadcrumbs,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  breadcrumbs?: { label: string; href?: string }[];
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  
  // Auto-generate breadcrumbs if not provided and not on dashboard
  const generatedBreadcrumbs = useMemo(() => {
    if (breadcrumbs) return breadcrumbs;
    if (!pathname || pathname === "/owner/dashboard") return null;
    
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length <= 1) return null;
    
    return parts.map((part, index) => {
      const href = "/" + parts.slice(0, index + 1).join("/");
      const label = part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, " ");
      return { label, href: index === parts.length - 1 ? undefined : href };
    });
  }, [pathname, breadcrumbs]);

  const displayBreadcrumbs = breadcrumbs || generatedBreadcrumbs;

  return (
    <div className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}>
      <div>
        {displayBreadcrumbs && displayBreadcrumbs.length > 0 ? (
          <nav className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary mb-2">
            {displayBreadcrumbs.map((bc, idx) => (
              <span key={idx} className="flex items-center gap-2">
                {bc.href ? (
                  <Link href={bc.href} className="hover:text-text-primary transition-colors">{bc.label}</Link>
                ) : (
                  <span className="text-text-secondary">{bc.label}</span>
                )}
                {idx < displayBreadcrumbs.length - 1 && <span>/</span>}
              </span>
            ))}
          </nav>
        ) : eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2 text-[clamp(28px,3vw,40px)] font-semibold tracking-[-0.04em] text-text-primary">
          {title}
        </h1>
        {description ? <p className="mt-2 max-w-2xl text-sm text-text-secondary">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

