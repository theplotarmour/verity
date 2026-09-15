-- ---------------------------------------------------------------------------
-- Colonel Kebabz Phase 2 (lean V1): Customer/360 (PRD §28-30)
-- ---------------------------------------------------------------------------
-- Hand-isolated from `prisma migrate diff`, same reasoning as the Phase 1
-- migrations: the live DB still carries unrelated pre-existing drift from
-- `20260904180000_trading_capability_extraction` that a full diff bundles
-- in. Untouched here, tracked separately in phase-plan.md.

CREATE TABLE "customer" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "birthday" DATE,
    "marketing_consent" BOOLEAN NOT NULL DEFAULT false,
    "preferred_location_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "customer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_tenant_id_phone_key" ON "customer"("tenant_id", "phone");

ALTER TABLE "customer" ADD CONSTRAINT "customer_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer" ADD CONSTRAINT "customer_tenant_id_preferred_location_id_fkey" FOREIGN KEY ("tenant_id", "preferred_location_id") REFERENCES "location"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- ---------------------------------------------------------------------------
-- CAPABILITY INSTALL: CRM (Colonel Kebabz Phase 2)
-- ---------------------------------------------------------------------------

ALTER TABLE "customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customer" FORCE ROW LEVEL SECURITY;
CREATE POLICY "customer_isolation" ON "customer"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

INSERT INTO "capability_definition" (id, name, version, dependencies, entity_types, updated_at)
VALUES (
  'verity.capability.crm', 'CRM', '1.0.0',
  ARRAY['verity.capability.dinein'],
  ARRAY['verity.crm.customer'],
  now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO "entity_definition" (key, capability, class, table_name, tenant_scoped)
VALUES ('verity.crm.customer', 'verity.capability.crm', 'Persistent', 'customer', true)
ON CONFLICT (key) DO NOTHING;
