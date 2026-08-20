import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { BRAND_ACCENT } from "@/lib/brand";

/**
 * The white-label shell for a tenant's customer-facing portal.
 *
 * Path routing (`/c/<slug>/…`) rather than subdomain middleware. A subdomain
 * needs a DNS record and a wildcard certificate per tenant before anything
 * renders; a path segment works the moment a tenant is provisioned, and the
 * lookup is the same either way. Moving to subdomains later changes this file
 * and the middleware, not the pages.
 *
 * No Verity branding below this line. The whole point of a white-label portal is
 * that the customer is dealing with the salon, not with us — so the tenant's own
 * name and logo lead, and the accent is theirs.
 *
 * The accent is injected as an inline `--brand` on a wrapper rather than by
 * swapping a stylesheet, so it cascades to everything the pages already style
 * with `var(--brand)` and needs no per-component prop. It is validated as a
 * six-digit hex in `updateTenantBrand` before it is ever stored, and re-checked
 * here: this value lands in a `style` attribute, and a stored string that got
 * there another way must not become one.
 */

const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * A readable foreground for the tenant's accent.
 *
 * Relative luminance by the WCAG formula, then black or white against it. A
 * tenant picking a pale yellow gets dark text on their buttons instead of the
 * white-on-white the owner shell used to produce.
 */
function contrastOn(hex: string): string {
  const channel = (i: number) => {
    const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
  return luminance > 0.45 ? "#111111" : "#ffffff";
}

export default async function PortalLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ clientSlug: string }>;
}) {
  const { clientSlug } = await params;

  /*
   * The layout resolves the tenant for branding only, with no module check: a
   * tenant exists whether or not they have `booking`. Each page runs its own
   * `resolvePortalTenant` with the module it needs, so an un-entitled portal is
   * a 404 on the page rather than a themed shell around nothing.
   */
  const factory = await prisma.factory.findUnique({
    where: { slug: clientSlug.trim().toLowerCase() },
    select: { name: true, logoUrl: true, settings: true },
  });
  if (!factory) notFound();

  const stored = (factory.settings as { themeColor?: unknown } | null)?.themeColor;
  const accent = typeof stored === "string" && HEX.test(stored) ? stored : BRAND_ACCENT;

  return (
    <div
      className="min-h-[100dvh] bg-background"
      style={
        {
          "--brand": accent,
          "--brand-strong": accent,
          "--brand-contrast": contrastOn(accent),
        } as React.CSSProperties
      }
    >
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-lg items-center gap-3 px-4 py-3">
          {factory.logoUrl ? (
            <img
              src={factory.logoUrl}
              alt={factory.name}
              className="h-9 w-9 rounded-xl object-cover"
            />
          ) : (
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold"
              style={{ background: "var(--brand)", color: "var(--brand-contrast)" }}
            >
              {factory.name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <p className="truncate text-base font-semibold tracking-[-0.02em] text-text-primary">
            {factory.name}
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg px-4 pb-16 pt-4">{children}</main>
    </div>
  );
}
