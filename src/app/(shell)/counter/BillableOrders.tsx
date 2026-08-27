"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorState } from "@/components/ui/primitives";
import { runCommand } from "@/server/actions/platform";
import type { ActionFailure } from "@/server/platform/action-error";

function rupees(minor: number): string {
  return `₹${(minor / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Tables that have eaten and need a bill.
 *
 * The amount shown is the pre-tax subtotal, labelled as such. Showing a total
 * here would mean computing tax on the client, and the two figures would
 * disagree with the printed bill the moment a rate changed.
 */
export function BillableOrders({
  orders,
}: {
  orders: Array<{ id: string; tableLabel: string; covers: number; subtotalMinor: number }>;
}) {
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();

  function generate(orderId: string) {
    setFailure(null);
    startTransition(async () => {
      const result = await runCommand<{ id: string }>(
        "verity.dinein.generate_bill",
        { orderId },
        "/counter",
      );
      if (result.ok) router.push(`/counter/${result.data.id}`);
      else setFailure(result);
    });
  }

  return (
    <>
      {failure && (
        <div className="px-4 pt-4">
          <ErrorState
            title="The bill was not raised"
            message={failure.message}
            issues={failure.issues}
            retryable={failure.retryable}
          />
        </div>
      )}

      <table className="w-full border-collapse">
        <caption className="sr-only">Served orders with no bill yet</caption>
        <thead>
          <tr>
            {["Table", "Covers", "Subtotal", ""].map((heading, index) => (
              <th
                key={heading || index}
                className={
                  "border-b border-line px-3 py-3 text-[12px] font-normal text-text-tertiary " +
                  (index === 0 ? "text-left" : "text-right")
                }
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td className="border-b border-line px-3 py-3 text-[14px] text-text">
                {order.tableLabel}
              </td>
              <td className="tabular border-b border-line px-3 py-3 text-right text-[14px]">
                {order.covers}
              </td>
              <td className="tabular border-b border-line px-3 py-3 text-right text-[14px] text-text-secondary">
                {rupees(order.subtotalMinor)}
              </td>
              <td className="border-b border-line px-3 py-3 text-right">
                <Button
                  size="sm"
                  variant="primary"
                  disabled={pending}
                  onClick={() => generate(order.id)}
                >
                  Raise bill
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
