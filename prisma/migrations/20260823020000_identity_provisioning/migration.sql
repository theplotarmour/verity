-- ---------------------------------------------------------------------------
-- Identity provisioning
--
-- The reachability policies added in 20260823010000 make a bare INSERT into
-- `party` / `user` unusable in practice: PostgreSQL applies SELECT policies to
-- an INSERT ... RETURNING clause (which every Prisma `create()` emits), and a
-- just-created identity has no membership yet, so it is not yet reachable and
-- the statement is rejected.
--
-- Widening the SELECT policy would be the wrong fix — an identity with no
-- membership must not be visible to anyone, or one tenant could enumerate
-- another's orphaned people. Instead, provisioning becomes what it actually is:
-- a single atomic platform operation that creates the Party, the User and the
-- first TenantMembership together. An identity with no membership is not a
-- meaningful state (Bible V2 Primitive 2 §2 — Party is "mapped to Organizations
-- via TenantMembership records"; §6 names Tenant Administrators and Platform
-- Support as the actors).
--
-- Direct INSERT is therefore withdrawn: the policies below are dropped and not
-- replaced, so `party` and `user` rows can only come into existence through this
-- function, which validates the tenant context itself.
--
-- STILL OPEN (needs an ADR before an identity API is exposed): de-duplication.
-- Reachability means a tenant cannot see that a Party already exists for the
-- same human, so two tenants can each provision one and INV-003 ("exactly one
-- Party per person across the platform") is at risk. Matching on verified email
-- or phone (Bible V2 Primitive 2 §8) is the likely route, but who may match
-- against identities they cannot see is a product decision, not an
-- implementation one. Not invented here.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "party_insert" ON "party";
DROP POLICY IF EXISTS "user_insert" ON "user";

CREATE OR REPLACE FUNCTION verity.provision_identity(
  p_organization_id UUID,
  p_auth_user_id    UUID,
  p_display_name    TEXT,
  p_given_name      TEXT DEFAULT NULL,
  p_family_name     TEXT DEFAULT NULL,
  p_email           TEXT DEFAULT NULL,
  p_phone           TEXT DEFAULT NULL
)
RETURNS TABLE (party_id UUID, user_id UUID, membership_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, verity, pg_temp
AS $$
DECLARE
  v_tenant_id UUID := verity.current_tenant_id();
  v_party_id  UUID;
  v_user_id   UUID;
  v_member_id UUID;
BEGIN
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'provision_identity: no tenant context set'
      USING ERRCODE = '42501';
  END IF;

  -- SECURITY DEFINER bypasses RLS, so the tenant boundary is re-checked here by
  -- hand. Without this, any caller could attach an identity to another tenant's
  -- organization.
  IF NOT EXISTS (
    SELECT 1 FROM organization o
    WHERE o.id = p_organization_id AND o.tenant_id = v_tenant_id
  ) THEN
    RAISE EXCEPTION 'provision_identity: organization % does not belong to the current tenant', p_organization_id
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO party (id, display_name, given_name, family_name, email, phone, updated_at)
  VALUES (gen_random_uuid(), p_display_name, p_given_name, p_family_name, p_email, p_phone, now())
  RETURNING id INTO v_party_id;

  INSERT INTO "user" (id, auth_user_id, party_id, updated_at)
  VALUES (gen_random_uuid(), p_auth_user_id, v_party_id, now())
  RETURNING id INTO v_user_id;

  INSERT INTO tenant_membership (id, tenant_id, organization_id, user_id, updated_at)
  VALUES (gen_random_uuid(), v_tenant_id, p_organization_id, v_user_id, now())
  RETURNING id INTO v_member_id;

  RETURN QUERY SELECT v_party_id, v_user_id, v_member_id;
END;
$$;

COMMENT ON FUNCTION verity.provision_identity IS
  'Atomically creates Party + User + first TenantMembership for the current tenant. The only supported way to create an identity; direct INSERT into party/user is denied by RLS.';
