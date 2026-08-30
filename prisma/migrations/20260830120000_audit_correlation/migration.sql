-- ---------------------------------------------------------------------------
-- Audit correlation and source (Task 38)
--
-- Authority: taskplans/38_audit_business_history.md; EXE-AUD-001 (operational
-- stream), EXE-AUD-002 (security stream), EXE-AUD-003 (append-only at the
-- database level), MET-EVE-001 (events are write-once).
--
-- Before this, an `activity` row, the `domain_event` it produced and the
-- `security_audit_event` for the same request shared no identifier. The
-- platform could say what changed and could say a fact was published, but could
-- not say that the two happened in the same request — so "what else happened in
-- the operation that changed this price?" had no answer. Correlation is what
-- turns three separate records into a reconstructable history.
--
-- `source` records which channel the mutation arrived through (human, api, job,
-- agent — the PolicyChannel of Task 37, which until now was computed and
-- discarded). Deliberately TEXT and not an enum: the set will grow, and
-- altering an enum used by an append-only table is a migration nobody wants to
-- run against years of retained evidence.
--
-- Both columns are nullable. Rows written before this migration genuinely have
-- no correlation and no known source; a backfilled default would be a
-- fabricated fact in an evidence table, which is worse than an honest null.
-- ---------------------------------------------------------------------------

ALTER TABLE "activity"
  ADD COLUMN "correlation_id" UUID,
  ADD COLUMN "source" TEXT;

ALTER TABLE "domain_event"
  ADD COLUMN "correlation_id" UUID,
  ADD COLUMN "source" TEXT;

ALTER TABLE "security_audit_event"
  ADD COLUMN "correlation_id" UUID;

-- The reconstruction query is "everything with this correlation id, in this
-- tenant". Without the index that is a sequential scan of a table designed
-- never to be pruned.
CREATE INDEX "activity_tenant_id_correlation_id_idx"
  ON "activity"("tenant_id", "correlation_id");

CREATE INDEX "domain_event_tenant_id_correlation_id_idx"
  ON "domain_event"("tenant_id", "correlation_id");

CREATE INDEX "security_audit_event_tenant_id_correlation_id_idx"
  ON "security_audit_event"("tenant_id", "correlation_id");

-- ---------------------------------------------------------------------------
-- Extend the write-once guarantee to the new columns
--
-- `verity.domain_event_append_only()` freezes the fact by comparing an explicit
-- ROW(...) of its columns and permitting only `delivered_at` to change. An
-- explicit column list is the right design — it says exactly what is frozen —
-- but it means a column added later is mutable until it is named here.
--
-- Correlation and source are evidence: correlation is what proves two records
-- belong to the same request, and source is what distinguishes "a person did
-- this" from "an agent did this". Leaving either rewritable would let the one
-- part of the audit trail that establishes context be edited after the fact,
-- while the part it contextualises stayed frozen.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION verity.domain_event_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_privileged BOOLEAN;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT rolbypassrls OR rolsuper INTO v_privileged
    FROM pg_roles WHERE rolname = current_user;
    IF NOT COALESCE(v_privileged, FALSE) THEN
      RAISE EXCEPTION 'domain_event is write-once: DELETE is not permitted for the application role (MET-EVE-001)'
        USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;

  -- Only delivery marking may change; the fact itself is frozen.
  IF ROW(NEW.id, NEW.tenant_id, NEW.name, NEW.entity_key, NEW.entity_id,
         NEW.command_key, NEW.actor_user_id, NEW.payload, NEW.occurred_at,
         NEW.correlation_id, NEW.source)
     IS DISTINCT FROM
     ROW(OLD.id, OLD.tenant_id, OLD.name, OLD.entity_key, OLD.entity_id,
         OLD.command_key, OLD.actor_user_id, OLD.payload, OLD.occurred_at,
         OLD.correlation_id, OLD.source) THEN
    RAISE EXCEPTION 'domain_event is write-once: only delivered_at may change (MET-EVE-001)'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;
