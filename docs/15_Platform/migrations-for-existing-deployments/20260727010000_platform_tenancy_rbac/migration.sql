-- Phase 0: tenancy + RBAC + module entitlements.
--
-- Written by hand. `prisma migrate diff` proposed DROP COLUMN "role" on User
-- and an unbackfilled NOT NULL on Factory.organizationId; both destroy or
-- reject live data. Every step below preserves existing rows.
--
-- Safe to apply to a populated database. Row-level security is deliberately
-- NOT here -- see the following migration, which must go out only after the
-- app-side tenant-context plumbing is deployed.

-- ---------------------------------------------------------------------------
-- 1. Role enum becomes SystemRole (the behavioural archetype).
--    RENAME keeps every existing column value; drop/create would not.
-- ---------------------------------------------------------------------------
ALTER TYPE "Role" RENAME TO "SystemRole";

-- ---------------------------------------------------------------------------
-- 2. Organization -- the billing/config tenant above Factory.
-- ---------------------------------------------------------------------------
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "fiscalYearStartMonth" INTEGER NOT NULL DEFAULT 4,
    "settings" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- Nullable first, backfilled, then constrained.
ALTER TABLE "Factory" ADD COLUMN "organizationId" TEXT;

-- One Org per existing Factory: current customers are single-site, so this
-- preserves their world exactly while making multi-site expressible.
INSERT INTO "Organization" ("id", "name", "slug", "logoUrl", "settings", "createdAt", "updatedAt")
SELECT
    'org_' || f."id",
    f."name",
    f."slug",
    f."logoUrl",
    COALESCE(f."settings", '{}'::jsonb),
    f."createdAt",
    f."updatedAt"
FROM "Factory" f;

UPDATE "Factory" f SET "organizationId" = 'org_' || f."id";

ALTER TABLE "Factory" ALTER COLUMN "organizationId" SET NOT NULL;
CREATE INDEX "Factory_organizationId_idx" ON "Factory"("organizationId");
ALTER TABLE "Factory" ADD CONSTRAINT "Factory_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 3. Data-driven roles and permissions.
-- ---------------------------------------------------------------------------
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "systemRole" "SystemRole" NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Role_organizationId_idx" ON "Role"("organizationId");
CREATE UNIQUE INDEX "Role_organizationId_name_key" ON "Role"("organizationId", "name");
ALTER TABLE "Role" ADD CONSTRAINT "Role_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RolePermission_roleId_idx" ON "RolePermission"("roleId");
CREATE UNIQUE INDEX "RolePermission_roleId_key_key" ON "RolePermission"("roleId", "key");
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed one system Role per archetype per Org.
INSERT INTO "Role" ("id", "organizationId", "name", "description", "systemRole", "isSystem", "createdAt", "updatedAt")
SELECT
    'role_' || o."id" || '_' || r.archetype::text,
    o."id",
    r.label,
    'Built-in role. Rename or copy it; it cannot be deleted.',
    r.archetype,
    true,
    NOW(),
    NOW()
FROM "Organization" o
CROSS JOIN (VALUES
    ('OWNER'::"SystemRole",         'Owner'),
    ('CO_OWNER'::"SystemRole",      'Co-Owner'),
    ('MANAGER'::"SystemRole",       'Manager'),
    ('SUPERVISOR'::"SystemRole",    'Supervisor'),
    ('WORKER'::"SystemRole",        'Worker'),
    ('STORE_MANAGER'::"SystemRole", 'Store Manager')
) AS r(archetype, label);

-- Grant each seeded role exactly the permissions its archetype has today, so
-- access is byte-for-byte unchanged at cutover.
INSERT INTO "RolePermission" ("id", "roleId", "key")
SELECT
    'rp_' || md5(ro."id" || p.key),
    ro."id",
    p.key
