-- ---------------------------------------------------------------------------
-- CAPABILITY: Plywood trading -- the stock ledger must refuse loudly
--
-- The install migration gave `stock_ledger_entry` a SELECT policy and an INSERT
-- policy and no others, on the reasoning that a mutation would then be refused
-- twice: once by the missing policy and once by the append-only trigger.
--
-- That reasoning was wrong in a way a test caught. With no UPDATE policy, RLS
-- filters every row out of the statement BEFORE the trigger can see it, so
-- `UPDATE stock_ledger_entry SET ...` reports zero rows affected and succeeds.
-- The row is not rewritten — but the caller is told the write worked, which is
-- the worst of the three possible outcomes. Someone who believes they corrected
-- a movement, and did not, is worse off than someone who was refused.
--
-- These policies make the rows visible to an UPDATE or DELETE statement inside
-- the correct tenant, so the trigger is reached and raises. The trigger remains
-- the enforcement; the policies only keep the refusal tenant-scoped and audible.
-- ---------------------------------------------------------------------------

CREATE POLICY "stock_ledger_entry_reject_update" ON "stock_ledger_entry"
  FOR UPDATE USING ("tenant_id" = verity.current_tenant_id());

CREATE POLICY "stock_ledger_entry_reject_delete" ON "stock_ledger_entry"
  FOR DELETE USING ("tenant_id" = verity.current_tenant_id());
