import { redirect } from "next/navigation";

import { getOwnerUser } from "@/lib/server/owner";
import { entitledModules } from "@/platform/modules/entitlements";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { VerityLogo } from "@/components/ui/VerityLogo";

/**
 * Workspace setup.
 *
 * Deliberately outside the owner layout, so its redirect guard never fires here —
 * that pairing is what would otherwise bounce a blank tenant between /onboarding
 * and /owner forever.
 *
 * A tenant that is already set up (has modules beyond core) has no business on
 * this screen, so it sends them on to their dashboard rather than re-running an
 * onboarding they finished.
 */
export default async function OnboardingPage() {
  const user = await getOwnerUser();
  if (!user) redirect("/");

  const modules = await entitledModules(user.factory.organizationId);
  if (modules.some((m) => m !== "core")) redirect("/owner/dashboard");

  return (
    <main className="verity-canvas flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center justify-center gap-2">
          <VerityLogo size={22} />
          <span className="font-display text-lg font-bold tracking-[-0.02em] text-text-primary">Verity</span>
        </div>
        <OnboardingWizard />
        <p className="mt-4 text-center text-[12px] text-text-tertiary">
          You can change any of this later in Settings.
        </p>
      </div>
    </main>
  );
}
