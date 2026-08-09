"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Database } from "lucide-react";
import { initialiseMasterData } from "@/server/actions/masterDataInit";
import { toast } from "@/components/ui/toast";

/**
 * The first screen a brand-new factory sees.
 *
 * It used to read "Run node scripts/seed_item_groups.mjs" — a terminal command,
 * on the opening screen, for someone who runs a factory. The way out of an empty
 * state has to be a button in the empty state.
 */
export function EmptyStudio() {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-[var(--brand)]">
        <Database className="h-7 w-7" />
      </div>
      <h1 className="text-lg font-bold text-text-primary">Set up your master data</h1>
      <p className="mt-2 max-w-md text-sm text-text-secondary">
        Start with the six standard categories — Raw Material, Semi-Finished, Finished Good,
        Consumable, Packaging and Trading Goods — plus sheets for suppliers, customers,
        warehouses, employees, designs and colours.
      </p>
      <p className="mt-1 max-w-md text-xs text-text-tertiary">
        You can rename them, nest your own subcategories inside them, and change every field
        afterwards. Nothing here is fixed.
      </p>

      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await initialiseMasterData();
            if (result.created === 0) {
              toast.success("Categories already exist");
            } else {
              toast.success(`${result.created} categories created`);
            }
            router.refresh();
          })
        }
        className="mt-6 rounded-xl bg-[var(--brand)] px-6 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create default categories"}
      </button>
    </div>
  );
}
