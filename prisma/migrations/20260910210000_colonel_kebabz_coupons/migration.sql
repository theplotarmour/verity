-- ---------------------------------------------------------------------------
-- Colonel Kebabz Phase 2 (lean V1): Coupons (PRD §32)
-- ---------------------------------------------------------------------------
-- Hand-isolated from `prisma migrate diff` — same reasoning as prior slices:
-- the live DB still carries unrelated pre-existing drift from
-- `20260904180000_trading_capability_extraction`, untouched here.

CREATE TABLE "coupon" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "discount_type" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "min_order_value_minor" INTEGER,
    "usage_limit" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "coupon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "coupon_tenant_id_code_key" ON "coupon"("tenant_id", "code");

ALTER TABLE "coupon" ADD CONSTRAINT "coupon_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "coupon" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "coupon" FORCE ROW LEVEL SECURITY;
CREATE POLICY "coupon_isolation" ON "coupon"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

-- ---------------------------------------------------------------------------
-- CAPABILITY INSTALL: Coupon (Colonel Kebabz Phase 2)
-- ---------------------------------------------------------------------------

INSERT INTO "capability_definition" (id, name, version, dependencies, entity_types, updated_at)
VALUES (
  'verity.capability.coupon', 'Coupon', '1.0.0',
  ARRAY['verity.capability.dinein'],
  ARRAY['verity.coupon.coupon'],
  now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO "entity_definition" (key, capability, class, table_name, tenant_scoped)
VALUES ('verity.coupon.coupon', 'verity.capability.coupon', 'Persistent', 'coupon', true)
ON CONFLICT (key) DO NOTHING;
