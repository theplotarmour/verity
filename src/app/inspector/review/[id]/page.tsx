import { getReviewData, approveInspection, rejectInspection, getInspectorInbox, getPackingOperators } from '@/server/actions/inspector'
import { getUserSession } from '@/lib/server/auth'
import { getDictionary } from '@/lib/i18n'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react'
import { ReviewCheckpoints } from './ReviewCheckpoints'

import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic';

export default async function ReviewInspectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getUserSession();
  if (!session || (session.role !== 'SUPERVISOR' && session.role !== 'OWNER' && session.role !== 'CO_OWNER' && session.role !== 'MANAGER')) {
    redirect('/');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { language: true }
  });

  const isOwner = session.role === 'OWNER' || session.role === 'CO_OWNER' || session.role === 'MANAGER';
  const backUrl = isOwner ? '/owner/production' : '/inspector';

  const [inspection, queue, packingOperators] = await Promise.all([
    getReviewData(id),
    getInspectorInbox('pending'),
    getPackingOperators()
  ]);

  if (!inspection) redirect(backUrl)

  const dict = getDictionary(user?.language || session.language);

  return (
    <div className="h-screen w-full overflow-hidden bg-background text-text-primary flex flex-col min-w-0">
      <ReviewCheckpoints 
        inspection={inspection} 
        queue={queue} 
        backUrl={backUrl} 
        isOwner={isOwner} 
        dict={dict} 
        packingOperators={packingOperators}
      />
    </div>
  );
}
