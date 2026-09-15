import Link from "next/link";
import { createSupabaseServerClient } from "@/server/platform/auth";
import { AuthShell } from "../../sign-in/AuthShell";
import { NewPasswordForm } from "./NewPasswordForm";

export const dynamic = "force-dynamic";

/**
 * Where the email link lands. Supabase's PKCE flow arrives with `?code=`,
 * which is exchanged here for a recovery session; only then can
 * `updatePassword` set the new one. An expired or reused link exchanges to
 * nothing and is told so, with the way back.
 */
export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error_description?: string }>;
}) {
  const { code, error_description } = await searchParams;
  const supabase = await createSupabaseServerClient();
  let ready = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ready = !error;
  } else {
    const { data } = await supabase.auth.getUser();
    ready = Boolean(data.user);
  }

  if (!ready) {
    return (
      <AuthShell title="That link has expired." lead={error_description ?? "Reset links work once and for an hour. Ask for a new one."}>
        <Link href="/reset-password" className="text-[14px] text-accent-ink no-underline hover:underline">
          Send a new reset link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password." lead="At least 8 characters. You'll be signed in straight after.">
      <NewPasswordForm />
    </AuthShell>
  );
}
