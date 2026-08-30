-- ---------------------------------------------------------------------------
-- Credit and debit notes (slice 5)
--
-- Authority: taskplans/45_plywood_workflow_program.md §5, §4.5;
-- specification §67; PLYWOOD_TARGET_WORKFLOW_GAP_AUDIT.md P0-05.
--
-- Slice 1 made a posted invoice immutable for every role. That is only a
-- workable rule if there is a way to correct one, and this is it: a second
-- document that points at the invoice, rather than an amendment to it. Both
-- stand in the record afterwards — the invoice is what the customer holds and
-- what was reported, the note is what changed.
-- ---------------------------------------------------------------------------

CREATE TABLE "plywood_invoice_note" (
  "id"             UUID NOT NULL,
  "tenant_id"      UUID NOT NULL,
  "invoice_id"     UUID NOT NULL,
  "note_type"      TEXT NOT NULL,
  "note_number"    TEXT NOT NULL,
  "financial_year" TEXT NOT NULL,
  "taxable_paise"  INTEGER NOT NULL,
  "cgst_paise"     INTEGER NOT NULL DEFAULT 0,
  "sgst_paise"     INTEGER NOT NULL DEFAULT 0,
  "igst_paise"     INTEGER NOT NULL DEFAULT 0,
  "total_paise"    INTEGER NOT NULL,
  "reason"         TEXT NOT NULL,
  "issued_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "issued_by"      UUID NOT NULL,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "plywood_invoice_note_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "plywood_invoice_note_type" CHECK ("note_type" IN ('credit', 'debit')),
  -- Amounts are positive on the document; the DIRECTION is the note type.
  -- A negative credit note is a debit note wearing the wrong name, and the two
  -- are reported to different places.
  CONSTRAINT "plywood_invoice_note_amounts_positive"
    CHECK ("taxable_paise" > 0 AND "total_paise" > 0),
  CONSTRAINT "plywood_invoice_note_tax_non_negative"
    CHECK ("cgst_paise" >= 0 AND "sgst_paise" >= 0 AND "igst_paise" >= 0),
  -- The total is its parts. Checked here rather than trusted from the caller,
  -- because a note whose total disagrees with its tax lines cannot be filed.
  CONSTRAINT "plywood_invoice_note_total_is_its_parts"
    CHECK ("total_paise" = "taxable_paise" + "cgst_paise" + "sgst_paise" + "igst_paise"),
  -- Intrastate carries CGST and SGST together; interstate carries IGST alone.
  -- Both at once is not a supply that exists.
  CONSTRAINT "plywood_invoice_note_tax_pairing"
    CHECK (("igst_paise" = 0) OR ("cgst_paise" = 0 AND "sgst_paise" = 0)),
  CONSTRAINT "plywood_invoice_note_reason_present"
    CHECK (length(btrim("reason")) >= 3)
);

CREATE UNIQUE INDEX "plywood_invoice_note_tenant_id_note_number_key"
  ON "plywood_invoice_note"("tenant_id", "note_number");
CREATE UNIQUE INDEX "plywood_invoice_note_tenant_scoped_id"
  ON "plywood_invoice_note"("tenant_id", "id");
CREATE INDEX "plywood_invoice_note_tenant_id_invoice_id_idx"
  ON "plywood_invoice_note"("tenant_id", "invoice_id");
CREATE INDEX "plywood_invoice_note_tenant_id_issued_at_idx"
  ON "plywood_invoice_note"("tenant_id", "issued_at");

ALTER TABLE "plywood_invoice_note"
  ADD CONSTRAINT "plywood_invoice_note_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "plywood_invoice_note_invoice_fkey"
    FOREIGN KEY ("tenant_id", "invoice_id") REFERENCES "plywood_invoice"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- A note corrects an invoice. Nothing corrects a note except another note.
CREATE TRIGGER plywood_invoice_note_immutable
  BEFORE UPDATE ON "plywood_invoice_note"
  FOR EACH ROW EXECUTE FUNCTION verity.plywood_posted_document_immutable();

ALTER TABLE "plywood_invoice_note" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plywood_invoice_note" FORCE ROW LEVEL SECURITY;
CREATE POLICY plywood_invoice_note_tenant_isolation ON "plywood_invoice_note"
  USING ("tenant_id" = verity.current_tenant_id())
  WITH CHECK ("tenant_id" = verity.current_tenant_id());
