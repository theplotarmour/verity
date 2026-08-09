import { AutoRefresh } from "@/components/providers/AutoRefresh"
import { LiveRefresh } from "@/components/providers/LiveRefresh";
import { IdleLogout } from "@/components/providers/IdleLogout";
import { redirect } from "next/navigation";
import { getOwnerUser } from "@/lib/server/owner";
import { OwnerShell } from "@/components/layout/owner-shell";
import { sanitizeMatrix } from "@/lib/server/permissions";
import { entitledModules } from "@/platform/modules/entitlements";
import { resolveAccess } from "@/platform/rbac/permissions";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const dbUser = await getOwnerUser();
  if (!dbUser) redirect("/onboarding");

  const factory = dbUser.factory;

  // The nav is module-driven: a security company must not see "Production" and
  // a factory must not see "Helpdesk". Resolved here, once, for the whole shell.
  const enabledModules = await entitledModules(factory.organizationId);

  // Registry permission keys this user holds. resolveAccess already drops keys
  // whose module is not entitled, so the two gates cannot disagree.
  const access = await resolveAccess(dbUser.id);
  const grantedPermissions = access ? [...access.permissions] : [];

  const settings = (factory?.settings as any) || {};
  const themeColor = settings.themeColor || "#E11D48"; // fallback red
  // Nav visibility follows the factory's own permission matrix, not the code defaults.
  const permissionMatrix = sanitizeMatrix(settings.permissions);

  return (
    <>
    <AutoRefresh />
      <LiveRefresh />
      <IdleLogout />
    <OwnerShell 
      factoryName={factory?.name || "Verity"} 
      factoryLogo={factory?.logoUrl} 
      userName={dbUser.name}
      themeColor={themeColor}
      userRole={dbUser.role}
      permissionMatrix={permissionMatrix}
      enabledModules={enabledModules}
      grantedPermissions={grantedPermissions}
    >
      {children}
    </OwnerShell>
    </>
  );
}
