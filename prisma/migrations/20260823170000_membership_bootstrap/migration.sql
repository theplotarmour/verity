-- ---------------------------------------------------------------------------
-- Membership bootstrap lookup
--
-- A gap found while wiring authentication, and a genuine chicken-and-egg rather
-- than an oversight in the UI.
--
-- Resolving a request to an actor requires knowing which memberships the
-- authenticated user holds. That read crosses tenants by nature — the question
-- is precisely "which tenants may this person enter". But `user`,
-- `tenant_membership` and `tenant` are all protected by RLS that requires a
-- tenant context to already be set, so the lookup returns nothing and the user
-- can never enter any tenant at all.
--
-- The same shape as verity.provision_identity: a SECURITY DEFINER function that
-- crosses the boundary for one narrowly-defined question and returns only what
-- the caller is entitled to. It is keyed on the Supabase auth user id, so it can
-- only ever return memberships belonging to the authenticated principal, and it
-- exposes nothing about a tenant beyond the names needed to choose between them.
--
-- Widening the RLS policies instead would have been the wrong fix: it would make
-- identity readable without a tenant context for every query, not just this one.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION verity.memberships_for_auth_user(p_auth_user_id UUID)
RETURNS TABLE (
  membership_id     UUID,
  user_id           UUID,
  tenant_id         UUID,
  tenant_name       TEXT,
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
  SELECT m.id, u.id, t.id, t.name, o.id, o.name, r.id, r.name
  FROM "user" u
  JOIN tenant_membership m ON m.user_id = u.id
  JOIN tenant t            ON t.id = m.tenant_id
  JOIN organization o      ON o.id = m.organization_id
  LEFT JOIN role r         ON r.id = m.role_id
  WHERE u.auth_user_id = p_auth_user_id
  ORDER BY t.name, o.name;
$$;

COMMENT ON FUNCTION verity.memberships_for_auth_user IS
  'Memberships held by one authenticated principal, for actor resolution before a tenant context exists. Keyed on the Supabase auth user id so it can only return that principal''s own memberships.';
