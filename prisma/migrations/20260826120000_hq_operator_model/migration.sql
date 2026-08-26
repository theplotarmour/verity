-- ---------------------------------------------------------------------------
-- Global HQ operator model
--
-- Authority: ADR-013 (Option D, identity Shape 1). Cause, per PLATFORM-FREEZE:
-- D15 makes Global HQ mandatory before any client work, and HQ needs to answer
-- three questions that genuinely span tenants — which clients exist, what is
-- failing across them, and what privileged actions have been taken. Nothing in
-- the existing contracts can answer a cross-tenant question, because every
-- contract is correctly bounded by one tenant scope. That is the gap, and this
-- migration is the smallest thing that closes it.
--
-- WHAT THIS DELIBERATELY DOES NOT DO
--   * No role gains BYPASSRLS. The runtime role stays NOSUPERUSER NOBYPASSRLS.
--   * No RLS policy is weakened, dropped or widened.
--   * No cross-tenant WRITE path exists. Every mutation still happens inside
--     exactly one tenant scope, through runCommand, under the ordinary policies.
--   * resolve_permissions still filters Global-scope grants out. Operator
--     authority is an ordinary membership with ordinary permissions, not a
--     Global row, so the resolver is untouched.
--
-- The cross-tenant surface is exactly the three read-only projections below.
-- Each is SECURITY DEFINER with a pinned search_path, no dynamic SQL, a fixed
-- column set, and its own invocation log. Adding a fourth is a deliberate,
-- reviewable act — which is the property that keeps this bounded.
-- ---------------------------------------------------------------------------

-- 1. The platform tenant marker (D18) --------------------------------------
--
-- A tenant that is not a client. The distinction has to be a database fact
-- rather than a naming convention, because "is this a client?" is asked by the
-- client directory, and a convention cannot be relied on to answer it.

ALTER TABLE tenant ADD COLUMN IF NOT EXISTS is_platform BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN tenant.is_platform IS
  'True for the single Verity platform tenant whose members are HQ operators. Never true for a client (ADR-013, D18).';

-- At most one. Two platform tenants would make "am I an operator?" ambiguous,
-- and an ambiguous authority question is answered wrongly sooner or later.
CREATE UNIQUE INDEX IF NOT EXISTS tenant_single_platform
  ON tenant ((true)) WHERE is_platform;

-- 2. Operator authority ------------------------------------------------------
--
-- Keyed on the Supabase auth user id, exactly as memberships_for_auth_user is,
-- so it can only ever answer for the calling principal. Authority is a
-- membership in the platform tenant whose role resolves an ActionExecute grant
-- on the operator entity — the ordinary Verb + Entity + Scope model, with no
-- second authorization path beside it.

CREATE OR REPLACE FUNCTION verity.is_platform_operator(p_auth_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, verity, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "user" u
    JOIN tenant_membership m ON m.user_id = u.id
    JOIN tenant t            ON t.id = m.tenant_id AND t.is_platform
    WHERE u.auth_user_id = p_auth_user_id
      AND m.role_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM verity.resolve_permissions(m.role_id) rp
        WHERE rp.verb = 'ActionExecute'
          AND rp.entity = 'verity.platform.operator'
      )
  );
$$;

COMMENT ON FUNCTION verity.is_platform_operator IS
  'True when the authenticated principal holds an operator grant in the platform tenant. The gate for every projection below (ADR-013 answer 2).';

-- 3. Projection — client directory (need N1) ---------------------------------
--
-- Tenant metadata only: no client business row is reachable through this. A
-- non-operator receives zero rows rather than an error, because a distinguishable
-- error is itself a disclosure.

