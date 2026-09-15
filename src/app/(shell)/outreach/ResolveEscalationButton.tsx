"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/primitives";
import { runCommand } from "@/server/actions/platform";

export function ResolveEscalationButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await runCommand("verity.outreach.resolve_escalation", { leadId }, "/outreach");
          router.refresh();
        })
      }
    >
      {pending ? "Working…" : "Mark handled"}
    </Button>
  );
}
