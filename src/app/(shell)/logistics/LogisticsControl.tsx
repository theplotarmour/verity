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
  godowns,
  customers,
  salesOrders,
  purchaseOrders,
  query,
}: {
  shipments: Shipment[];
  transporters: Transporter[];
  godowns: Array<{ id: string; name: string }>;
  customers: Array<{ id: string; name: string }>;
  salesOrders: Array<{ id: string; label: string }>;
  purchaseOrders: Array<{ id: string; label: string }>;
  query: string;
}) {
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [losing, setLosing] = useState<string | null>(null);
  const [newCarrier, setNewCarrier] = useState(false);
  const [newShipment, setNewShipment] = useState(false);
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

      <div className="mb-4 flex justify-end gap-2">
        <Button onClick={() => setNewCarrier((open) => !open)}>
          {newCarrier ? "Cancel" : "New carrier"}
        </Button>
        <Button
          variant="primary"
          disabled={
            godowns.length === 0 || (salesOrders.length === 0 && purchaseOrders.length === 0)
          }
          onClick={() => setNewShipment((open) => !open)}
        >
          {newShipment ? "Cancel" : "New shipment"}
        </Button>
      </div>

      {newCarrier && (
        <div className="mb-6">
          <Panel title="New carrier">
            <form
              className="flex flex-wrap items-end gap-3"
              action={(formData) =>
                run(
                  "verity.plywood.create_transporter",
                  {
                    name: String(formData.get("name") ?? ""),
                    ...(formData.get("phone") ? { phone: String(formData.get("phone")) } : {}),
                  },
                  () => setNewCarrier(false),
                )
              }
            >
              <div className="min-w-[240px] flex-1">
                <Field label="Carrier" htmlFor="carrier-name" required>
                  <Input
                    id="carrier-name"
                    name="name"
                    required
                    autoFocus
                    placeholder="Delhi Roadways"
                  />
                </Field>
              </div>
              <div className="w-[180px]">
                <Field label="Phone" htmlFor="carrier-phone">
                  <Input id="carrier-phone" name="phone" />
                </Field>
              </div>
              <Button type="submit" variant="primary" disabled={pending}>
                Create
              </Button>
              <p className="m-0 w-full text-[12px] text-text-tertiary">
                A record, not a login. Transit status is updated by the coordinator, which is how
                the business runs today.
              </p>
            </form>
          </Panel>
        </div>
      )}

      {newShipment && (
        <div className="mb-6">
          <Panel title="New shipment">
            <NewShipmentForm
              godowns={godowns}
              customers={customers}
              salesOrders={salesOrders}
              purchaseOrders={purchaseOrders}
              pending={pending}
              onSubmit={(input) =>
                run("verity.plywood.create_shipment", input, () => setNewShipment(false))
              }
            />
          </Panel>
        </div>
      )}

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

/**
 * Raising a shipment.
 *
 * Outbound or inbound is one choice and it decides everything else: outbound
 * leaves a godown for a customer against a sales order, inbound arrives at a
 * godown against a purchase order. The command requires exactly one order and
 * exactly one destination, and two check constraints agree with it — so this
 * form simply never offers a combination that would be refused.
 */
function NewShipmentForm({
  godowns,
  customers,
  salesOrders,
  purchaseOrders,
  pending,
  onSubmit,
}: {
  godowns: Array<{ id: string; name: string }>;
  customers: Array<{ id: string; name: string }>;
  salesOrders: Array<{ id: string; label: string }>;
  purchaseOrders: Array<{ id: string; label: string }>;
  pending: boolean;
  onSubmit: (input: unknown) => void;
}) {
  const [direction, setDirection] = useState<"outbound" | "inbound">(
    salesOrders.length > 0 ? "outbound" : "inbound",
  );

  const outbound = direction === "outbound";
  const orders = outbound ? salesOrders : purchaseOrders;

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      action={(formData) => {
        const base = {
          sourceLocationId: String(formData.get("sourceLocationId") ?? ""),
          // Rupees in, paise out, as everywhere else.
          freightChargePaise: Math.round(Number(formData.get("freight") ?? 0) * 100),
          freightPayer: String(formData.get("freightPayer") ?? "tenant"),
        };
        onSubmit(
          outbound
            ? {
                ...base,
                salesOrderId: String(formData.get("orderId") ?? ""),
                destCustomerId: String(formData.get("destCustomerId") ?? ""),
              }
            : {
                ...base,
                purchaseOrderId: String(formData.get("orderId") ?? ""),
                destLocationId: String(formData.get("destLocationId") ?? ""),
              },
        );
      }}
    >
      <div className="w-[170px]">
        <Field label="Direction" htmlFor="shipment-direction" required>
          <Select
            id="shipment-direction"
            name="direction"
            value={direction}
            onChange={(event) => setDirection(event.target.value as "outbound" | "inbound")}
          >
            <option value="outbound" disabled={salesOrders.length === 0}>
              Out to a customer
            </option>
            <option value="inbound" disabled={purchaseOrders.length === 0}>
              In to a godown
            </option>
          </Select>
        </Field>
      </div>

      <div className="min-w-[220px] flex-1">
        <Field
          label={outbound ? "Sales order" : "Purchase order"}
          htmlFor="shipment-order"
          required
        >
          <Select id="shipment-order" name="orderId" required defaultValue="">
            <option value="" disabled>
              Choose an order
            </option>
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="min-w-[170px]">
        <Field label="From godown" htmlFor="shipment-source" required>
          <Select id="shipment-source" name="sourceLocationId" required defaultValue="">
            <option value="" disabled>
              Choose a godown
            </option>
            {godowns.map((godown) => (
              <option key={godown.id} value={godown.id}>
                {godown.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="min-w-[190px]">
        {outbound ? (
          <Field label="To customer" htmlFor="shipment-dest-customer" required>
            <Select id="shipment-dest-customer" name="destCustomerId" required defaultValue="">
              <option value="" disabled>
                Choose a customer
              </option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <Field label="To godown" htmlFor="shipment-dest-godown" required>
            <Select id="shipment-dest-godown" name="destLocationId" required defaultValue="">
              <option value="" disabled>
                Choose a godown
              </option>
              {godowns.map((godown) => (
                <option key={godown.id} value={godown.id}>
                  {godown.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>

      <div className="w-[150px]">
        <Field label="Freight (₹)" htmlFor="shipment-freight">
          <Input
            id="shipment-freight"
            name="freight"
            type="number"
            step="0.01"
            min="0"
            defaultValue={0}
          />
        </Field>
      </div>

      <div className="w-[160px]">
        <Field label="Freight paid by" htmlFor="shipment-payer" required>
          <Select id="shipment-payer" name="freightPayer" required defaultValue="tenant">
            <option value="tenant">Us</option>
            <option value="customer">Customer</option>
            <option value="supplier">Supplier</option>
          </Select>
        </Field>
      </div>

      <Button type="submit" variant="primary" disabled={pending}>
        Create
      </Button>

      <p className="m-0 w-full text-[12px] text-text-tertiary">
        Who bears the freight changes the margin on the sale, so it is recorded rather than assumed
        at reporting time. Assign a carrier and an LR number next — a shipment without one cannot be
        chased.
      </p>
    </form>
  );
}
