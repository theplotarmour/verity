import { AutoRefresh } from "@/components/providers/AutoRefresh"
import { LiveRefresh } from "@/components/providers/LiveRefresh";
import { IdleLogout } from "@/components/providers/IdleLogout";
import { redirect } from "next/navigation";
import { getOwnerUser } from "@/lib/server/owner";
import { OwnerShell } from "@/components/layout/owner-shell";
import { sanitizeMatrix } from "@/lib/server/permissions";
import { entitledModules } from "@/platform/modules/entitlements";
import { resolveAccess } from "@/platform/rbac/permissions";
import { BRAND_ACCENT } from "@/lib/brand";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const dbUser = await getOwnerUser();
  if (!dbUser) redirect("/onboarding");

  const factory = dbUser.factory;

  // The nav is module-driven: a security company must not see "Production" and
  // a factory must not see "Helpdesk".
  //
  // One call, not two. `resolveAccess` already resolves entitlements to filter
  // the permission keys, so asking `entitledModules` separately re-ran the same
  // query on every owner page — which is what saturated a one-connection pool.
  const access = await resolveAccess(dbUser.id);
  const enabledModules = access?.modules ?? (await entitledModules(factory.organizationId));
  const grantedPermissions = access ? [...access.permissions] : [];

  const settings = (factory?.settings as any) || {};
  const themeColor = settings.themeColor || BRAND_ACCENT;
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
