import { redirect } from "next/navigation";
import { resolveActor } from "@/server/platform/auth";
import { SignInForm } from "./SignInForm";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  // Already signed in with a usable membership? Nothing to do here.
  const actor = await resolveActor();
  if (actor) redirect("/");

  return (
    <main id="main" className="min-h-dvh grid place-items-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="text-[13px] uppercase tracking-[0.14em] text-text-tertiary m-0">Verity</p>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em] m-0 mt-1">Sign in</h1>
          <p className="text-text-secondary mt-2 mb-0">
            Authentication is handled by the platform identity realm.
          </p>
        </div>
        <SignInForm />
      </div>
    </main>
  );
}
