import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Clock, CreditCard, Lock } from "lucide-react";

import { getOwnerUser } from "@/lib/server/owner";
import { canUser } from "@/lib/server/permissions";
import { PageHeader } from "@/components/design/PageHeader";
import { Badge, Card } from "@/components/ui/primitives";
import { getBillingAccount } from "@/server/actions/billing-account";
import { TRIAL } from "@/platform/pricing";

/**
 * What this tenant pays, and why.
 *
 * A tenant who cannot see why their bill changed will ask, and that question
 * costs more than the screen. So every line is itemised and the total is the sum
 * of what is shown — no "other charges".
 *
 * Read-only by design. A tenant who could edit their own team bracket could give
 * themselves eighty users for the price of ten.
 */
export default async function TenantBillingPage() {
  const dbUser = await getOwnerUser();
  if (!dbUser) redirect("/");
  if (!(await canUser(dbUser, "ACCESS_BILLING"))) redirect("/unauthorized");

  const account = await getBillingAccount();

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Settings"
        title="Billing"
        description="Your plan, what it costs, and every invoice we have issued."
      />

      {!account ? (
        <Card>
          <p className="text-[13px] text-text-secondary">
            This workspace is not on a metered subscription yet, so there is nothing to show here.
            Your access is unaffected — get in touch when you want a plan set up.
          </p>
        </Card>
      ) : (
        <>
          {/* Status first. On a frozen or expiring workspace this is the only
              thing on the page anyone reads. */}
          <Card
            className={
              account.frozen
                ? "border-[var(--brand)]/40"
                : account.status === "TRIAL"
                  ? "border-[var(--warning)]/40"
                  : undefined
            }
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {account.frozen ? (
                    <Lock className="h-4 w-4 text-[var(--brand)]" />
                  ) : account.status === "TRIAL" ? (
                    <Clock className="h-4 w-4 text-[var(--warning)]" />
                  ) : (
                    <CreditCard className="h-4 w-4 text-success" />
                  )}
                  <h2 className="font-display text-[16px] font-semibold text-text-primary">
                    {account.statusLabel}
                  </h2>
                </div>

                {account.status === "TRIAL" && account.trialDaysLeft !== null ? (
                  <p className="mt-2 text-[13px] text-text-secondary">
                    {account.trialDaysLeft === 0
                      ? "Your trial ends today."
                      : `${account.trialDaysLeft} day${account.trialDaysLeft === 1 ? "" : "s"} left on your ${TRIAL.days}-day trial.`}{" "}
                    When it ends the workspace becomes read-only — nothing is deleted.
                  </p>
                ) : null}

                {account.frozen ? (
                  <p className="mt-2 max-w-[60ch] text-[13px] text-text-secondary">
                    You can still read everything. Making changes needs an active plan.
                    {account.retentionDaysLeft !== null ? (
                      <>
                        {" "}
                        Your data is kept for{" "}
                        <strong className="text-text-primary">
                          {account.retentionDaysLeft} more day
                          {account.retentionDaysLeft === 1 ? "" : "s"}
                        </strong>
                        .
                      </>
                    ) : null}
                  </p>
                ) : null}
              </div>

              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-tertiary">
                  Monthly
                </p>
                <p className="mt-1 font-mono text-[28px] font-bold tracking-[-0.04em] text-text-primary">
                  {account.monthlyTotalLabel}
                </p>
              </div>
            </div>

            {/* Retention is a deadline. It belongs where it cannot be missed. */}
            {account.frozen && account.retentionDaysLeft !== null && account.retentionDaysLeft <= 7 ? (
              <div className="mt-4 flex items-start gap-2 rounded-[12px] border border-[var(--brand)]/30 bg-[var(--brand-soft)] p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" />
                <p className="text-[12px] text-text-primary">
                  This workspace is close to the end of its retention window. Contact us to
                  reactivate it before the data is scheduled for removal.
                </p>
              </div>
            ) : null}
          </Card>

          {/* The itemisation. The total above is the sum of exactly these rows. */}
          <Card>
            <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
              <h2 className="font-display text-[15px] font-semibold text-text-primary">
                What you are paying for
              </h2>
              {account.pack ? <Badge className="bg-brand-soft text-brand-strong">Pack</Badge> : null}
            </div>

            <div className="mt-3 divide-y divide-border/50">
              {account.lines.map((line) => (
                <div key={line.itemKey} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0 truncate text-[13px] text-text-primary">{line.label}</span>
                  <span className="shrink-0 font-mono text-[13px] font-semibold text-text-secondary">
                    {line.priceLabel}
                  </span>
                </div>
              ))}

              <div className="flex items-center justify-between gap-3 pt-3">
                <span className="text-[13px] font-semibold text-text-primary">Total each month</span>
                <span className="font-mono text-[15px] font-bold text-text-primary">
                  {account.monthlyTotalLabel}
                </span>
              </div>
            </div>

            <p className="mt-4 text-[11px] text-text-tertiary">
              Team size is billed in brackets, not per person — you are on{" "}
              <strong className="text-text-secondary">{account.bracket.label}</strong> (
              {account.bracket.priceLabel}). Hiring within your bracket costs nothing extra. A
              module active for any part of a month is charged for that month.
            </p>

            {account.pack ? (
              <p className="mt-2 text-[11px] text-text-tertiary">
                Modules are covered by your {account.pack.label} pack. To change which are active,{" "}
                <Link href="/owner/settings" className="text-[var(--brand)] underline-offset-2 hover:underline">
                  ask us from Settings
                </Link>
                .
              </p>
            ) : null}
          </Card>

          <Card>
            <div className="border-b border-border/60 pb-3">
              <h2 className="font-display text-[15px] font-semibold text-text-primary">Invoices</h2>
            </div>

            {account.invoices.length === 0 ? (
              <p className="mt-3 text-[13px] text-text-tertiary">
                No invoices yet.
                {account.status === "TRIAL" ? " Trials are not billed." : ""}
              </p>
            ) : (
              <div className="mt-2 divide-y divide-border/50">
                {account.invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[12px] font-semibold text-text-primary">
                        {invoice.invoiceNumber}
                      </p>
                      <p className="mt-0.5 text-[11px] text-text-tertiary">
                        {new Date(invoice.periodStart).toLocaleDateString("en-IN", {
                          month: "short",
                          year: "numeric",
                        })}
                        {invoice.paidAt
                          ? ` · paid ${new Date(invoice.paidAt).toLocaleDateString("en-IN")}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          invoice.status === "PAID"
                            ? "text-success"
                            : invoice.status === "ISSUED"
                              ? "text-[var(--warning)]"
                              : "text-text-tertiary"
                        }`}
                      >
                        {invoice.status.toLowerCase()}
                      </span>
                      <span className="font-mono text-[13px] font-semibold text-text-primary">
                        {invoice.totalLabel}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-4 text-[11px] text-text-tertiary">
              Invoice amounts are frozen when the invoice is issued, so a later price change never
              alters what you were charged.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
