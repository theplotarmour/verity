-- Order drafts, and a bomMode a category may inherit rather than restate.
--
-- Written defensively. schema.prisma is ahead of this migration history (see
-- README), so "BomMode" and ItemGroup.bomMode may already exist on a database
-- built by `db push` and may be absent on one built only from these files.
-- Every statement here is therefore conditional: the migration must land the
-- same way on both, or the two diverge further rather than converge.

-- 1. The enum, if this database never got it.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BomMode') THEN
    CREATE TYPE "BomMode" AS ENUM ('OFF', 'RECIPE', 'INGREDIENTS');
  END IF;
END
$$;

-- 2. The column, nullable either way.
--
-- Null now means "inherit from the nearest ancestor that states a mode", so the
-- existing NOT NULL and DEFAULT 'OFF' must both go: a default would keep
-- writing a stated OFF onto categories nobody configured, which is exactly the
-- silent choice inheritance removes.
--
-- Rows already holding OFF are left as they are. An explicit OFF set by an
-- owner and an unset OFF are indistinguishable in the old column, and turning
-- every OFF into an inherit would change behaviour under categories whose
-- parent says RECIPE — silently giving items a BOM editor their owner had
-- turned off. Leaving them stated is the reversible direction: an owner can
-- clear one to inherit, but nobody can recover an intent this migration erased.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ItemGroup' AND column_name = 'bomMode'
  ) THEN
    ALTER TABLE "ItemGroup" ADD COLUMN "bomMode" "BomMode";
  ELSE
    ALTER TABLE "ItemGroup" ALTER COLUMN "bomMode" DROP NOT NULL;
    ALTER TABLE "ItemGroup" ALTER COLUMN "bomMode" DROP DEFAULT;
  END IF;
END
$$;

-- 3. Order drafts.
CREATE TABLE IF NOT EXISTS "OrderDraft" (
  "id"        TEXT NOT NULL,
  "factoryId" TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "kind"      TEXT NOT NULL,
  "payload"   JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OrderDraft_pkey" PRIMARY KEY ("id")
);

-- One draft per user per form: a save is an upsert on this pair, so a second
-- tab resumes the same draft instead of racing a rival copy.
CREATE UNIQUE INDEX IF NOT EXISTS "OrderDraft_userId_kind_key"
  ON "OrderDraft"("userId", "kind");

CREATE INDEX IF NOT EXISTS "OrderDraft_factoryId_updatedAt_idx"
  ON "OrderDraft"("factoryId", "updatedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OrderDraft_userId_fkey'
  ) THEN
    ALTER TABLE "OrderDraft"
      ADD CONSTRAINT "OrderDraft_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- 4. Tenant isolation for the new table.
--
-- Taken verbatim from `node scripts/gen_rls_migration.mjs`, which derives it
-- from the schema. Without this OrderDraft would be the single tenant-scoped
-- table with no policy — and a table that is missing from an isolation sweep
-- is worse than one that was never covered, because the sweep reads as complete.
--
-- Inert until the app connects as a non-owner role, same as the original.
ALTER TABLE "OrderDraft" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "OrderDraft_tenant_isolation" ON "OrderDraft";
CREATE POLICY "OrderDraft_tenant_isolation" ON "OrderDraft"
  USING ("factoryId" = verity.current_factory_id()) WITH CHECK ("factoryId" = verity.current_factory_id());
