import { getStageJob } from '@/server/actions/stages'
import { getUserSession } from '@/lib/server/auth'
import { redirect } from 'next/navigation'
import StageClient from './client'

export const dynamic = 'force-dynamic';

export default async function WorkerStagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getUserSession();
  if (!session) redirect('/');
  const isOwner = session.role === 'OWNER' || session.role === 'CO_OWNER' || session.role === 'MANAGER';
  if (session.role !== 'WORKER' && session.role !== 'SUPERVISOR' && !isOwner) redirect('/');

  const data = await getStageJob(id);
  if (!data) redirect('/worker');

  // QC stages and legacy cards use the inspection flow instead.
  if (!data.stage || data.stage.isQcStage) redirect(`/worker/inspection/${id}`);

  return <StageClient data={data} />
}
