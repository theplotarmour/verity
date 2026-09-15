"use client";

import { useState, useTransition } from "react";
import { Button, Field, Input } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icons";
import { updatePassword } from "@/server/actions/platform";

export function NewPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-5"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const failure = await updatePassword(formData);
          if (failure) setError(failure.message);
        });
      }}
    >
      {error && (
        <p role="alert" className="m-0 flex items-start gap-2 rounded-md border border-danger/25 bg-danger-subtle px-3 py-2.5 text-[13px] text-danger">
          <span aria-hidden="true" className="mt-px leading-none">×</span>
          {error}
        </p>
      )}
      <Field label="New password" htmlFor="password" required>
        <div className="relative">
          <Icon name="lock" size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <Input id="password" name="password" type={show ? "text" : "password"} autoComplete="new-password" required minLength={8} autoFocus className="pl-11 pr-11" />
          <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer text-text-tertiary transition-colors hover:text-text-secondary">
            <Icon name={show ? "eyeOff" : "eye"} size={17} />
            <span className="sr-only">{show ? "Hide password" : "Show password"}</span>
          </button>
        </div>
      </Field>
      <Field label="Confirm password" htmlFor="confirm" required>
        <Input id="confirm" name="confirm" type={show ? "text" : "password"} autoComplete="new-password" required minLength={8} />
      </Field>
      <Button type="submit" variant="primary" disabled={pending} className="mt-1 w-full gap-2">
        {pending ? "Saving…" : "Set password and sign in"}
        {!pending && <Icon name="chevronRight" size={16} />}
      </Button>
    </form>
  );
}
