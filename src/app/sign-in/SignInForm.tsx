"use client";

import { useState, useTransition } from "react";
import { Button, Field, Input } from "@/components/ui/primitives";
import { signInWithPassword } from "@/server/actions/platform";

/**
 * Sign-in.
 *
 * The form posts to a server action; there is no client-side auth call and no
 * credential ever reaches component state beyond the input itself. The whole
 * `FormData` is handed across unchanged, which also keeps the password out of
 * Next's server-action log — see `signInWithPassword`.
 *
 * A failure returns a deliberately uniform message, because distinguishing
 * "no such account" from "wrong password" is an account-enumeration oracle.
 */
export function SignInForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-5"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const failure = await signInWithPassword(formData);
          // A successful sign-in redirects and never returns.
          if (failure) setError(failure.message);
        });
      }}
    >
      {/* Inline and quiet, rather than a full ErrorState panel. A failed
          password is an ordinary event on this screen, not a system fault, and
          a red block shouting at someone who mistyped is the wrong register.
          role="alert" so it is still announced. */}
      {error && (
        <p
          role="alert"
          className="m-0 flex items-start gap-2 rounded-md border border-danger/25 bg-danger-subtle px-3 py-2.5 text-[13px] text-danger"
        >
          <span aria-hidden="true" className="mt-px leading-none">
            ×
          </span>
          {error}
        </p>
      )}

      <Field label="Email" htmlFor="email" required>
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </Field>

      <Field label="Password" htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <Button type="submit" variant="primary" disabled={pending} className="mt-1 w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
