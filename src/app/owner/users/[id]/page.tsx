import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/primitives";
import { PageHeader } from "@/components/design/PageHeader";
import { Surface } from "@/components/design/Surface";
import {
  ArrowLeft,
  Smartphone,
  Calendar,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  HardHat,
  CircleUserRound,
  ClipboardList,
  BadgeCheck,
  TrendingUp,
} from "lucide-react";
import { ResetPinButton } from "../reset-pin-button";
import { RemoveEmployeeButton } from "../remove-employee-button";

export default async function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const owner = await getOwnerUser();
  if (!owner) redirect("/");

  const user = await prisma.user.findFirst({
    where: { id, factoryId: owner.factoryId },
  });

  if (!user) notFound();

  const isWorker = user.role === "WORKER";
  const isInspector = user.role === "SUPERVISOR";

  /*
   * This listed the work assigned to the user, as job cards mapped into the
   * legacy order shape, and derived an accuracy figure from how many of their
   * batches QC approved. Job cards and inspections went with the manufacturing
   * module, and nothing else assigns work to a person, so the list is empty and
   * accuracy is not computed rather than being derived from something else.
   */
  const orders: never[] = [];

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayOrders: never[] = [];
  const accuracy = 0;

  const roleLabel =
    user.role === "OWNER"
      ? "Owner"
      : user.role === "WORKER"
        ? "Worker"
        : "Quality Inspector";

  const RoleIcon =
    user.role === "OWNER"
      ? Shield
      : user.role === "WORKER"
        ? HardHat
        : CircleUserRound;

  return (
    <div className="flex flex-col space-y-6">
      <PageHeader
        eyebrow="Team"
        title={user.name}
        description={`${roleLabel} · Employee #${user.employeeId}`}
        actions={
          <Link
            href="/owner/users"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:border-border/80 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Team
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Profile card */}
        <div className="flex flex-col">
          <Surface className="p-6 flex flex-col items-center justify-between text-center gap-4 lg:h-[530px] w-full">
            <div className="w-full flex flex-col items-center gap-4">
              {/* Avatar */}
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--brand)]/10 border-2 border-[var(--brand)]/25 text-3xl font-bold text-[var(--brand)]">
                {user.name.slice(0, 1).toUpperCase()}
              </div>

              <div>
                <h2 className="text-xl font-bold text-text-primary">{user.name}</h2>
                <div className="flex items-center justify-center gap-2 mt-1.5">
                  <RoleIcon className="h-3.5 w-3.5 text-text-tertiary" />
                  <span className="text-sm text-text-secondary">{roleLabel}</span>
                </div>
              </div>

              <Badge
                className={
                  user.isActive
                    ? "bg-success-soft text-success border-success/15"
                    : "bg-danger-soft text-danger border-danger/15"
                }
              >
                {user.isActive ? "Active" : "Inactive"}
              </Badge>

              {/* Details */}
              <div className="w-full space-y-2 text-left">
                <div className="flex items-center gap-3 rounded-xl border border-border bg-background/40 px-3 py-2.5">
                  <Smartphone className="h-4 w-4 text-[var(--brand)] shrink-0" />
                  <span className="font-mono text-sm text-text-primary">
                    {user.phone || "Not set"}
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-background/40 px-3 py-2.5">
                  <Calendar className="h-4 w-4 text-[var(--brand)] shrink-0" />
                  <span className="text-sm text-text-secondary">
                    Joined{" "}
                    {new Date(user.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                {user.lastLoginAt && (
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-background/40 px-3 py-2.5">
                    <Clock className="h-4 w-4 text-[var(--brand)] shrink-0" />
                    <span className="text-sm text-text-secondary">
                      Last login{" "}
                      {new Date(user.lastLoginAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {user.role !== "OWNER" && (
              <div className="w-full space-y-2 pt-2 border-t border-border mt-auto">
                <ResetPinButton
                  userId={user.id}
                  phone={user.phone || ""}
                  name={user.name}
                />
                <RemoveEmployeeButton
                  userId={user.id}
                  name={user.name}
                  role={user.role}
                />
              </div>
            )}
          </Surface>
        </div>

        {/* Right: Stats + Activity */}
        <div className="lg:col-span-2 flex flex-col gap-4 lg:h-[530px]">
          {/* Stats row */}
          {(isWorker || isInspector) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
              {[
                {
                  icon: Activity,
                  label: "Total Jobs",
                  value: orders.length,
                  color: "text-[var(--brand)]",
                },
                {
                  icon: ClipboardList,
                  label: "Today",
                  value: todayOrders.length,
                  color: "text-[var(--brand)]",
                },
                {
                  icon: BadgeCheck,
                  label: "Approved",
                  value: 0,
                  color: "text-success",
                },
                {
                  icon: TrendingUp,
                  label: "Accuracy",
                  value: `${accuracy}%`,
                  color: accuracy >= 90 ? "text-success" : accuracy >= 70 ? "text-warning" : "text-danger",
                },
              ].map((stat) => (
                <Surface key={stat.label} className="p-4 flex flex-col items-center text-center gap-1">
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">
                    {stat.label}
                  </p>
                </Surface>
              ))}
            </div>
          )}

          {/* Recent orders */}
          {(isWorker || isInspector) && (
            <Surface className="flex flex-col overflow-hidden flex-1 min-h-0">
              <div className="p-5 border-b border-border shrink-0">
                <h3 className="font-semibold text-text-primary">
                  Recent {isWorker ? "Work Orders" : "Inspections"}
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">Last 20 assignments</p>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-border">
                {orders.length === 0 ? (
                  <div className="p-8 text-center text-text-tertiary text-sm">
                    No orders yet.
                  </div>
                ) : (
                  orders.map((order: any) => {
                    const batch = order.batches[0];
                    const inspectionStatus = batch?.inspection?.status;
                    return (
                      <Link
                        key={order.id}
                        href={`/owner/production`}
                        className="flex items-center gap-4 px-5 py-4 hover:bg-surface-2/50 transition-colors group"
                      >
                        {/* Status dot */}
                        <div
                          className={`h-2 w-2 rounded-full shrink-0 ${
                            inspectionStatus === "APPROVED"
                              ? "bg-success"
                              : inspectionStatus === "REJECTED"
                                ? "bg-danger"
                                : inspectionStatus === "WAITING_QC"
                                  ? "bg-warning"
                                  : "bg-text-tertiary"
                          }`}
                        />

                        {/* Order info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-text-primary truncate group-hover:text-[var(--brand)] transition-colors">
                            {order.itemName || order.item?.name || order.orderNumber}
                          </p>
                          <p className="text-xs text-text-secondary mt-0.5">
                            {order.customer?.name} · #{order.orderNumber}
                          </p>
                        </div>

                        {/* Date + status */}
                        <div className="text-right shrink-0">
                          <p className="text-xs text-text-tertiary">
                            {new Date(order.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                          </p>
                          {inspectionStatus && (
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider mt-1 ${
                                inspectionStatus === "APPROVED"
                                  ? "text-success"
                                  : inspectionStatus === "REJECTED"
                                    ? "text-danger"
                                    : "text-warning"
                              }`}
                            >
                              {inspectionStatus === "APPROVED" ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : inspectionStatus === "REJECTED" ? (
                                <XCircle className="h-3 w-3" />
                              ) : (
                                <Clock className="h-3 w-3" />
                              )}
                              {inspectionStatus === "WAITING_QC" ? "Pending QC" : inspectionStatus}
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </Surface>
          )}

          {/* Owner placeholder */}
          {user.role === "OWNER" && (
            <Surface className="p-8 flex flex-col items-center justify-center text-center gap-3 flex-1 min-h-0">
              <Shield className="h-10 w-10 text-[var(--brand)] opacity-40" />
              <p className="font-semibold text-text-primary">Factory Owner</p>
              <p className="text-sm text-text-secondary max-w-xs">
                Owners have full access to the factory dashboard and all management features.
              </p>
            </Surface>
          )}
        </div>
      </div>
    </div>
  );
}
