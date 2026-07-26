"use client";

import { InspectorNav } from '@/components/ui-os/InspectorNav'
import { AutoRefresh } from '@/components/providers/AutoRefresh'
import { LiveRefresh } from '@/components/providers/LiveRefresh'
import { IdleLogout } from "@/components/providers/IdleLogout"
import { usePathname } from 'next/navigation'

export default function InspectorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isReviewPage = pathname?.startsWith('/inspector/review/') || pathname?.startsWith('/worker/inspection/');

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-background">
      <AutoRefresh />
      <LiveRefresh />
      <IdleLogout />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,149,0,0.06),transparent_28%),radial-gradient(circle_at_bottom,rgba(52,199,89,0.05),transparent_24%)]" />

      <main className={`relative z-10 flex-1 overflow-y-auto w-full ${!isReviewPage ? 'pb-[calc(80px+env(safe-area-inset-bottom))]' : ''}`}>
        <div className={!isReviewPage ? "mx-auto w-full max-w-md px-4 pt-4 pb-6 md:px-6 md:pt-6" : "w-full h-full"}>
          {children}
        </div>
      </main>

      {!isReviewPage && <InspectorNav />}
    </div>
  )
}
