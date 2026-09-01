"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  FormRow,
  Input,
  Panel,
  Row,
  RowList,
  Stat,
  StatRow,
} from "@/components/ui/primitives";
import { Modal, ModalCancel } from "@/components/ui/Modal";
import { Combobox } from "@/components/ui/Combobox";
import { rupees, rupeesShort } from "@/components/ui/business/format";
import { runCommand } from "@/server/actions/platform";
import type { ActionFailure } from "@/server/platform/action-error";

type Supplier = {
  id: string;
  displayName: string;
  gstin: string | null;
  phone: string | null;
  stateCode: string | null;
  active: boolean;
  openOrders: number;
  outstandingPaise: number;
  openCommitmentPaise: number;
  linkedCustomerId: string | null;
  linkedCustomerName: string | null;
};

export function SupplierList({ suppliers }: { suppliers: Supplier[] }) {
  const [filter, setFilter] = useState("");
  // Task 71 item 3. Creating a supplier used to live on the Purchases desk,
  // beside the order table, which is the wrong place twice over: a supplier is
  // a party you keep rather than something you make while placing an order, and
  // anyone looking for one comes here first.
  const [creating, setCreating] = useState(false);
  // Requested: edit and remove. Removing DEACTIVATES a supplier who has been
  // traded with and deletes one who has not — see removeSupplier for why.
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [removing, setRemoving] = useState<Supplier | null>(null);
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const shown = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return suppliers;
    // Name or GSTIN: a buyer looking one up has one or the other in front of
    // them, and which one depends on whether they are holding a bill.
    return suppliers.filter(
      (supplier) =>
        supplier.displayName.toLowerCase().includes(needle) ||
        (supplier.gstin ?? "").toLowerCase().includes(needle),
    );
  }, [suppliers, filter]);

  const totals = useMemo(
    () => ({
      // Only what is actually owed OUT. Summing the signed balances let a
      // supplier who owes us money cancel part of what we owe everyone else,
      // which is a net position rather than a payable and reads as neither.
      outstanding: suppliers.reduce(
        (sum, s) => sum + Math.max(0, -s.outstandingPaise),
        0,
      ),
      owedToUs: suppliers.reduce(
        (sum, s) => sum + Math.max(0, s.outstandingPaise),
        0,
      ),
      committed: suppliers.reduce((sum, s) => sum + s.openCommitmentPaise, 0),
      openOrders: suppliers.reduce((sum, s) => sum + s.openOrders, 0),
    }),
    [suppliers],
  );

  function create(input: unknown) {
    setFailure(null);
    startTransition(async () => {
      const result = await runCommand(
        "verity.plywood.create_supplier",
        input,
        "/suppliers",
      );
      if (result.ok) {
        setCreating(false);
        router.refresh();
      } else {
        setFailure(result);
      }
    });
  }

  function send(key: string, input: unknown, done: () => void) {
    setFailure(null);
    startTransition(async () => {
      const result = await runCommand(key, input, "/suppliers");
      if (result.ok) {
        done();
        router.refresh();
      } else {
        setFailure(result);
      }
    });
  }

  const dialog = (
    <>
      <NewSupplierModal
        open={creating}
        pending={pending}
        onClose={() => setCreating(false)}
        onSubmit={create}
      />
      <NewSupplierModal
        open={editing !== null}
        pending={pending}
        initial={editing}
        onClose={() => setEditing(null)}
        onSubmit={(input) =>
          send(
            "verity.plywood.edit_supplier",
            { supplierId: editing!.id, ...(input as Record<string, unknown>) },
            () => setEditing(null),
          )
        }
      />
      <Modal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={`Remove ${removing?.displayName ?? ""}?`}
        description="If you have ever bought from them they are kept and simply stop being offered — their orders, bills and ledger explain money and cannot be orphaned. A supplier with no history is deleted outright."
        width="sm"
        footer={
          <>
            <ModalCancel onClose={() => setRemoving(null)} disabled={pending}>
              Keep
            </ModalCancel>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() =>
                send(
                  "verity.plywood.remove_supplier",
                  { supplierId: removing!.id },
                  () => setRemoving(null),
                )
              }
            >
              Remove
            </Button>
          </>
        }
      >
        <p className="m-0 text-[13px] text-text-secondary">
          Nothing already recorded against them changes either way.
        </p>
      </Modal>
    </>
  );

  if (suppliers.length === 0) {
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
        <EmptyState
          title="No suppliers yet"
          description="Add the first one here, or let a purchase order create it."
          action={
            <Button variant="primary" onClick={() => setCreating(true)}>
              New supplier
            </Button>
          }
        />
        {dialog}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {failure && (
        <ErrorState
          title="That was refused"
          message={failure.message}
          issues={failure.issues}
          retryable={failure.retryable}
        />
      )}
      <StatRow cols={4}>
        <Stat label="Suppliers" value={suppliers.length} />
        <Stat
          label="We need to send"
          value={rupeesShort(totals.outstanding)}
          hint="Bills received and not yet paid"
        />
        <Stat
          label="Committed"
          value={rupeesShort(totals.committed)}
          hint="Ordered, not yet billed"
        />
        <Stat label="Open orders" value={totals.openOrders} href="/purchases" />
      </StatRow>

      <Panel
        flush
        title="All suppliers"
        // Width on the wrapper, not the control: `Input` already sets
        // `w-full`, and two width utilities on one element resolve by
        // stylesheet order rather than by which was written last.
        action={
          <div className="flex items-center gap-2">
            <div className="w-56">
              <Input
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Name or GSTIN"
                aria-label="Filter suppliers"
              />
            </div>
            <Button variant="primary" onClick={() => setCreating(true)}>
              New supplier
            </Button>
          </div>
        }
      >
        {shown.length === 0 ? (
          <div className="px-5 py-6">
            <EmptyState compact title="No supplier matches that" />
          </div>
        ) : (
          <RowList>
            {shown.map((supplier) => (
              <Row key={supplier.id}>
                <div className="min-w-0">
                  {/* The name is the link. §71: never make someone search for
                      context they are already looking at. */}
                  <Link
                    href={`/suppliers/${supplier.id}`}
                    className="text-[14px] text-text no-underline hover:underline"
                  >
                    {supplier.displayName}
                  </Link>
                  <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">
                    {supplier.gstin ?? "No GSTIN recorded"}
                    {supplier.phone ? ` · ${supplier.phone}` : ""}
                    {supplier.linkedCustomerName ? " · also a customer" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-8 text-right">
                  <div>
                    {/* Reported: the negative figure was confusing. It was the
                        raw ledger sum — a supplier's bill is a CREDIT, so owing
                        them showed as a minus, which is correct double-entry
                        and not something a merchant agreed to read. The sign is
                        now a sentence and the number is always positive. */}
                    <p className="tabular m-0 text-[14px] text-text">
                      {rupees(Math.abs(supplier.outstandingPaise))}
                    </p>
                    <p className="m-0 text-[12px] text-text-tertiary">
                      {supplier.outstandingPaise < 0
                        ? "We need to send"
                        : supplier.outstandingPaise > 0
                          ? "They need to send us"
                          : "Settled"}
                    </p>
                  </div>
                  <div className="hidden sm:block">
                    <p className="tabular m-0 text-[14px] text-text">
                      {rupees(supplier.openCommitmentPaise)}
                    </p>
                    <p className="m-0 text-[12px] text-text-tertiary">
                      {supplier.openOrders === 1 ? "1 open order" : `${supplier.openOrders} open orders`}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" onClick={() => setEditing(supplier)}>
                      Edit
                    </Button>
                    <Button size="sm" onClick={() => setRemoving(supplier)}>
                      Remove
                    </Button>
                  </div>

                </div>
              </Row>
            ))}
          </RowList>
        )}
      </Panel>
      {dialog}
    </div>
  );
}

