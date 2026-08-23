-- CreateEnum
CREATE TYPE "ActivationStatus" AS ENUM ('Active', 'Suspended');

-- CreateEnum
CREATE TYPE "ConfigScope" AS ENUM ('Global', 'Tenant', 'Organization', 'User');

-- CreateTable
CREATE TABLE "capability_definition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "dependencies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "entity_types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capability_definition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_activation" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "capability_id" TEXT NOT NULL,
    "status" "ActivationStatus" NOT NULL DEFAULT 'Active',
    "activated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pinned_version" TEXT,

    CONSTRAINT "tenant_activation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_parameter" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "scope" "ConfigScope" NOT NULL,
    "scope_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "config_parameter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_activation_tenant_id_idx" ON "tenant_activation"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_activation_tenant_id_capability_id_key" ON "tenant_activation"("tenant_id", "capability_id");

-- CreateIndex
CREATE INDEX "config_parameter_tenant_id_key_idx" ON "config_parameter"("tenant_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "config_parameter_tenant_id_key_scope_scope_id_key" ON "config_parameter"("tenant_id", "key", "scope", "scope_id");

-- AddForeignKey
ALTER TABLE "tenant_activation" ADD CONSTRAINT "tenant_activation_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_activation" ADD CONSTRAINT "tenant_activation_capability_id_fkey" FOREIGN KEY ("capability_id") REFERENCES "capability_definition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_parameter" ADD CONSTRAINT "config_parameter_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Capability registry, activation and configuration
-- Authority: PLA-CAP-001→004, PLA-CFG-001, PLA-VER-002→003.
-- ---------------------------------------------------------------------------

ALTER TABLE "capability_definition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "capability_definition" FORCE ROW LEVEL SECURITY;
ALTER TABLE "tenant_activation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_activation" FORCE ROW LEVEL SECURITY;
ALTER TABLE "config_parameter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "config_parameter" FORCE ROW LEVEL SECURITY;

-- The registry is global platform metadata: readable inside a tenant context,
-- writable only by installation (the migration role).
CREATE POLICY "capability_definition_read" ON "capability_definition"
  FOR SELECT USING (verity.current_tenant_id() IS NOT NULL);

CREATE POLICY "tenant_activation_isolation" ON "tenant_activation"
  USING ("tenant_id" = verity.current_tenant_id())
  WITH CHECK ("tenant_id" = verity.current_tenant_id());

-- Global-scope configuration has no tenant and is readable by all; everything
-- narrower belongs to exactly one tenant. Writes are always tenant-scoped, so a
-- tenant can never author or overwrite a platform default.
CREATE POLICY "config_parameter_read" ON "config_parameter"
  FOR SELECT USING (
    ("scope" = 'Global' AND "tenant_id" IS NULL AND verity.current_tenant_id() IS NOT NULL)
    OR "tenant_id" = verity.current_tenant_id()
  );
CREATE POLICY "config_parameter_write" ON "config_parameter"
  FOR INSERT WITH CHECK ("tenant_id" = verity.current_tenant_id() AND "scope" <> 'Global');
CREATE POLICY "config_parameter_update" ON "config_parameter"
  FOR UPDATE USING ("tenant_id" = verity.current_tenant_id() AND "scope" <> 'Global')
  WITH CHECK ("tenant_id" = verity.current_tenant_id() AND "scope" <> 'Global');
CREATE POLICY "config_parameter_delete" ON "config_parameter"
  FOR DELETE USING ("tenant_id" = verity.current_tenant_id() AND "scope" <> 'Global');

-- ---------------------------------------------------------------------------
-- Dependency resolution on activation (PLA-CAP-003)
--
-- Enforced in the database rather than in the activation service, so a
-- capability cannot be switched on through any other path — a direct insert, a
-- fixture, an admin script — while its prerequisites are missing. A capability
-- running without its dependencies fails in ways that look like data corruption
-- rather than like a configuration error.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION verity.tenant_activation_requires_dependencies()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_missing TEXT[];
BEGIN
  IF NEW.status <> 'Active' THEN
    RETURN NEW;
  END IF;

  SELECT array_agg(dep) INTO v_missing
  FROM unnest((SELECT dependencies FROM capability_definition WHERE id = NEW.capability_id)) AS dep
  WHERE NOT EXISTS (
    SELECT 1 FROM tenant_activation ta
    WHERE ta.tenant_id = NEW.tenant_id AND ta.capability_id = dep AND ta.status = 'Active'
  );

  IF v_missing IS NOT NULL AND array_length(v_missing, 1) > 0 THEN
    RAISE EXCEPTION 'capability % cannot be activated: missing active dependencies %',
      NEW.capability_id, array_to_string(v_missing, ', ')
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "tenant_activation_requires_dependencies"
  BEFORE INSERT OR UPDATE ON "tenant_activation"
  FOR EACH ROW EXECUTE FUNCTION verity.tenant_activation_requires_dependencies();

-- Suspending a capability that others still depend on would leave those
-- dependants running against a missing prerequisite, so it is refused too.
CREATE OR REPLACE FUNCTION verity.tenant_activation_protect_dependants()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_dependants TEXT[];
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'Active' THEN
    RETURN NEW;
  END IF;

  SELECT array_agg(ta.capability_id) INTO v_dependants
  FROM tenant_activation ta
  JOIN capability_definition cd ON cd.id = ta.capability_id
  WHERE ta.tenant_id = OLD.tenant_id
    AND ta.status = 'Active'
    AND ta.capability_id <> OLD.capability_id
    AND OLD.capability_id = ANY(cd.dependencies);

  IF v_dependants IS NOT NULL AND array_length(v_dependants, 1) > 0 THEN
    RAISE EXCEPTION 'capability % is still required by %',
      OLD.capability_id, array_to_string(v_dependants, ', ')
      USING ERRCODE = '23514';
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER "tenant_activation_protect_dependants"
  BEFORE UPDATE OR DELETE ON "tenant_activation"
  FOR EACH ROW EXECUTE FUNCTION verity.tenant_activation_protect_dependants();
