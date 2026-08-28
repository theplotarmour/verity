"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Panel,
  Select,
  StateBadge,
} from "@/components/ui/primitives";
import { runCommand } from "@/server/actions/platform";
import type { ActionFailure } from "@/server/platform/action-error";

type Shipment = {
  shipmentId: string;
  state: string;
  lrNumber: string | null;
  transporterName: string | null;
  vehicleReference: string | null;
  sourceName: string;
  destination: string;
  orderReference: string | null;
  direction: "outbound" | "inbound";
  freightChargePaise: number;
  freightPayer: string;
  dispatchedAt: Date | string | null;
  deliveredAt: Date | string | null;
  daysInTransit: number | null;
};

type Transporter = {
  id: string;
  name: string;
  phone: string | null;
  active: boolean;
  inTransit: number;
};

function rupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

const STATE_LABEL: Record<string, string> = {
  draft: "Not yet assigned",
  assigned: "With carrier",
  in_transit: "In transit",
  delivered: "Delivered",
  cancelled: "Lost or cancelled",
};

const STATE_CATEGORY: Record<string, string> = {
  draft: "Draft",
  assigned: "Pending",
  in_transit: "Active",
  delivered: "Completed",
  cancelled: "Cancelled",
};

/**
 * The logistics control screen.
 *
 * The search field leads, because the question this screen answers arrives from
 * somebody on the phone holding one of three things: an LR number, a customer
 * name, or an order reference. All three hit the same field, so the coordinator
 * never has to decide which kind of search they are doing.
 *
 * Each shipment reads as a chain — source, carrier, destination — rather than as
 * a row of columns, because "where is my material" is answered by the route, not
 * by a status word.
 */