/**
 * Creating a supplier.
 *
 * The form from the reported screenshot, where Supplier, GSTIN, State code and
 * Phone each sat at a different height because the row aligned their BOTTOMS
 * and only two of them carried a hint. `FormRow` puts all four on one subgrid,
 * so the labels line up, the inputs line up, and the hints line up (item 2).
 *
 * The state code is asked for here rather than left for later because a
 * supplier without one cannot be taxed: the bill raised when their goods
 * arrive has no way to decide between IGST and CGST+SGST, and refuses.
 */
function NewSupplierModal({
  open,
  pending,
  onClose,
  onSubmit,
  /** Present when correcting an existing supplier rather than adding one. */
  initial,
}: {
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: unknown) => void;
  initial?: Supplier | null;
}) {
  const [name, setName] = useState("");
  const [gstin, setGstin] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [phone, setPhone] = useState("");
  // Seeded when the dialog opens on a record, not in an effect: an effect would
  // overwrite a half-typed correction on the next render.
  const [loaded, setLoaded] = useState<string | null>(null);
  const key = open ? (initial?.id ?? "__new__") : null;
  if (key !== loaded) {
    setLoaded(key);
    setName(initial?.displayName ?? "");
    setGstin(initial?.gstin ?? "");
    setStateCode(initial?.stateCode ?? "");
    setPhone(initial?.phone ?? "");
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Edit supplier" : "New supplier"}
      description="The state code decides whether their bills carry IGST or CGST and SGST."
      footer={
        <>
          <ModalCancel onClose={onClose} disabled={pending} />
          <Button
            variant="primary"
            disabled={pending || name.trim() === ""}
            onClick={() =>
              onSubmit({
                displayName: name.trim(),
                ...(gstin.trim() ? { gstin: gstin.trim() } : {}),
                ...(stateCode.trim() ? { stateCode: stateCode.trim() } : {}),
                ...(phone.trim() ? { phone: phone.trim() } : {}),
              })
            }
          >
            {pending ? "Saving…" : initial ? "Save" : "Create"}
          </Button>
        </>
      }
    >
      <FormRow columns="minmax(0,1.4fr) minmax(0,1fr)">
        <Field label="Supplier" htmlFor="supplier-name" required>
          <Input
            id="supplier-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />
        </Field>
        <Field label="Phone" htmlFor="supplier-phone">
          <Input
            id="supplier-phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </Field>
        <Field label="GSTIN" htmlFor="supplier-gstin" hint="15 characters">
          <Input
            id="supplier-gstin"
            value={gstin}
            onChange={(event) => setGstin(event.target.value.toUpperCase())}
            maxLength={15}
          />
        </Field>
        <Field
          label="State code"
          htmlFor="supplier-state"
          hint="Two digits — 07 for Delhi"
        >
          <Input
            id="supplier-state"
            value={stateCode}
            onChange={(event) => setStateCode(event.target.value)}
            inputMode="numeric"
            pattern="[0-9]{2}"
            maxLength={2}
          />
        </Field>
      </FormRow>
    </Modal>
  );
}
