import { WorkerNav } from '@/components/ui-os/WorkerNav'
import { AutoRefresh } from '@/components/providers/AutoRefresh'
import { LiveRefresh } from '@/components/providers/LiveRefresh'
import { IdleLogout } from "@/components/providers/IdleLogout"
import { getUserSession } from '@/lib/server/auth'
import prisma from '@/lib/prisma'
import { InstallPromptBanner } from '@/components/layout/InstallPromptBanner'
import { LanguageProvider } from '@/components/providers/language-provider'
import { hasModule } from '@/platform/modules/entitlements'
import { BRAND_ACCENT } from "@/lib/brand";

export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  const session = await getUserSession()
  const user = session ? await prisma.user.findUnique({
    where: { id: session.userId },
    include: { factory: true }
  }) : null;
  const lang = user?.language || session?.language || 'en';
  const settings = (user?.factory?.settings as any) || {};
  const accentColor = settings.themeColor || BRAND_ACCENT;

  // The Schedule tab only exists for tenants that actually publish a roster.
  const showSchedule = user?.factory
    ? await hasModule(user.factory.organizationId, "scheduling")
    : false;

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-background">
      <AutoRefresh />
      <LiveRefresh />
      <IdleLogout />
      <InstallPromptBanner accentColor={accentColor} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,122,255,0.06),transparent_28%),radial-gradient(circle_at_bottom,rgba(52,199,89,0.05),transparent_24%)]" />

      <LanguageProvider initialLanguage={lang}>
        <main className="relative z-10 flex-1 overflow-y-auto px-4 pt-4 pb-[calc(80px+env(safe-area-inset-bottom))] md:px-6 md:pt-6">
          <div className="mx-auto w-full max-w-md pb-6">
            {children}
          </div>
        </main>

        <WorkerNav showSchedule={showSchedule} />
      </LanguageProvider>
    </div>
  )
}
