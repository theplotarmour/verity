import { getReviewData, getOrderReview } from '@/server/actions/inspector'
import { getUserSession } from '@/lib/server/auth'
import { guardModulePage } from "@/platform/modules/guard";
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/primitives'
import { PageHeader } from '@/components/design/PageHeader'
import { OrderReviewDossier } from './OrderReviewDossier'
import { OrderTimeline } from '@/components/factory/OrderTimeline'
import { getProductionTimeline } from '@/server/actions/timeline'

import { resolveAccess } from '@/platform/rbac/permissions';

export default async function OwnerReviewInspectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getUserSession();
  
  if (!session || (session.role !== 'OWNER' && session.role !== 'CO_OWNER' && session.role !== 'MANAGER')) {
    redirect('/');
  }
  await guardModulePage('quality');
  const access = await resolveAccess(session.userId);
  if (!access?.permissions.has('quality.queue')) redirect('/unauthorized');

  const [inspection, review] = await Promise.all([
    getReviewData(id),
    getOrderReview(id),
  ]);
  if (!inspection || !review) redirect('/owner/production')

  const timelineItems = inspection.batch?.workOrderId
    ? await getProductionTimeline(inspection.batch.workOrderId)
    : [];

  const customerName = review.order.customer?.name || "N/A";
  const title = review.spec.itemName || review.spec.product || review.order.soNumber;

  return (
    <div className="flex flex-col h-[calc(100vh-112px)] overflow-y-auto p-6 md:p-8 gap-6 min-w-0 pb-20 animate-in fade-in duration-300">
      <PageHeader
        eyebrow={`Order review • ${review.order.soNumber}`}
        title={title}
        description={`${review.spec.product || "Order"} • ${customerName}`}
        actions={
          <Link href="/owner/production">
            <Button variant="secondary" className="gap-2 text-xs h-9">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Orders
            </Button>
          </Link>
        }
      />

      {/* Complete order dossier: details, spec, materials, assignments and the
          per-department checklist trail with the templates each department ran. */}
      <OrderReviewDossier review={review} />

      <OrderTimeline
        items={timelineItems}
        orderLabel={review.order.soNumber || "Order"}
      />
    </div>
  )
}