CREATE OR REPLACE FUNCTION verity.operator_client_directory(p_auth_user_id UUID)
RETURNS TABLE (
  tenant_id     UUID,
  name          TEXT,
  time_zone     TEXT,
  created_at    TIMESTAMPTZ,
  member_count  BIGINT,
  org_count     BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, verity, pg_temp
AS $$
BEGIN
  IF NOT verity.is_platform_operator(p_auth_user_id) THEN
    RETURN;
  END IF;

  RAISE LOG 'verity.operator_client_directory invoked by auth user %', p_auth_user_id;

  RETURN QUERY
    SELECT t.id, t.name, t.time_zone, t.created_at,
           (SELECT count(*) FROM tenant_membership m WHERE m.tenant_id = t.id),
           (SELECT count(*) FROM organization o WHERE o.tenant_id = t.id)
    FROM tenant t
    WHERE NOT t.is_platform
    ORDER BY t.name;
END;
$$;

COMMENT ON FUNCTION verity.operator_client_directory IS
  'Cross-tenant projection 1 of 3 (ADR-013). Client metadata and counts only — never client business rows. Returns nothing for a non-operator.';

-- 4. Projection — platform activity (need N6) --------------------------------
--
-- Counts, not contents. Enough to see that a client is in trouble; not enough
-- to read what happened to them.

CREATE OR REPLACE FUNCTION verity.operator_platform_activity(p_auth_user_id UUID)
RETURNS TABLE (
  tenant_id          UUID,
  name               TEXT,
  activity_30d       BIGINT,
  security_events_30d BIGINT,
  last_activity_at   TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, verity, pg_temp
AS $$
BEGIN
  IF NOT verity.is_platform_operator(p_auth_user_id) THEN
    RETURN;
  END IF;

  RAISE LOG 'verity.operator_platform_activity invoked by auth user %', p_auth_user_id;

  RETURN QUERY
    SELECT t.id, t.name,
           (SELECT count(*) FROM activity a
             WHERE a.tenant_id = t.id AND a.occurred_at > now() - interval '30 days'),
           (SELECT count(*) FROM security_audit_event s
             WHERE s.tenant_id = t.id AND s.occurred_at > now() - interval '30 days'),
           (SELECT max(a.occurred_at) FROM activity a WHERE a.tenant_id = t.id)
    FROM tenant t
    WHERE NOT t.is_platform
    ORDER BY t.name;
END;
$$;

COMMENT ON FUNCTION verity.operator_platform_activity IS
  'Cross-tenant projection 2 of 3 (ADR-013). Per-client counts for the operational view. No payloads, no business rows.';

-- 5. Projection — platform audit (need N7) -----------------------------------
--
-- Audit metadata across tenants, with no payload bodies. Which privileged
-- action happened, to which entity type, in which client, by whom — not what
-- the record contained.

CREATE OR REPLACE FUNCTION verity.operator_platform_audit(p_auth_user_id UUID, p_limit INT DEFAULT 100)
RETURNS TABLE (
  occurred_at  TIMESTAMPTZ,
  tenant_id    UUID,
  tenant_name  TEXT,
  entity_key   TEXT,
  entity_id    UUID,
  command_key  TEXT,
  field_changed TEXT,
  actor_user_id UUID,
  is_operator  BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, verity, pg_temp
AS $$
BEGIN
  IF NOT verity.is_platform_operator(p_auth_user_id) THEN
    RETURN;
  END IF;

  RAISE LOG 'verity.operator_platform_audit invoked by auth user %', p_auth_user_id;

  RETURN QUERY
    SELECT a.occurred_at, a.tenant_id, t.name, a.entity_key, a.entity_id, a.command_key, a.field_changed,
           a.actor_user_id,
           EXISTS (
             SELECT 1 FROM tenant_membership m
             JOIN tenant pt ON pt.id = m.tenant_id AND pt.is_platform
             WHERE m.user_id = a.actor_user_id
           )
    FROM activity a
    JOIN tenant t ON t.id = a.tenant_id
    ORDER BY a.occurred_at DESC
    LIMIT least(greatest(coalesce(p_limit, 100), 1), 500);
END;
$$;

COMMENT ON FUNCTION verity.operator_platform_audit IS
  'Cross-tenant projection 3 of 3 (ADR-013). Audit metadata only — no payload bodies. is_operator distinguishes privileged actions (answer 12).';

-- 6. Grants ------------------------------------------------------------------
-- The runtime role may CALL these; it still cannot read the underlying tables
-- across tenants, because its own policies are unchanged.

GRANT EXECUTE ON FUNCTION verity.is_platform_operator(UUID) TO PUBLIC;
GRANT EXECUTE ON FUNCTION verity.operator_client_directory(UUID) TO PUBLIC;
GRANT EXECUTE ON FUNCTION verity.operator_platform_activity(UUID) TO PUBLIC;
GRANT EXECUTE ON FUNCTION verity.operator_platform_audit(UUID, INT) TO PUBLIC;
