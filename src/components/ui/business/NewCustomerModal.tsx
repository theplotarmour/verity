"use client";

import { useState } from "react";
import { Button, Field, FormRow, Input } from "@/components/ui/primitives";
import { Modal, ModalCancel } from "@/components/ui/Modal";

/**
 * Creating a customer.
 *
 * One component, three places: the Customers page, the Sales desk, and inside
 * the new-order form for the customer who does not exist yet. It used to be an
 * inline panel on the Sales desk only — so the Customers page, which is where
 * anyone looks for a customer first, could not create one, and a sale to a new
 * buyer meant abandoning a half-written order.
 *
 * The credit limit stays on the form rather than being assumed. Zero means cash
 * only, which is the safe default and the one this business should have to
 * choose against deliberately.
 */
export function NewCustomerModal({
  open,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: {
    displayName: string;
    gstin?: string;
    stateCode?: string;
    phone?: string;
    creditLimitPaise: number;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [gstin, setGstin] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [phone, setPhone] = useState("");
  const [limit, setLimit] = useState("0");

  function reset() {
    setName("");
    setGstin("");
    setStateCode("");
    setPhone("");
    setLimit("0");
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="New customer"
      description="The state code decides whether their invoices carry IGST or CGST and SGST, so a sale cannot be taxed without it."
      footer={
        <>
          <ModalCancel
            onClose={() => {
              reset();
              onClose();
            }}
            disabled={pending}
          />
          <Button
            variant="primary"
            disabled={pending || name.trim() === ""}
            onClick={() => {
              const parsed = Number.parseFloat(limit);
              onSubmit({
                displayName: name.trim(),
                ...(gstin.trim() ? { gstin: gstin.trim() } : {}),
                ...(stateCode.trim() ? { stateCode: stateCode.trim() } : {}),
                ...(phone.trim() ? { phone: phone.trim() } : {}),
                creditLimitPaise: Number.isFinite(parsed)
                  ? Math.round(parsed * 100)
                  : 0,
              });
              reset();
            }}
          >
            {pending ? "Creating…" : "Create"}
          </Button>
        </>
      }
    >
      <FormRow columns="minmax(0,1.4fr) minmax(0,1fr)">
        <Field label="Customer" htmlFor="customer-name" required>
          <Input
            id="customer-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />
        </Field>
        <Field label="Phone" htmlFor="customer-phone">
          <Input
            id="customer-phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </Field>
        <Field label="GSTIN" htmlFor="customer-gstin" hint="15 characters">
          <Input
            id="customer-gstin"
            value={gstin}
            onChange={(event) => setGstin(event.target.value.toUpperCase())}
            maxLength={15}
          />
        </Field>
        <Field
          label="State code"
          htmlFor="customer-state"
          hint="Two digits — 07 for Delhi"
        >
          <Input
            id="customer-state"
            value={stateCode}
            onChange={(event) => setStateCode(event.target.value)}
            inputMode="numeric"
            pattern="[0-9]{2}"
            maxLength={2}
          />
        </Field>
        <Field
          label="Credit limit (₹)"
          htmlFor="customer-limit"
          hint="Zero means cash only"
        >
          <Input
            id="customer-limit"
            type="number"
            step="0.01"
            min="0"
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
          />
        </Field>
      </FormRow>
    </Modal>
  );
}
