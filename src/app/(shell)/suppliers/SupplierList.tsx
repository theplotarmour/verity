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

export function SupplierList({
  suppliers,
  customers,
}: {
  suppliers: Supplier[];
  /** For marking a supplier as the same business as one of these. */
  customers: Array<{ id: string; displayName: string }>;
}) {
  const [filter, setFilter] = useState("");
  // Task 71 item 3. Creating a supplier used to live on the Purchases desk,
  // beside the order table, which is the wrong place twice over: a supplier is
  // a party you keep rather than something you make while placing an order, and
  // anyone looking for one comes here first.
  const [creating, setCreating] = useState(false);
  // Reported: "the suppliers can be our customers as well."
  const [linking, setLinking] = useState<Supplier | null>(null);
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
      outstanding: suppliers.reduce((sum, s) => sum + s.outstandingPaise, 0),
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

  function link(input: unknown) {
    setFailure(null);
    startTransition(async () => {
      const result = await runCommand(
        "verity.plywood.link_supplier_to_customer",
        input,
        "/suppliers",
      );
      if (result.ok) {
        setLinking(null);
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
      <LinkCustomerModal
        supplier={linking}
        customers={customers}
        pending={pending}
        onClose={() => setLinking(null)}
        onSubmit={link}
      />
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
        <Stat label="Payable" value={rupeesShort(totals.outstanding)} hint="Invoices received, unpaid" />
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
                    {supplier.linkedCustomerName
                      ? ` · also a customer (${supplier.linkedCustomerName})`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-8 text-right">
                  <div>
                    <p className="tabular m-0 text-[14px] text-text">
                      {rupees(supplier.outstandingPaise)}
                    </p>
                    <p className="m-0 text-[12px] text-text-tertiary">Outstanding</p>
                  </div>
                  <div className="hidden sm:block">
                    <p className="tabular m-0 text-[14px] text-text">
                      {rupees(supplier.openCommitmentPaise)}
                    </p>
                    <p className="m-0 text-[12px] text-text-tertiary">
                      {supplier.openOrders === 1 ? "1 open order" : `${supplier.openOrders} open orders`}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setLinking(supplier)}>
                    {supplier.linkedCustomerName
                      ? "Change link"
                      : "Also a customer…"}
                  </Button>
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
}: {
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: unknown) => void;
}) {
  const [name, setName] = useState("");
  const [gstin, setGstin] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [phone, setPhone] = useState("");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New supplier"
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
            {pending ? "Creating…" : "Create"}
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


/**
 * Marking a supplier and a customer as the same business.
 *
 * REPORTED: "the suppliers can be our customers as well."
 *
 * It does not merge them, and the copy says so. Buying and selling keep
 * separate documents, separate credit limits and separate ledgers because they
 * are separate obligations — netting a debt against a receivable without saying
 * so misstates both. What this buys is that the two are shown as one
 * relationship wherever a person is asking about the relationship.
 */
function LinkCustomerModal({
  supplier,
  customers,
  pending,
  onClose,
  onSubmit,
}: {
  supplier: Supplier | null;
  customers: Array<{ id: string; displayName: string }>;
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: unknown) => void;
}) {
  const [customerId, setCustomerId] = useState("");

  return (
    <Modal
      open={supplier !== null}
      onClose={onClose}
      title={`Is ${supplier?.displayName ?? "this supplier"} also a customer?`}
      description="Buying and selling stay separate — separate invoices, separate credit limit, separate ledger. Linking them only means Verity shows one relationship instead of two."
      width="sm"
      footer={
        <>
          {supplier?.linkedCustomerId && (
            <Button
              className="mr-auto"
              disabled={pending}
              onClick={() => onSubmit({ supplierId: supplier.id })}
            >
              Unlink
            </Button>
          )}
          <ModalCancel onClose={onClose} disabled={pending} />
          <Button
            variant="primary"
            disabled={pending || customerId === ""}
            onClick={() =>
              onSubmit({ supplierId: supplier!.id, customerId })
            }
          >
            {pending ? "Linking…" : "Link"}
          </Button>
        </>
      }
    >
      <Field
        label="The same business, as a customer"
        htmlFor="link-customer"
        hint={
          supplier?.linkedCustomerName
            ? `Currently linked to ${supplier.linkedCustomerName}`
            : "They must share a GSTIN if both have one"
        }
        required
      >
        <Combobox
          id="link-customer"
          value={customerId}
          onChange={setCustomerId}
          required
          placeholder="Search customers"
          options={customers.map((row) => ({
            value: row.id,
            label: row.displayName,
          }))}
        />
      </Field>
    </Modal>
  );
}
