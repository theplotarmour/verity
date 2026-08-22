import { Card, SectionHeading } from "@/components/ui/primitives"
import { getUserSession } from "@/lib/server/auth"
import prisma from "@/lib/prisma"
import { redirect } from "next/navigation"
import { LogoutButton } from "@/components/auth/LogoutButton"
import { WorkerSettingsClient } from "./WorkerSettingsClient"
import { getDictionary } from "@/lib/i18n"

export const dynamic = 'force-dynamic';

export default async function WorkerProfilePage() {
  const session = await getUserSession()
  if (!session || (session.role !== 'WORKER' && session.role !== 'SUPERVISOR' && session.role !== 'OWNER')) redirect('/')

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  })

  if (!user) redirect('/')
  const dict = getDictionary(user.language || session.language)

  // Job cards were what a worker was assigned; they went with the
  // manufacturing module, and nothing replaced them.
  const assignmentsCount = 0

  const owner = await prisma.user.findFirst({
    where: { role: 'OWNER', factoryId: session.factoryId }
  })

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <SectionHeading
          eyebrow={dict.workerProfile}
          title={user.name}
          description={dict.chooseLanguage}
        />
        <div className="mt-3 grid gap-2">
          <div className="rounded-[18px] bg-surface-2 dark:bg-neutral-800 py-3 px-4 border border-transparent dark:border-neutral-700/60">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">
              {dict.role}
            </p>
            <p className="mt-1.5 text-base font-semibold text-text-primary">{user.role}</p>
          </div>
          <div className="rounded-[18px] bg-surface-2 dark:bg-neutral-800 py-3 px-4 border border-transparent dark:border-neutral-700/60">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">
              {dict.assignedInspections}
            </p>
            <p className="mt-1.5 text-base font-semibold text-text-primary">{String(assignmentsCount)}</p>
          </div>
        </div>
        
        <WorkerSettingsClient initialLanguage={user.language ?? 'hi'} ownerPhone={owner?.phone || ''} />
        
        <div className="mt-3">
          <LogoutButton />
        </div>
      </Card>
    </div>
  )
}
