-- ---------------------------------------------------------------------------
-- Scheduler tenant enumeration (ADR-016)
--
-- ADR-015 bound scheduled work to an authenticated route that takes one tenant
-- per call, and recorded that enumerating tenants would be a fourth cross-tenant
-- read needing its own decision. ADR-016 is that decision.
--
-- The forcing evidence is not a count of clients. A tenant id is runtime data —
-- tenants are created in the HQ console with generated UUIDs — while a cron
-- schedule is static configuration written at build time. A per-tenant schedule
-- is therefore not verbose, it is UNWRITABLE, and every new client would need a
-- redeploy before any of its deadlines fired.
--
-- WHY THIS IS NOT A FOURTH OPERATOR PROJECTION
-- ADR-013's three projections exist so a PERSON can see across clients, and each
-- is gated on that person holding operator authority. This is gated on a
-- deployment secret held by a machine, and it returns IDS ONLY — no names, no
-- counts, no tenant rows. The route re-enters each tenant's own scope through
-- `withTenant` to do the work, so nothing actually crosses the boundary. An id
-- is the minimum dispatch requires, and it is deliberately nothing a screen
-- would want.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION verity.scheduler_tenant_ids()
RETURNS TABLE (tenant_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
-- Pinned, as every SECURITY DEFINER function here is. Without it a caller who
-- can create a schema could shadow a name this body resolves and run their own
-- code with the definer's rights.
SET search_path = public, verity, pg_temp
AS $$
  -- Only tenants with something to run. A tenant that has activated nothing
  -- declares no scheduled work, so returning it would be a wasted round trip
  -- per cadence per tenant, forever.
  SELECT DISTINCT ta.tenant_id
    FROM tenant_activation ta
   WHERE ta.status = 'Active'
   ORDER BY 1;
$$;

COMMENT ON FUNCTION verity.scheduler_tenant_ids IS
  'Ids of tenants with at least one active capability, for scheduled-work dispatch only (ADR-016). Returns ids and nothing else; the caller re-enters each tenant scope to do the work. Gated by the scheduler secret at the route, not by operator authority.';

GRANT EXECUTE ON FUNCTION verity.scheduler_tenant_ids() TO PUBLIC;
