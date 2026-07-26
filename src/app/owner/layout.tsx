import { AutoRefresh } from "@/components/providers/AutoRefresh"
import { LiveRefresh } from "@/components/providers/LiveRefresh";
import { IdleLogout } from "@/components/providers/IdleLogout";
import { redirect } from "next/navigation";
import { getOwnerUser } from "@/lib/server/owner";
import { OwnerShell } from "@/components/layout/owner-shell";
import { sanitizeMatrix } from "@/lib/server/permissions";
import { entitledModules } from "@/platform/modules/entitlements";
import { BRAND_ACCENT } from "@/lib/brand";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const dbUser = await getOwnerUser();
  if (!dbUser) redirect("/onboarding");

  const factory = dbUser.factory;

  const settings = (factory?.settings as any) || {};
  const themeColor = settings.themeColor || BRAND_ACCENT;
  // Nav visibility follows the factory's own permission matrix, not the code defaults.
  const permissionMatrix = sanitizeMatrix(settings.permissions);
  // Module entitlements gate which destinations exist at all, independent of
  // whether the user's role would permit them.
  const modules = await entitledModules(factory.organizationId);

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
      entitledModules={modules}
    >
      {children}
    </OwnerShell>
    </>
  );
}
