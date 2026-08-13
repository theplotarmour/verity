import { redirect } from "next/navigation";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { resolvePackKey } from "@/platform/tenancy/packs";
import { AutoComponentsDashboard } from "@/components/dashboard/AutoComponentsDashboard";
import { FacilityManagementDashboard } from "@/components/dashboard/FacilityManagementDashboard";
import { QsrFranchiseDashboard } from "@/components/dashboard/QsrFranchiseDashboard";
import { RetailFranchiseDashboard } from "@/components/dashboard/RetailFranchiseDashboard";
import { RestaurantDashboard } from "@/components/dashboard/RestaurantDashboard";
import { ProfessionalServicesDashboard } from "@/components/dashboard/ProfessionalServicesDashboard";
import { RetailDashboard } from "@/components/dashboard/RetailDashboard";

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
export default async function OwnerDashboard() {
  const dbUser = await getOwnerUser();
  if (!dbUser) redirect("/onboarding");

  const factory = await prisma.factory.findUnique({
    where: { id: dbUser.factoryId },
    select: { industry: true },
  });

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
    case "auto_components":
    default:
      return <AutoComponentsDashboard {...props} />;
  }
}
