"use client";

import { useState } from "react";
import { ArrowRight, Check, X } from "lucide-react";

import { formatMenuPrice } from "@/lib/menu";
import { toast } from "@/components/ui/toast";
import { applyPriceChange } from "@/server/actions/assistantProposals";
import type { PriceChangeProposal } from "@/lib/server/assistantTools";

/**
 * The R4 approve-before-apply card.
 *
 * The assistant proposes; this shows the old→new diff and does nothing until the
 * owner clicks Approve. Approve calls the guarded server action, which re-reads
 * and re-validates server-side — this card sends only the item id and the new
 * price, never the old value it displays.
 */
export function ProposalCard({
  proposal,
  onResolved,
}: {
  proposal: PriceChangeProposal;
  onResolved?: (outcome: "approved" | "cancelled") => void;
}) {
  const [state, setState] = useState<"pending" | "applying" | "done" | "cancelled">("pending");

  const approve = () => {
    setState("applying");
    void applyPriceChange(proposal.itemId, proposal.newPricePaise).then((res) => {
      if ("error" in res) {
        toast.error(res.error);
        setState("pending");
        return;
      }
      toast.success(
        `${res.itemName}: ${formatMenuPrice(res.oldPricePaise)} → ${formatMenuPrice(res.newPricePaise)}`,
      );
      setState("done");
      onResolved?.("approved");
    });
  };

  const cancel = () => {
    setState("cancelled");
    onResolved?.("cancelled");
  };

  const up = proposal.newPricePaise > proposal.oldPricePaise;

  return (
    <div className="rounded-[24px] border border-border bg-surface p-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-text-tertiary">
        Proposed change · needs your approval
      </p>
      <p className="mt-2 text-[15px] font-semibold text-text-primary">{proposal.itemName}</p>

      <div className="mt-3 flex items-center gap-3">
        <span className="font-mono text-[15px] text-text-secondary line-through">
          {formatMenuPrice(proposal.oldPricePaise)}
        </span>
        <ArrowRight className="h-4 w-4 text-text-tertiary" />
        <span className={`font-mono text-[17px] font-bold ${up ? "text-danger" : "text-success"}`}>
          {formatMenuPrice(proposal.newPricePaise)}
        </span>
      </div>

      {state === "done" ? (
        <p className="mt-3 flex items-center gap-1.5 text-[13px] font-semibold text-success">
          <Check className="h-4 w-4" /> Applied
        </p>
      ) : state === "cancelled" ? (
        <p className="mt-3 text-[13px] text-text-tertiary">Cancelled — nothing changed.</p>
      ) : (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={state === "applying"}
            onClick={approve}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[var(--brand)] px-4 py-2 text-[13px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            <Check className="h-4 w-4" /> {state === "applying" ? "Applying…" : "Approve"}
          </button>
          <button
            type="button"
            disabled={state === "applying"}
            onClick={cancel}
            className="flex items-center justify-center gap-1.5 rounded-full border border-border px-4 py-2 text-[13px] font-semibold text-text-secondary transition hover:text-text-primary disabled:opacity-50"
          >
            <X className="h-4 w-4" /> Cancel
          </button>
        </div>
      )}
    </div>
  );
}
