import { getInspectionData } from '@/server/actions/worker'
import { getUserSession } from '@/lib/server/auth'
import { getDictionary } from '@/lib/i18n'
import { redirect } from 'next/navigation'
import InspectionClient from './client'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic';

export default async function WorkerInspectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getUserSession();
  if (!session) redirect('/');
  const isOwner = session.role === 'OWNER' || session.role === 'CO_OWNER' || session.role === 'MANAGER';
  if (session.role !== 'WORKER' && !isOwner) {
    redirect('/');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { language: true }
  });

  const batchId = id
  const batch = await getInspectionData(batchId)

  if (!batch) redirect('/worker')

  const dict = getDictionary(user?.language || session.language);

  return <InspectionClient batch={batch} dict={dict} />
}
