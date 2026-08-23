-- CreateEnum
CREATE TYPE "PartyState" AS ENUM ('Invited', 'Active', 'Suspended', 'Archived');

-- CreateTable
CREATE TABLE "party" (
    "id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "given_name" TEXT,
    "family_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "state" "PartyState" NOT NULL DEFAULT 'Invited',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" UUID NOT NULL,
    "auth_user_id" UUID NOT NULL,
    "party_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_membership" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "tenant_membership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "party_email_idx" ON "party"("email");

-- CreateIndex
CREATE INDEX "party_phone_idx" ON "party"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "user_auth_user_id_key" ON "user"("auth_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_party_id_key" ON "user"("party_id");

-- CreateIndex
CREATE INDEX "tenant_membership_tenant_id_idx" ON "tenant_membership"("tenant_id");

-- CreateIndex
CREATE INDEX "tenant_membership_user_id_idx" ON "tenant_membership"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_membership_user_id_organization_id_key" ON "tenant_membership"("user_id", "organization_id");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_membership" ADD CONSTRAINT "tenant_membership_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_membership" ADD CONSTRAINT "tenant_membership_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_membership" ADD CONSTRAINT "tenant_membership_tenant_id_organization_id_fkey" FOREIGN KEY ("tenant_id", "organization_id") REFERENCES "organization"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;


-- ---------------------------------------------------------------------------
-- Isolation for identity (INV-001 + INV-003)
--
-- `tenant_membership` is tenant-scoped and uses the same policy shape as
-- `tenant` and `organization`.
--
-- `party` and `user` are GLOBAL by constitutional requirement: Bible V2
-- Primitive 2 §2 scopes Party "globally to the Platform database, mapped to
-- Organizations via TenantMembership records", and INV-003 requires exactly one
-- Party per person even across tenants (PLA-IDE-004's subcontractor). They
-- therefore have no tenant_id to filter on, yet INV-001 still forbids one tenant
-- reading another's people.
--
-- Visibility is resolved by REACHABILITY instead: a tenant may read an identity
-- only when that identity holds a membership in it. The predicate is wrapped in
-- SECURITY DEFINER helpers so the nested lookup is not itself re-filtered by the
-- policies being evaluated. Each helper answers only a yes/no question about the
-- CURRENT tenant and leaks no rows.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION verity.user_visible(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, verity, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenant_membership m
    WHERE m.user_id = p_user_id
      AND m.tenant_id = verity.current_tenant_id()
  );
$$;

CREATE OR REPLACE FUNCTION verity.party_visible(p_party_id UUID)
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
    WHERE u.party_id = p_party_id
      AND m.tenant_id = verity.current_tenant_id()
  );
$$;

ALTER TABLE "tenant_membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_membership" FORCE ROW LEVEL SECURITY;
ALTER TABLE "party" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "party" FORCE ROW LEVEL SECURITY;
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_membership_isolation" ON "tenant_membership"
  USING ("tenant_id" = verity.current_tenant_id())
  WITH CHECK ("tenant_id" = verity.current_tenant_id());

-- Reads and mutations of an existing identity require reachability.
CREATE POLICY "user_select" ON "user" FOR SELECT USING (verity.user_visible("id"));
CREATE POLICY "user_update" ON "user" FOR UPDATE
  USING (verity.user_visible("id")) WITH CHECK (verity.user_visible("id"));
CREATE POLICY "user_delete" ON "user" FOR DELETE USING (verity.user_visible("id"));

CREATE POLICY "party_select" ON "party" FOR SELECT USING (verity.party_visible("id"));
CREATE POLICY "party_update" ON "party" FOR UPDATE
  USING (verity.party_visible("id")) WITH CHECK (verity.party_visible("id"));
CREATE POLICY "party_delete" ON "party" FOR DELETE USING (verity.party_visible("id"));

-- Provisioning: a new identity has no membership yet, so a reachability check on
-- INSERT could never succeed. Creation requires only that a tenant context is
-- active, which still fails closed for an unscoped connection.
--
-- OPEN — see the escalation note in the commit and CLAUDE.md: this permits any
-- tenant to create identities, and because reachability hides existing rows, a
-- tenant cannot see that a Party for the same human already exists. That makes
-- duplicate Party rows possible and puts INV-003 at risk. The de-duplication and
-- invitation path needs a platform decision (ADR) before identity provisioning
-- is exposed through an API; it is deliberately not invented here.
CREATE POLICY "user_insert" ON "user" FOR INSERT
  WITH CHECK (verity.current_tenant_id() IS NOT NULL);
CREATE POLICY "party_insert" ON "party" FOR INSERT
  WITH CHECK (verity.current_tenant_id() IS NOT NULL);
