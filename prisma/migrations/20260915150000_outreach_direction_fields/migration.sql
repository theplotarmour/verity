-- ---------------------------------------------------------------------------
-- Task 106 Phase 7: Company Direction field extension (spec §91, §10, §66).
-- Additive, nullable-first; existing rows keep their meaning unchanged.
-- ---------------------------------------------------------------------------

ALTER TABLE "outreach_direction"
  ADD COLUMN "priority_industries" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "secondary_opportunity" TEXT,
  ADD COLUMN "geographic_focus" TEXT,
  ADD COLUMN "target_company_profile" TEXT,
  ADD COLUMN "closed_at" TIMESTAMP(3);

-- A direction already Closed before this column existed was closed by the
-- next one's posting; stamp that moment so history reads continuously.
UPDATE "outreach_direction" AS d
SET "closed_at" = n.next_posted_at
FROM (
  SELECT id, lead("posted_at") OVER (PARTITION BY "tenant_id" ORDER BY "posted_at") AS next_posted_at
  FROM "outreach_direction"
) AS n
WHERE d.id = n.id AND d."status" = 'Closed' AND d."closed_at" IS NULL AND n.next_posted_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 20260907000000_audit_controls attaches `audit_command_mutation` to every
-- tenant table that exists when it runs. On the shared database that was
-- after every outreach table; on a fresh database (CI) it runs before them,
-- so the outreach tables silently carried no field-level audit there. That
-- migration's own note: "New tables need this trigger in their migration
-- as well." Idempotent so both orderings end in the same state.
-- ---------------------------------------------------------------------------
DO $$ DECLARE t text; BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name LIKE 'outreach\_%'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_command_mutation ON public.%I', t);
    EXECUTE format('CREATE TRIGGER audit_command_mutation AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION verity.audit_command_mutation()', t);
  END LOOP;
END $$;
