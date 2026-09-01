-- ---------------------------------------------------------------------------
-- The same-business link must not null a tenant id
--
-- 20260901180000 added plywood_supplier.linked_customer_id with a COMPOSITE
-- foreign key on (tenant_id, linked_customer_id) and ON DELETE SET NULL.
--
-- That is wrong, and it is the kind of wrong that only appears when someone
-- deletes a customer. ON DELETE SET NULL with no column list nulls EVERY
-- column of the key — including tenant_id, which is NOT NULL — so the delete
-- fails with:
--
--   null value in column "tenant_id" violates not-null constraint
--
-- The customer becomes undeletable, and the error names a column nobody
-- touched. It surfaced while reseeding demo data; it would have surfaced in
-- production the first time a client removed a linked customer.
--
-- PostgreSQL 15 added a column list for exactly this case. Only the link is
-- cleared; the row stays in its tenant, which is the only sane reading of
-- "this customer no longer exists" for a supplier that pointed at them.
-- ---------------------------------------------------------------------------

ALTER TABLE "plywood_supplier"
  DROP CONSTRAINT "plywood_supplier_linked_customer_id_fkey";

ALTER TABLE "plywood_supplier"
  ADD CONSTRAINT "plywood_supplier_linked_customer_id_fkey"
  FOREIGN KEY ("tenant_id", "linked_customer_id")
  REFERENCES "plywood_customer"("tenant_id", "id")
  ON DELETE SET NULL ("linked_customer_id")
  ON UPDATE NO ACTION;
