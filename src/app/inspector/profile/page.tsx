import { Card, SectionHeading } from "@/components/ui/primitives"
import { getUserSession } from "@/lib/server/auth"
import prisma from "@/lib/prisma"
import { redirect } from "next/navigation"
import { LogoutButton } from "@/components/auth/LogoutButton"
import { WorkerSettingsClient } from "@/app/worker/profile/WorkerSettingsClient"
import { getDictionary } from "@/lib/i18n"

export const dynamic = 'force-dynamic';

export default async function InspectorProfilePage() {
  const session = await getUserSession()
  if (!session || (session.role !== 'SUPERVISOR' && session.role !== 'OWNER')) redirect('/')

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  })

  if (!user) redirect('/')
  const dict = getDictionary(user.language || session.language)

  const owner = await prisma.user.findFirst({
    where: { role: 'OWNER', factoryId: session.factoryId }
  })

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <SectionHeading
          eyebrow={dict.inspectorProfile}
          title={user.name}
          description={dict.qualityCheck}
        />
        <div className="mt-3 grid gap-2">
          <ProfileRow label={dict.role} value={user.role} />
        </div>
        <WorkerSettingsClient initialLanguage={user.language ?? "hi"} ownerPhone={owner?.phone || ''} />
        <div className="mt-3">
          <LogoutButton />
        </div>
      </Card>
    </div>
  )
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-surface-2 dark:bg-neutral-800 py-3 px-4 border border-transparent dark:border-neutral-700/60">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">
        {label}
      </p>
      <p className="mt-1.5 text-base font-semibold text-text-primary">{value}</p>
    </div>
  )
}
