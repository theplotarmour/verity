import { redirect } from "next/navigation";
import { resolveActor } from "@/server/platform/auth";
import { AuthShell } from "../sign-in/AuthShell";
import { ResetRequestForm } from "./ResetRequestForm";

export const dynamic = "force-dynamic";

/** "Forgot password?" — ask for the email, Supabase sends the link. */
export default async function ResetPasswordPage() {
  const actor = await resolveActor();
  if (actor) redirect("/");
  return (
    <AuthShell title="Reset your password." lead="Enter the email you sign in with and we'll send a link to choose a new one.">
      <ResetRequestForm />
    </AuthShell>
  );
}