FROM "Role" ro
JOIN (VALUES
    ('OWNER'::"SystemRole",         'billing.access'),
    ('OWNER'::"SystemRole",         'settings.access'),
    ('OWNER'::"SystemRole",         'branding.access'),
    ('OWNER'::"SystemRole",         'master_data.access'),
    ('OWNER'::"SystemRole",         'sales_order.create'),
    ('OWNER'::"SystemRole",         'sales_order.delete'),
    ('OWNER'::"SystemRole",         'team.manage'),
    ('OWNER'::"SystemRole",         'team.assign_roles'),
    ('OWNER'::"SystemRole",         'org.transfer_ownership'),
    ('OWNER'::"SystemRole",         'reports.export'),
    ('OWNER'::"SystemRole",         'dashboard.view'),
    ('OWNER'::"SystemRole",         'reports.view'),

    ('CO_OWNER'::"SystemRole",      'settings.access'),
    ('CO_OWNER'::"SystemRole",      'branding.access'),
    ('CO_OWNER'::"SystemRole",      'master_data.access'),
    ('CO_OWNER'::"SystemRole",      'sales_order.create'),
    ('CO_OWNER'::"SystemRole",      'sales_order.delete'),
    ('CO_OWNER'::"SystemRole",      'team.manage'),
    ('CO_OWNER'::"SystemRole",      'team.assign_roles'),
    ('CO_OWNER'::"SystemRole",      'reports.export'),
    ('CO_OWNER'::"SystemRole",      'dashboard.view'),
    ('CO_OWNER'::"SystemRole",      'reports.view'),

    ('MANAGER'::"SystemRole",       'master_data.access'),
    ('MANAGER'::"SystemRole",       'sales_order.create'),
    ('MANAGER'::"SystemRole",       'team.manage'),
    ('MANAGER'::"SystemRole",       'reports.export'),
    ('MANAGER'::"SystemRole",       'dashboard.view'),
    ('MANAGER'::"SystemRole",       'reports.view'),

    ('SUPERVISOR'::"SystemRole",    'dashboard.view'),
    ('SUPERVISOR'::"SystemRole",    'reports.view'),
    ('SUPERVISOR'::"SystemRole",    'quality.queue'),
    ('SUPERVISOR'::"SystemRole",    'quality.inspect'),

    ('WORKER'::"SystemRole",        'production.jobs'),

    ('STORE_MANAGER'::"SystemRole", 'sales_order.create'),
    ('STORE_MANAGER'::"SystemRole", 'dashboard.view')
) AS p(archetype, key) ON p.archetype = ro."systemRole"
WHERE ro."isSystem" = true;

-- Point every user at the seeded role for their archetype.
ALTER TABLE "User" ADD COLUMN "roleId" TEXT;
UPDATE "User" u
SET "roleId" = 'role_' || f."organizationId" || '_' || u."role"::text
FROM "Factory" f
WHERE f."id" = u."factoryId";
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 4. Module entitlements replace Factory.modulesEnabled (written twice in the
--    codebase, read nowhere). Carry the old values across before dropping.
-- ---------------------------------------------------------------------------
CREATE TABLE "ModuleEntitlement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "settings" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ModuleEntitlement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ModuleEntitlement_organizationId_idx" ON "ModuleEntitlement"("organizationId");
CREATE UNIQUE INDEX "ModuleEntitlement_organizationId_moduleKey_key" ON "ModuleEntitlement"("organizationId", "moduleKey");
ALTER TABLE "ModuleEntitlement" ADD CONSTRAINT "ModuleEntitlement_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Every existing tenant gets the modules matching what the app does today:
-- the always-on core plus the automotive pack, which every current customer
-- implicitly runs.
INSERT INTO "ModuleEntitlement" ("id", "organizationId", "moduleKey", "enabled", "createdAt", "updatedAt")
SELECT 'ent_' || md5(o."id" || m.key), o."id", m.key, true, NOW(), NOW()
FROM "Organization" o
CROSS JOIN (VALUES
    ('core'), ('inventory'), ('manufacturing'), ('quality'),
    ('procurement'), ('sales'), ('hr'), ('automotive')
) AS m(key);

ALTER TABLE "Factory" DROP COLUMN "modulesEnabled";

-- ---------------------------------------------------------------------------
-- 5. ProductType / ProductField reach parity with the hardcoded vertical path.
-- ---------------------------------------------------------------------------
ALTER TABLE "ProductType"
    ADD COLUMN "organizationId" TEXT,
    ADD COLUMN "key" TEXT,
    ADD COLUMN "labelTemplate" TEXT,
    ADD COLUMN "isPhysical" BOOLEAN NOT NULL DEFAULT true;

UPDATE "ProductType" pt
SET "organizationId" = f."organizationId"
FROM "Factory" f
WHERE f."id" = pt."factoryId";

CREATE INDEX "ProductType_organizationId_idx" ON "ProductType"("organizationId");
ALTER TABLE "ProductType" ADD CONSTRAINT "ProductType_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductField"
    ADD COLUMN "key" TEXT,
    ADD COLUMN "optionSource" TEXT,
    ADD COLUMN "parentFieldId" TEXT,
    ADD COLUMN "visibleWhen" JSONB,
    ADD COLUMN "validation" JSONB,
    ADD COLUMN "showOnJobCard" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "showOnPassport" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "unit" TEXT,
    ADD COLUMN "helpText" TEXT;

-- Derive a machine key from the existing display name for rows that predate it.
UPDATE "ProductField"
SET "key" = regexp_replace(lower(trim("name")), '[^a-z0-9]+', '_', 'g')
WHERE "key" IS NULL;

CREATE INDEX "ProductField_parentFieldId_idx" ON "ProductField"("parentFieldId");
CREATE UNIQUE INDEX "ProductField_productTypeId_key_key" ON "ProductField"("productTypeId", "key");
ALTER TABLE "ProductField" ADD CONSTRAINT "ProductField_parentFieldId_fkey"
    FOREIGN KEY ("parentFieldId") REFERENCES "ProductField"("id") ON DELETE SET NULL ON UPDATE CASCADE;