export function LogisticsControl({
  shipments,
  transporters,
  query,
}: {
  shipments: Shipment[];
  transporters: Transporter[];
  query: string;
}) {
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [losing, setLosing] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(key: string, input: unknown, after?: () => void) {
    setFailure(null);
    startTransition(async () => {
      const result = await runCommand(key, input, "/logistics");
      if (result.ok) {
        after?.();
        router.refresh();
      } else {
        setFailure(result);
      }
    });
  }

  const inTransit = shipments.filter((shipment) => shipment.state === "in_transit").length;

  return (
    <>
      {failure && (
        <div className="mb-4">
          <ErrorState
            title="That was refused"
            message={failure.message}
            issues={failure.issues}
            retryable={failure.retryable}
          />
        </div>
      )}

      <div className="mb-6">
        <Panel title="Find a shipment">
          {/* A GET form: the search lands in the URL, so a coordinator can send
              somebody the exact view they are looking at. */}
          <form className="flex flex-wrap items-end gap-3" method="get" action="/logistics">
            <div className="min-w-[320px] flex-1">
              <Field
                label="LR number, customer or order reference"
                htmlFor="logistics-search"
                hint="All three search the same field"
              >
                <Input
                  id="logistics-search"
                  name="q"
                  defaultValue={query}
                  placeholder="LR-90210"
                />
              </Field>
            </div>
            <Button type="submit" variant="primary">
              Search
            </Button>
            {query && (
              <Button type="button" onClick={() => router.push("/logistics")}>
                Clear
              </Button>
            )}
            <p className="m-0 w-full text-[12px] text-text-tertiary">
              {inTransit === 0
                ? "Nothing on the road right now."
                : `${inTransit} ${inTransit === 1 ? "shipment is" : "shipments are"} in transit.`}
            </p>
          </form>
        </Panel>
      </div>

      {shipments.length === 0 ? (
        <Panel flush>
          <EmptyState
            compact
            title={query ? "Nothing matches that" : "No shipments yet"}
            description={
              query
                ? "Try the LR number, or part of the customer name."
                : "A shipment appears here once one is raised against an order."
            }
          />
        </Panel>
      ) : (
        <div className="mb-4 flex flex-col gap-3">
          {shipments.map((shipment) => (
            <Panel key={shipment.shipmentId}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  {/* The route, in the order material actually moves. */}
                  <p className="m-0 text-[15px] text-text">
                    {shipment.sourceName}
                    <span className="mx-2 text-text-tertiary">to</span>
                    {shipment.destination}
                  </p>
                  <p className="mb-0 mt-1.5 text-[13px] text-text-secondary">
                    {shipment.transporterName ?? "No carrier yet"}
                    {shipment.vehicleReference && (
                      <span className="tabular"> · {shipment.vehicleReference}</span>
                    )}
                    {shipment.lrNumber && <span className="tabular"> · {shipment.lrNumber}</span>}
                    {shipment.orderReference && (
                      <span className="tabular"> · {shipment.orderReference}</span>
                    )}
                  </p>
                  <p className="mb-0 mt-1.5 text-[12px] text-text-tertiary">
                    {shipment.direction === "outbound" ? "Outbound" : "Inbound"} · freight{" "}
                    {rupees(shipment.freightChargePaise)} paid by {shipment.freightPayer}
                    {shipment.daysInTransit !== null && shipment.state === "in_transit" && (
                      <>
                        {" · out "}
                        {shipment.daysInTransit === 0
                          ? "today"
                          : `${shipment.daysInTransit} ${shipment.daysInTransit === 1 ? "day" : "days"}`}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StateBadge
                    category={STATE_CATEGORY[shipment.state] ?? "Pending"}
                    label={STATE_LABEL[shipment.state] ?? shipment.state}
                  />
                  {shipment.state === "draft" && (
                    <Button
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        setAssigning(assigning === shipment.shipmentId ? null : shipment.shipmentId)
                      }
                    >
                      {assigning === shipment.shipmentId ? "Close" : "Assign carrier"}
                    </Button>
                  )}
                  {shipment.state === "assigned" && (
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={pending}
                      onClick={() =>
                        run("verity.plywood.dispatch_shipment", { shipmentId: shipment.shipmentId })
                      }
                    >
                      Dispatch
                    </Button>
                  )}
                  {shipment.state === "in_transit" && (
                    <>
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={pending}
                        onClick={() =>
                          run("verity.plywood.confirm_delivery", {
                            shipmentId: shipment.shipmentId,
                          })
                        }
                      >
                        Delivered
                      </Button>
                      <Button
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          setLosing(losing === shipment.shipmentId ? null : shipment.shipmentId)
                        }
                      >
                        {losing === shipment.shipmentId ? "Close" : "Not arrived"}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {assigning === shipment.shipmentId && (
                <form
                  className="mt-4 flex flex-wrap items-end gap-3 rounded-lg bg-glass-2 p-3"
                  action={(formData) =>
                    run(
                      "verity.plywood.assign_carrier",
                      {
                        shipmentId: shipment.shipmentId,
                        transporterId: String(formData.get("transporterId") ?? ""),
                        lrNumber: String(formData.get("lrNumber") ?? ""),
                      },
                      () => setAssigning(null),
                    )
                  }
                >
                  <div className="min-w-[220px]">
                    <Field label="Carrier" htmlFor={`carrier-${shipment.shipmentId}`} required>
                      <Select
                        id={`carrier-${shipment.shipmentId}`}
                        name="transporterId"
                        required
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Choose a carrier
                        </option>
                        {transporters.map((transporter) => (
                          <option key={transporter.id} value={transporter.id}>
                            {transporter.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                  <div className="w-[200px]">
                    <Field label="LR number" htmlFor={`lr-${shipment.shipmentId}`} required>
                      <Input
                        id={`lr-${shipment.shipmentId}`}
                        name="lrNumber"
                        required
                        placeholder="LR-90210"
                      />
                    </Field>
                  </div>
                  <Button type="submit" variant="primary" disabled={pending}>
                    Assign
                  </Button>
                  <p className="m-0 w-full text-[12px] text-text-tertiary">
                    The LR number is required, not optional. It is the handle the carrier answers to
                    on the phone, and a shipment without one cannot be chased.
                  </p>
                </form>
              )}

              {losing === shipment.shipmentId && (
                <form
                  className="mt-4 flex flex-wrap items-end gap-3 rounded-lg bg-glass-2 p-3"
                  action={(formData) =>
                    run(
                      "verity.plywood.report_shipment_lost",
                      {
                        shipmentId: shipment.shipmentId,
                        reason: String(formData.get("reason") ?? ""),
                      },
                      () => setLosing(null),
                    )
                  }
                >
                  <div className="min-w-[320px] flex-1">
                    <Field
                      label="What happened to it?"
                      htmlFor={`lost-${shipment.shipmentId}`}
                      required
                    >
                      <Input
                        id={`lost-${shipment.shipmentId}`}
                        name="reason"
                        required
                        autoFocus
                        placeholder="Vehicle overturned near Ghaziabad"
                      />
                    </Field>
                  </div>
                  <Button type="submit" variant="danger" disabled={pending}>
                    Record loss
                  </Button>
                  <p className="m-0 w-full text-[12px] text-text-tertiary">
                    Recorded as cancelled, never as delivered. Goods that never arrived are not a
                    delivery, and counting them as one would quietly spoil every transit report.
                  </p>
                </form>
              )}
            </Panel>
          ))}
        </div>
      )}

      {transporters.length > 0 && (
        <Panel title="Carriers">
          <table className="w-full border-collapse">
            <caption className="sr-only">Carriers</caption>
            <thead>
              <tr>
                {["Carrier", "Phone", "On the road"].map((heading, index) => (
                  <th
                    key={heading}
                    className={
                      "border-b border-line px-3 py-2 text-[12px] font-normal text-text-tertiary " +
                      (index === 0 ? "text-left" : "text-right")
                    }
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transporters.map((transporter) => (
                <tr key={transporter.id}>
                  <td className="border-b border-line px-3 py-2 text-[14px] text-text">
                    {transporter.name}
                  </td>
                  <td className="tabular border-b border-line px-3 py-2 text-right text-[13px] text-text-secondary">
                    {transporter.phone ?? "—"}
                  </td>
                  <td className="tabular border-b border-line px-3 py-2 text-right text-[14px]">
                    {transporter.inTransit === 0 ? "—" : transporter.inTransit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </>
  );
}
