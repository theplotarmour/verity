"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteItem } from "@/server/actions/items";
import { confirmDialog } from "@/components/ui/dialog-service";
import { toast } from "@/components/ui/toast";

/**
 * Deleting an item from its own page.
 *
 * A refusal is the normal outcome for anything real — an item in a BOM, an
 * order or stock history cannot go — so the server's reason is surfaced
 * verbatim rather than replaced with "could not delete".
 */
export function DeleteItemButton({
  itemId,
  itemName,
  returnTo,
}: {
  itemId: string;
  itemName: string;
  returnTo: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  async function onDelete() {
    const ok = await confirmDialog({
      title: `Delete ${itemName}?`,
      description:
        "This removes the item and its specification. If it is used by a BOM, an order or stock history it cannot be deleted — you will be told which.",
      variant: "danger",
      confirmLabel: "Delete",
    });
    if (!ok) return;

    start(async () => {
      const result = await deleteItem(itemId);
      if ((result as { error?: string }).error) {
        toast.error((result as { error: string }).error);
        return;
      }
      toast.success(`${itemName} deleted`);
      router.push(returnTo);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={pending}
      className="rounded-xl border border-danger/30 px-4 py-2 text-sm font-bold text-danger transition hover:bg-danger-soft disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete item"}
    </button>
  );
}
