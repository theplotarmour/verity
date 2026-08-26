-- ---------------------------------------------------------------------------
-- Operator projections: correct the timestamp types
--
-- The projections declared TIMESTAMPTZ while every timestamp column in this
-- schema is timestamp(3) WITHOUT time zone — Prisma maps DateTime that way,
-- and instants are normalised to UTC in application code (temporal.ts) rather
-- than carried as offsets. PostgreSQL checks a set-returning function's
-- declared result type against the actual row at RUNTIME, not at CREATE, so
-- the mismatch compiled cleanly and failed on the first call:
--
--   42804: structure of query does not match function result type
--
-- Found by loading /hq, which is the only reason to say it out loud: nothing
-- in typecheck, migration or unit tests would have caught it, because none of
-- them executes the function. RETURNS TABLE types cannot be altered in place,
-- so each function is dropped and recreated with identical bodies.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS verity.operator_client_directory(UUID);
DROP FUNCTION IF EXISTS verity.operator_platform_activity(UUID);
DROP FUNCTION IF EXISTS verity.operator_platform_audit(UUID, INT);
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
  created_at    TIMESTAMP(3),
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
  last_activity_at   TIMESTAMP(3)
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
  occurred_at  TIMESTAMP(3),
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
