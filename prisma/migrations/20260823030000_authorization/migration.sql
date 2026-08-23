-- CreateEnum
CREATE TYPE "PermissionVerb" AS ENUM ('Read', 'Create', 'Edit', 'Delete', 'ActionExecute');

-- CreateEnum
CREATE TYPE "PermissionScope" AS ENUM ('Global', 'Tenant', 'Organization', 'Location');

-- AlterTable
ALTER TABLE "tenant_membership" ADD COLUMN     "role_id" UUID;

-- CreateTable
CREATE TABLE "role" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_composition" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "parent_role_id" UUID NOT NULL,
    "child_role_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_composition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "verb" "PermissionVerb" NOT NULL,
    "entity" TEXT NOT NULL,
    "scope" "PermissionScope" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "role_tenant_id_idx" ON "role"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_tenant_id_name_key" ON "role"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "role_tenant_id_id_key" ON "role"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "role_composition_tenant_id_idx" ON "role_composition"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_composition_parent_role_id_child_role_id_key" ON "role_composition"("parent_role_id", "child_role_id");

-- CreateIndex
CREATE INDEX "permission_tenant_id_idx" ON "permission"("tenant_id");

-- CreateIndex
CREATE INDEX "permission_role_id_idx" ON "permission"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "permission_role_id_verb_entity_scope_key" ON "permission"("role_id", "verb", "entity", "scope");

-- AddForeignKey
ALTER TABLE "tenant_membership" ADD CONSTRAINT "tenant_membership_tenant_id_role_id_fkey" FOREIGN KEY ("tenant_id", "role_id") REFERENCES "role"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "role" ADD CONSTRAINT "role_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_composition" ADD CONSTRAINT "role_composition_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_composition" ADD CONSTRAINT "role_composition_tenant_id_parent_role_id_fkey" FOREIGN KEY ("tenant_id", "parent_role_id") REFERENCES "role"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "role_composition" ADD CONSTRAINT "role_composition_tenant_id_child_role_id_fkey" FOREIGN KEY ("tenant_id", "child_role_id") REFERENCES "role"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "permission" ADD CONSTRAINT "permission_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission" ADD CONSTRAINT "permission_tenant_id_role_id_fkey" FOREIGN KEY ("tenant_id", "role_id") REFERENCES "role"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;


-- ---------------------------------------------------------------------------
-- Authorization: isolation, cycle prevention, and permission flattening
--
-- Authority: Spec PLA-AUT-001→005, MET-ACT-002 (commands abort with E_FORBIDDEN
-- when unauthorized), Bible Synthesis ADOPTED (Keycloak composite roles),
-- Bible V2 Primitive 2 §13 (access is defined at the membership level).
--
-- Role, RoleComposition and Permission are ordinary tenant-scoped tables, so
-- they take the same RLS shape as tenant/organization/tenant_membership.
-- ---------------------------------------------------------------------------

ALTER TABLE "role" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "role" FORCE ROW LEVEL SECURITY;
ALTER TABLE "role_composition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "role_composition" FORCE ROW LEVEL SECURITY;
ALTER TABLE "permission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "permission" FORCE ROW LEVEL SECURITY;

CREATE POLICY "role_isolation" ON "role"
  USING ("tenant_id" = verity.current_tenant_id())
  WITH CHECK ("tenant_id" = verity.current_tenant_id());

CREATE POLICY "role_composition_isolation" ON "role_composition"
  USING ("tenant_id" = verity.current_tenant_id())
  WITH CHECK ("tenant_id" = verity.current_tenant_id());

CREATE POLICY "permission_isolation" ON "permission"
  USING ("tenant_id" = verity.current_tenant_id())
  WITH CHECK ("tenant_id" = verity.current_tenant_id());

-- ---------------------------------------------------------------------------
-- Cycle prevention (implementation/03-platform-foundation/authorization.md:
-- "A mechanism must prevent cyclical role inheritance on write.")
--
-- Enforced by the database rather than by application code: a cycle inserted by
-- any path would make permission resolution non-terminating, and resolution runs
-- on every authorization check.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION verity.role_composition_no_cycle()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.parent_role_id = NEW.child_role_id THEN
    RAISE EXCEPTION 'role_composition: a role cannot inherit from itself (%)', NEW.parent_role_id
      USING ERRCODE = '23514';
  END IF;

  -- Walk downward from the proposed child. If the proposed parent is reachable,
  -- adding this edge would close a loop.
  IF EXISTS (
    WITH RECURSIVE descendants(role_id) AS (
      SELECT NEW.child_role_id
      UNION
      SELECT rc.child_role_id
      FROM role_composition rc
      JOIN descendants d ON rc.parent_role_id = d.role_id
    )
    SELECT 1 FROM descendants WHERE role_id = NEW.parent_role_id
  ) THEN
    RAISE EXCEPTION 'role_composition: % -> % would create an inheritance cycle',
      NEW.parent_role_id, NEW.child_role_id
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "role_composition_no_cycle"
  BEFORE INSERT OR UPDATE ON "role_composition"
  FOR EACH ROW EXECUTE FUNCTION verity.role_composition_no_cycle();

-- ---------------------------------------------------------------------------
-- Permission flattening (Spec PLA-AUT-001: "A parent role automatically inherits
-- all permissions associated with its child roles.")
--
-- Returns the flat set of grants for a role, including everything inherited
-- transitively through composition. UNION (not UNION ALL) terminates the walk on
-- a diamond, and the trigger above guarantees the graph is acyclic.
--
-- `Global` grants are excluded. The scope exists in the specification, but
-- honouring it would require crossing the tenant boundary that RLS enforces for
-- INV-001, and that decision has not been made. Excluding it here means the
-- engine cannot silently start granting cross-tenant access if such a row is
-- ever written.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION verity.resolve_permissions(p_role_id UUID)
RETURNS TABLE (verb "PermissionVerb", entity TEXT, scope "PermissionScope")
LANGUAGE sql
STABLE
AS $$
  WITH RECURSIVE role_closure(role_id) AS (
    SELECT p_role_id
    UNION
    SELECT rc.child_role_id
    FROM role_composition rc
    JOIN role_closure c ON rc.parent_role_id = c.role_id
  )
  SELECT DISTINCT p.verb, p.entity, p.scope
  FROM permission p
  JOIN role_closure c ON c.role_id = p.role_id
  WHERE p.scope <> 'Global';
$$;

COMMENT ON FUNCTION verity.resolve_permissions IS
  'Flat permission set for a role, including permissions inherited from child roles. Global-scope grants are deliberately excluded pending a platform decision on cross-tenant access.';
