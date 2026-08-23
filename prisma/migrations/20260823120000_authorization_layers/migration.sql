-- CreateTable
CREATE TABLE "field_permission" (
    "id" UUID NOT NULL,
    "entity_key" TEXT NOT NULL,
    "field_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "field_permission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "field_permission_entity_key_idx" ON "field_permission"("entity_key");

-- CreateIndex
CREATE UNIQUE INDEX "field_permission_entity_key_field_name_key" ON "field_permission"("entity_key", "field_name");

-- AddForeignKey
ALTER TABLE "field_permission" ADD CONSTRAINT "field_permission_entity_key_fkey" FOREIGN KEY ("entity_key") REFERENCES "entity_definition"("key") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Authorization layers 2 and 3
-- Authority: PLA-AUT-004 (row-level scoping), PLA-AUT-005 (field-level),
-- PLA-ORG-002 (downward visibility), PLA-ORG-003 (sibling isolation).
-- ---------------------------------------------------------------------------

ALTER TABLE "field_permission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "field_permission" FORCE ROW LEVEL SECURITY;

-- Global capability metadata, like entity_definition: readable in a tenant
-- context, writable only by capability installation.
CREATE POLICY "field_permission_read" ON "field_permission"
  FOR SELECT USING (verity.current_tenant_id() IS NOT NULL);

-- ---------------------------------------------------------------------------
-- Organization subtree (PLA-ORG-002)
--
-- A user mapped to a parent node inherits visibility over every descendant, so
-- scope resolution needs the subtree rooted at their organization. Computed in
-- the database because it is a recursive walk, and computing it in application
-- code would mean fetching the whole organization tree on every check.
--
-- SECURITY DEFINER with an explicit tenant check: the walk must see the full
-- subtree, but it must never cross a tenant boundary while doing so.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION verity.organization_subtree(p_root UUID)
RETURNS TABLE (organization_id UUID)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, verity, pg_temp
AS $$
DECLARE
  v_tenant UUID := verity.current_tenant_id();
BEGIN
  IF v_tenant IS NULL THEN
    RETURN;  -- no tenant context: no rows, fail closed
  END IF;

  RETURN QUERY
  WITH RECURSIVE subtree(id) AS (
    SELECT o.id FROM organization o
    WHERE o.id = p_root AND o.tenant_id = v_tenant
    UNION
    SELECT child.id
    FROM organization child
    JOIN subtree s ON child.parent_id = s.id
    WHERE child.tenant_id = v_tenant
  )
  SELECT id FROM subtree;
END;
$$;

COMMENT ON FUNCTION verity.organization_subtree IS
  'Organization ids visible from a root node: itself plus all descendants (PLA-ORG-002). Confined to the current tenant.';

-- Every organization in the current tenant, for Tenant-scoped grants.
CREATE OR REPLACE FUNCTION verity.tenant_organizations()
RETURNS TABLE (organization_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, verity, pg_temp
AS $$
  SELECT o.id FROM organization o
  WHERE verity.current_tenant_id() IS NOT NULL
    AND o.tenant_id = verity.current_tenant_id();
$$;
