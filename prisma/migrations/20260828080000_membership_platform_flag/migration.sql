-- ---------------------------------------------------------------------------
-- Membership lookup gains `is_platform`
--
-- Issue: a Platform Operator signing in lands on the client workspace `/`
-- instead of `/hq`. `resolveActor()` falls back to `memberships[0]`, ordered
-- alphabetically by tenant name (`ORDER BY t.name, o.name` below) — an
-- accident of naming, not a decision about who the operator is.
--
-- `verity.memberships_for_auth_user` is the one pre-tenant-context read
-- available at sign-in (see 20260823170000_membership_bootstrap). It did not
-- expose which membership is the platform tenant, so the sign-in handler had
-- no way to route an operator there without a second cross-tenant query.
-- Adding the column is additive and narrows nothing already exposed: the
-- caller could already see `tenant_name` for every membership it holds.
-- ---------------------------------------------------------------------------

-- OUT parameter row type changed (new is_platform column) — Postgres refuses
-- CREATE OR REPLACE across a return-type change, so drop first.
DROP FUNCTION IF EXISTS verity.memberships_for_auth_user(UUID);

CREATE FUNCTION verity.memberships_for_auth_user(p_auth_user_id UUID)
RETURNS TABLE (
  membership_id     UUID,
  user_id           UUID,
  tenant_id         UUID,
  tenant_name       TEXT,
  is_platform       BOOLEAN,
  organization_id   UUID,
  organization_name TEXT,
  role_id           UUID,
  role_name         TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, verity, pg_temp
AS $$
  SELECT m.id, u.id, t.id, t.name, t.is_platform, o.id, o.name, r.id, r.name
  FROM "user" u
  JOIN tenant_membership m ON m.user_id = u.id
  JOIN tenant t            ON t.id = m.tenant_id
  JOIN organization o      ON o.id = m.organization_id
  LEFT JOIN role r         ON r.id = m.role_id
  WHERE u.auth_user_id = p_auth_user_id
  ORDER BY t.name, o.name;
$$;

COMMENT ON FUNCTION verity.memberships_for_auth_user IS
  'Memberships held by one authenticated principal, for actor resolution before a tenant context exists. Keyed on the Supabase auth user id so it can only return that principal''s own memberships. Includes is_platform so sign-in can route an operator straight to /hq.';
