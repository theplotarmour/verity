import Link from "next/link";

import { requireHqPage } from "@/lib/server/hq-auth";

/**
 * Verity HQ — the operator surface, above every tenant.
 *
 * Deliberately unlike the owner shell: no factory branding, no theme colour, no
 * module-driven nav. An operator working across twenty workspaces should never
 * be unsure which one they are looking at, and inheriting a tenant's accent
 * colour here is exactly how that mistake gets made.
 */
export default async function HqLayout({ children }: { children: React.ReactNode }) {
  const operator = await requireHqPage();

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#0A0A0B] text-white">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-5">
        <div className="flex items-center gap-4">
          <Link href="/verity/clients" className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FF1D2A] text-[11px] font-bold">
              V
            </span>
            <span className="font-display text-sm font-semibold tracking-[0.14em]">
              VERITY <span className="text-white/40">HQ</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            <Link
              href="/verity/clients"
              className="rounded-full px-3 py-1.5 text-[12px] font-medium text-white/55 transition-colors hover:bg-white/5 hover:text-white"
            >
              Clients
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-[11px] text-white/35 sm:inline">
            {operator.name} · {operator.phone}
          </span>
          <Link
            href="/owner"
            className="flex min-h-9 items-center rounded-full border border-white/12 px-3 text-[11px] font-medium text-white/60 transition-colors hover:border-white/30 hover:text-white"
          >
            Exit to workspace
          </Link>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
