"use client";

import { useState } from "react";
import { Field, FormRow, Input } from "@/components/ui/primitives";
import { CommandButton } from "@/components/ui/CommandAccess";
import { Modal, ModalCancel } from "@/components/ui/Modal";

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
 *
 * One component, two places (2026-09-15): the Suppliers page, and inside the
 * new-purchase-order form for the supplier who does not exist yet — the same
 * reason `NewCustomerModal` sits inside the sales form.
 */
export type SupplierDraft = {
  id: string;
  displayName: string;
  gstin: string | null;
  phone: string | null;
  stateCode: string | null;
};

export function NewSupplierModal({
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
  initial?: SupplierDraft | null;
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
          <CommandButton commands={["verity.trading.create_supplier","verity.trading.edit_supplier"]}
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
          </CommandButton>
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
