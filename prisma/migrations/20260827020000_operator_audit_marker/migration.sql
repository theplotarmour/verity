-- ---------------------------------------------------------------------------
-- Platform audit: mark actions taken WITH operator authority, not people who
-- happen to hold it
--
-- ADR-013 answer 12 requires privileged actions to be distinguished in audit
-- "by the operator marker plus the platform-tenant membership on the audit row
-- — queryable, not merely visible."
--
-- The first implementation answered a different question. It reported
-- `is_operator` when the ACTOR held a platform-tenant membership anywhere, so
-- every historical action by a person who later became an operator was
-- retroactively relabelled as privileged. It over-reported rather than
-- under-reported, which is the safer direction, but it is not what the ADR says
-- and it makes the column useless for the question it exists to answer: "did we
-- do this to the client, or did the client do it?"
--
-- The precise rule, with no schema change: an action was taken with operator
-- authority when the actor's membership IN THAT CLIENT carries the operator
-- role. That is exactly how an operator acts inside a client — `operatorActorFor`
-- gives them that membership and that role, and nothing else does — so the
-- marker now follows the authority actually used rather than the authority
-- merely held.
--
-- RETURNS TABLE types cannot be altered in place, so the function is dropped
-- and recreated. The column set is unchanged; only the last expression differs.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS verity.operator_platform_audit(UUID, INT);

CREATE OR REPLACE FUNCTION verity.operator_platform_audit(p_auth_user_id UUID, p_limit INT DEFAULT 100)
RETURNS TABLE (
  occurred_at   TIMESTAMP(3),
  tenant_id     UUID,
  tenant_name   TEXT,
  entity_key    TEXT,
  entity_id     UUID,
  command_key   TEXT,
  field_changed TEXT,
  actor_user_id UUID,
  is_operator   BOOLEAN
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
    SELECT a.occurred_at, a.tenant_id, t.name, a.entity_key, a.entity_id, a.command_key,
           a.field_changed, a.actor_user_id,
           EXISTS (
             -- Operator authority USED here, in this client, at the time this
             -- membership stands: the operator role is created and assigned by
             -- the platform and by nothing else.
             SELECT 1
             FROM tenant_membership m
             JOIN role r ON r.id = m.role_id
             WHERE m.user_id = a.actor_user_id
               AND m.tenant_id = a.tenant_id
               AND r.name = 'Verity Operator'
           )
    FROM activity a
    JOIN tenant t ON t.id = a.tenant_id
    ORDER BY a.occurred_at DESC
    LIMIT least(greatest(coalesce(p_limit, 100), 1), 500);
END;
$$;

COMMENT ON FUNCTION verity.operator_platform_audit IS
  'Cross-tenant projection 3 of 3 (ADR-013). Audit metadata only — no payload bodies. is_operator means the action was taken with operator authority in that client, not merely by someone who holds it elsewhere (answer 12).';

GRANT EXECUTE ON FUNCTION verity.operator_platform_audit(UUID, INT) TO PUBLIC;
