"use client";

import { useState, useTransition } from "react";
import { Button, ErrorState, Field, Input } from "@/components/ui/primitives";
import { changeOwnPassword } from "@/server/actions/account";
import type { ActionFailure } from "@/server/platform/action-error";

export function PasswordForm() {
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const newPassword = String(form.get("newPassword") ?? "");
        const confirm = String(form.get("confirmPassword") ?? "");
        setFailure(null);
        setSuccess(false);
        if (newPassword !== confirm) {
          setFailure({ ok: false, code: "E_VALIDATION", message: "New passwords don't match.", retryable: true });
          return;
        }
        startTransition(async () => {
          const result = await changeOwnPassword(String(form.get("currentPassword") ?? ""), newPassword);
          if (result.ok) {
            setSuccess(true);
            e.currentTarget.reset();
          } else {
            setFailure(result);
          }
        });
      }}
    >
      <Field label="Current password" htmlFor="currentPassword" required>
        <Input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" />
      </Field>
      <Field label="New password" htmlFor="newPassword" required hint="At least 8 characters">
        <Input id="newPassword" name="newPassword" type="password" required minLength={8} autoComplete="new-password" />
      </Field>
      <Field label="Confirm new password" htmlFor="confirmPassword" required>
        <Input id="confirmPassword" name="confirmPassword" type="password" required autoComplete="new-password" />
      </Field>

      {failure && <ErrorState title="Could not change password" message={failure.message} issues={failure.issues} retryable={failure.retryable} />}
      {success && <p className="m-0 text-[13px] text-success">Password changed.</p>}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Changing…" : "Change password"}
        </Button>
      </div>
    </form>
  );
}
