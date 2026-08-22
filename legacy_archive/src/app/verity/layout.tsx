import Link from "next/link";

import { VerityLogo } from "@/components/ui/VerityLogo";
import { isOperator, requireHqPage } from "@/lib/server/hq-auth";

/**
 * Verity HQ — the operator surface, above every tenant.
 *
 * Deliberately unlike the owner shell: no factory branding, no theme colour, no
 * module-driven nav. An operator working across twenty workspaces should never
 * be unsure which one they are looking at, and inheriting a tenant's accent
 * colour here is exactly how that mistake gets made.
 */
export default async function HqLayout({ children }: { children: React.ReactNode }) {
  const result = await requireHqPage();

  // Refused, but signed in: say why. A blank redirect here is what made this
  // impossible to configure.
  if (!isOperator(result)) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0A0A0B] px-5 text-white">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/35">
            Verity HQ
          </p>
          <h1 className="mt-2 font-display text-xl font-semibold tracking-[-0.03em]">
            This account cannot open HQ
          </h1>

          {result.allowlistConfigured ? (
            <p className="mt-3 text-sm leading-relaxed text-white/55">
              You are signed in as{" "}
              <span className="font-mono text-white">{result.signedInAs ?? "an account with no phone number"}</span>
              , which is not on the operator list. Sign in as an operator account, or add this
              number to <span className="font-mono text-white">VERITY_HQ_PHONES</span> and restart
              the server.
            </p>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-white/55">
              <span className="font-mono text-white">VERITY_HQ_PHONES</span> is not set on this
              server, so HQ admits nobody. Set it to a comma-separated list of operator phone
              numbers and restart.
              <span className="mt-2 block text-white/40">
                Environment is read at boot, so editing it while the server runs changes nothing.
                On a hosted deployment <span className="font-mono">.env</span> is not uploaded —
                set it in the host&apos;s environment settings.
              </span>
            </p>
          )}

          <Link
            href="/owner/dashboard"
            className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-white/12 px-4 text-[13px] font-semibold text-white/70 transition-colors hover:border-white/30 hover:text-white"
          >
            Back to workspace
          </Link>
        </div>
      </div>
    );
  }

  const operator = result;

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#0A0A0B] text-white">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-5">
        <div className="flex items-center gap-4">
          <Link href="/verity/clients" className="flex items-center gap-2.5">
            <VerityLogo size={24} />
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
