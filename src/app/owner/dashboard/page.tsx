import { redirect } from "next/navigation";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { resolvePackKey, VERTICAL_PACKS } from "@/platform/tenancy/packs";
import { AutoComponentsDashboard } from "@/components/dashboard/AutoComponentsDashboard";
import { FacilityManagementDashboard } from "@/components/dashboard/FacilityManagementDashboard";
import { QsrFranchiseDashboard } from "@/components/dashboard/QsrFranchiseDashboard";
import { RetailFranchiseDashboard } from "@/components/dashboard/RetailFranchiseDashboard";
import { RestaurantDashboard } from "@/components/dashboard/RestaurantDashboard";
import { ProfessionalServicesDashboard } from "@/components/dashboard/ProfessionalServicesDashboard";
import { RetailDashboard } from "@/components/dashboard/RetailDashboard";
import { LifestyleServicesDashboard } from "@/components/dashboard/LifestyleServicesDashboard";

/**
 * The dashboard is per-vertical.
 *
 * A facility-management company opening a screen headed "Today Production" with
 * a QC pass rate learns nothing and concludes the product is not for them. So
 * this route resolves the tenant's pack and mounts the dashboard built for it.
 *
 * `resolvePackKey` rather than reading `industry` directly: that column is free
 * text and holds three different shapes across live rows — a pack key on new
 * tenants, a display label on older ones, and whatever sales typed on the rest.
 * Normalising in one place is what stops this switch from being a lottery.
 *
 * Auto components is the fallback, not a default anyone was assigned: it is the
 * original dashboard, so a tenant with no recognisable pack sees what they saw
 * before rather than an empty page.
 */
import { entitledModules } from "@/platform/modules/entitlements";
import Link from "next/link";
import { resolveAccess } from "@/platform/rbac/permissions";
import { resolveDashboardWidgets } from "@/platform/modules/navigation";
import { PageHeader } from "@/components/design/PageHeader";
import { cn } from "@/lib/utils";

export default async function OwnerDashboard() {
  const dbUser = await getOwnerUser();
  if (!dbUser) redirect("/onboarding");

  const factory = await prisma.factory.findUnique({
    where: { id: dbUser.factoryId },
    select: { industry: true, organizationId: true },
  });

  const modules = await entitledModules(dbUser.factory.organizationId);
  const hasOptionalModules = modules.some((m) => m !== "core");

  if (!hasOptionalModules) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
        <div className="max-w-md w-full p-8 rounded-2xl bg-[#16181C] border border-white/5 shadow-2xl space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center">
            <svg className="w-8 h-8 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16 a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary font-sora">No modules enabled</h1>
            <p className="text-sm text-text-secondary">
              This workspace is currently empty. Enable capabilities or industry packs in settings to get started.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/owner/settings"
              className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-lg bg-[var(--brand,#E11D2A)] hover:bg-[#FF1D2A] text-white font-medium text-sm transition-colors duration-200"
            >
              Configure Workspace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Resolve widgets using NavContext shape (without legacy can)
  const access = await resolveAccess(dbUser.id);
  const grantedPermissions = access ? [...access.permissions] : [];
  const widgets = resolveDashboardWidgets({
    enabledModules: modules,
    grantedPermissions,
    userRole: dbUser.role,
  });

  const firstName = dbUser.name.split(" ")[0];

  if (widgets.length > 0) {
    // Determine pack-level widget order if available
    const packKey = resolvePackKey(factory?.industry);
    const packWidgets = packKey ? VERTICAL_PACKS[packKey]?.dashboardWidgets : undefined;

    let ordered = [...widgets];
    if (packWidgets) {
      ordered.sort((a, b) => {
        const indexA = packWidgets.indexOf(a.key);
        const indexB = packWidgets.indexOf(b.key);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return (a.sortOrder ?? 100) - (b.sortOrder ?? 100);
      });
    }

    // Load component classes dynamically
    const widgetsWithComponents = await Promise.all(
      ordered.map(async (w) => {
        const { default: Component } = await w.load();
        return { ...w, Component };
      })
    );

    const wide = widgetsWithComponents.filter((w) => w.size === "wide");
    const metrics = widgetsWithComponents.filter((w) => w.size === "metric");
    const panels = widgetsWithComponents.filter((w) => w.size === "panel");

    return (
      <div className="flex w-full flex-col gap-3 p-0.5 xl:gap-4">
        <PageHeader title={`Welcome ${firstName}`} />

        {/* Wide widgets */}
        {wide.map(({ key, Component }) => (
          <Component key={key} factoryId={dbUser.factoryId} firstName={firstName} />
        ))}

        {/* Metric widgets */}
        {metrics.length > 0 && (
          <section className="grid shrink-0 grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4 w-full">
            {metrics.map(({ key, Component }) => (
              <Component key={key} factoryId={dbUser.factoryId} firstName={firstName} />
            ))}
          </section>
        )}

        {/* Panel widgets */}
        {panels.length > 0 && (
          <section className="grid w-full items-stretch gap-4 xl:grid-cols-3 xl:gap-6">
            {panels.map(({ key, Component }) => (
              <div
                key={key}
                className={cn(
                  "flex flex-col h-full",
                  key === "restaurant_floor" ? "xl:col-span-2" : "xl:col-span-1"
                )}
              >
                <Component factoryId={dbUser.factoryId} firstName={firstName} />
              </div>
            ))}
          </section>
        )}
      </div>
    );
  }

  const props = {
    factoryId: dbUser.factoryId,
    firstName: dbUser.name.split(" ")[0],
  };

  switch (resolvePackKey(factory?.industry)) {
    case "facility_management":
      return <FacilityManagementDashboard {...props} />;
    case "franchise_qsr":
      return <QsrFranchiseDashboard {...props} />;
    case "franchise_retail":
      return <RetailFranchiseDashboard {...props} />;
    case "restaurant_ops":
      return <RestaurantDashboard {...props} />;
    case "professional_services":
      return <ProfessionalServicesDashboard {...props} />;
    case "retail_os":
      return <RetailDashboard {...props} />;
    case "lifestyle_services":
      return <LifestyleServicesDashboard {...props} />;
    // Table-less QSR shares the restaurant floor/kitchen/takings view — the
    // widget path handles an entitled tenant; this case is the zero-widget fallback.
    case "modern_qsr":
      return <RestaurantDashboard {...props} />;
    case "auto_components":
    default:
      return <AutoComponentsDashboard {...props} />;
  }
}
