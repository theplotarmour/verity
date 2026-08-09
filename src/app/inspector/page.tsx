import { getInspectorInbox } from "@/server/actions/inspector";
import { enforceRole } from "@/lib/server/auth";
import { getDictionary } from "@/lib/i18n";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Clock, CheckCircle, Inbox } from "lucide-react";
import { PageHeader } from "@/components/design/PageHeader";
import { Surface } from "@/components/design/Surface";
import { Badge, Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { getSessionDepartment } from "@/lib/server/roleHome";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function InspectorInboxPage({
  searchParams,
}: {
  searchParams?: Promise<{ filter?: string }>;
}) {
  const session = await enforceRole(["SUPERVISOR", "OWNER", "CO_OWNER", "MANAGER"]);
  if (session.role === "SUPERVISOR") {
    const department = await getSessionDepartment(session);
    if (!department?.isQcStage) redirect("/supervisor");
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { language: true, name: true }
  });

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const currentFilter = resolvedSearchParams.filter === "reviewed" ? "reviewed" : "pending";
  const inbox = await getInspectorInbox(currentFilter);
  const dict = getDictionary(user?.language || session.language);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={dict.qualityCheck}
        title={dict.reviewQueue}
        description={currentFilter === "pending" ? `${inbox.length} ${dict.waiting}` : `${inbox.length} ${dict.reviewed}`}
        actions={(
          <div className="flex rounded-full border border-border bg-surface-2 p-1">
            <Tab href="/inspector?filter=pending" active={currentFilter === "pending"} icon={<Clock className="h-4 w-4" />} label={dict.pending} />
            <Tab href="/inspector?filter=reviewed" active={currentFilter === "reviewed"} icon={<CheckCircle className="h-4 w-4" />} label={dict.reviewed} />
          </div>
        )}
      />

      <Surface className="p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">
          {dict.goodMorning} {user?.name || dict.qualityChecker}
        </p>
      </Surface>

      <Surface>
        <div className="space-y-3 p-5">
          {inbox.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-border bg-surface-2 p-8 text-center text-sm text-text-secondary">
              {currentFilter === "pending" ? (
                <div>
                  <p className="text-base font-bold text-text-primary">✓ {dict.factoryClear}</p>
                  <p className="text-xs text-text-secondary mt-1">{dict.reviewsComplete}</p>
                </div>
              ) : (
                dict.noReviewed
              )}
            </div>
          ) : (
            inbox.map((inspection: any) => {
              const subs = inspection.submissions || [];
              const issuesCount = subs.filter((s: any) => s.passFail === 'FAIL').length;
              return (
                <Link key={inspection.id} href={`/inspector/review/${inspection.id}`} className="block">
                  <div className="flex flex-col gap-4 rounded-[20px] border border-border bg-surface p-4 transition hover:border-[var(--brand)]/35 hover:shadow-md">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-base font-bold tracking-tight text-text-primary">
                          {inspection.batch.order.itemName || inspection.batch.order.productName || inspection.batch.order.orderNumber}
                        </h3>
                        <p className="text-xs text-text-secondary mt-1">
                          {dict.worker}: <span className="font-semibold text-text-primary">{inspection.batch.order.worker?.name || "—"}</span>
                        </p>
                      </div>
                      <Badge className={
                        inspection.status === "WAITING_QC"
                          ? "bg-warning-soft text-warning"
                          : inspection.status === "APPROVED"
                            ? "bg-success-soft text-success"
                            : "bg-danger-soft text-danger"
                      }>
                        {inspection.status === "WAITING_QC" ? dict.pending : inspection.status}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-neutral-800 pt-3 text-xs text-text-secondary">
                      <div className="flex gap-4">
                        <span>{dict.completed}: <span className="font-bold text-text-primary">{subs.length}/{subs.length} {dict.checks}</span></span>
                        <span>{dict.issues}: <span className={cn("font-bold", issuesCount > 0 ? "text-danger" : "text-success")}>{issuesCount}</span></span>
                      </div>
                      <Button variant="primary" className="px-4 py-1.5 h-8 text-xs font-bold rounded-xl">
                        {dict.review}
                      </Button>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </Surface>
    </div>
  );
}

function Tab({
  href,
  active,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${active ? "bg-[var(--brand)] text-white shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
    >
      {icon}
      {label}
    </Link>
  );
}
