"use client";

import { useState, useTransition } from "react";
import { Button, ErrorState, Field, Input } from "@/components/ui/primitives";
import { signInWithPassword } from "@/server/actions/platform";

/**
 * Sign-in.
 *
 * The form posts to a server action; there is no client-side auth call and no
 * credential ever reaches component state beyond the input itself. A failure
 * returns a deliberately uniform message, because distinguishing "no such
 * account" from "wrong password" is an account-enumeration oracle.
 */
export function SignInForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-4"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const failure = await signInWithPassword(
            String(formData.get("email") ?? ""),
            String(formData.get("password") ?? ""),
          );
          // A successful sign-in redirects and never returns.
          if (failure) setError(failure.message);
        });
      }}
    >
      {error && <ErrorState title="Sign in failed" message={error} retryable />}

      <Field label="Email" htmlFor="email" required>
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </Field>

      <Field label="Password" htmlFor="password" required>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>

      <Button type="submit" variant="primary" disabled={pending} className="mt-2">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
