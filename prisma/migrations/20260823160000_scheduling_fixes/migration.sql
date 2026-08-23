-- ---------------------------------------------------------------------------
-- Two corrections found by the shared-capability tests.
--
-- 1. resource_is_free took TIMESTAMP(3) but every caller passes a timestamptz,
--    so PostgreSQL could not resolve the overload at all. Prisma sends
--    timestamptz for a DateTime, and a scheduling window without a zone is
--    ambiguous anyway once resources span regions.
--
-- 2. tenant_activation_protect_dependants correctly refuses to suspend a
--    capability others depend on, but it also fired while a tenant was being
--    deleted, making a tenant with dependent activations undeletable. The
--    protection is about leaving live dependants stranded; when the tenant
--    itself is going away there are no survivors to strand.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS verity.resource_is_free(UUID, TIMESTAMP(3), TIMESTAMP(3));

CREATE OR REPLACE FUNCTION verity.resource_is_free(
  p_resource_id UUID, p_starts_at TIMESTAMPTZ, p_ends_at TIMESTAMPTZ
) RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM booking b
    WHERE b.resource_id = p_resource_id AND NOT b.cancelled
      AND b.starts_at < p_ends_at AND p_starts_at < b.ends_at
  ) AND NOT EXISTS (
    SELECT 1 FROM availability_window w
    WHERE w.resource_id = p_resource_id AND w.available = false
      AND w.starts_at < p_ends_at AND p_starts_at < w.ends_at
  );
$$;

CREATE OR REPLACE FUNCTION verity.tenant_activation_protect_dependants()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_dependants TEXT[];
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'Active' THEN
    RETURN NEW;
  END IF;

  -- Cascade from a tenant deletion: the dependants are being removed too, so
  -- there is nothing left to protect.
  IF TG_OP = 'DELETE' AND NOT EXISTS (SELECT 1 FROM tenant WHERE id = OLD.tenant_id) THEN
    RETURN OLD;
  END IF;

  SELECT array_agg(ta.capability_id) INTO v_dependants
  FROM tenant_activation ta
  JOIN capability_definition cd ON cd.id = ta.capability_id
  WHERE ta.tenant_id = OLD.tenant_id
    AND ta.status = 'Active'
    AND ta.capability_id <> OLD.capability_id
    AND OLD.capability_id = ANY(cd.dependencies);

  IF v_dependants IS NOT NULL AND array_length(v_dependants, 1) > 0 THEN
    RAISE EXCEPTION 'capability % is still required by %',
      OLD.capability_id, array_to_string(v_dependants, ', ')
      USING ERRCODE = '23514';
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
