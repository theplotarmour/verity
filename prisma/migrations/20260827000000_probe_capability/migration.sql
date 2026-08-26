-- ---------------------------------------------------------------------------
-- THROWAWAY: capability composition probe (work plan Phase 4, gate 9)
--
-- This is not a product capability and must not survive. It exists to answer
-- one question with evidence rather than argument: can a capability contribute
-- an entity, commands, queries, states, permissions, configuration, events,
-- audit, SLA behaviour, scheduled work, notifications, custom fields and UI
-- WITHOUT modifying platform internals?
--
-- It owns its table through raw SQL rather than a Prisma model, deliberately.
-- The gate's proof is `git diff --stat src/server/platform/ prisma/schema.prisma`
-- showing no change, and a capability that had to edit the shared schema file to
-- exist would weaken that proof to "no change except the change". Owning
-- storage without touching the shared file is also just true of the
-- architecture, and worth demonstrating once.
--
-- Removal: prisma/migrations/<later>_probe_capability_removed drops all of it.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "probe_widget" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"       UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "organization_id" UUID NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "name"            TEXT NOT NULL,
  "state"           TEXT NOT NULL DEFAULT 'received',
  "custom_fields"   JSONB NOT NULL DEFAULT '{}',
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMP(3) NOT NULL DEFAULT now(),
  "version"         INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS "probe_widget_tenant_state" ON "probe_widget" ("tenant_id", "state");

-- Same isolation as every other tenant-scoped table. A capability does not get
-- to opt out of INV-001, and nothing here asks the platform for permission to.
ALTER TABLE "probe_widget" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "probe_widget" FORCE ROW LEVEL SECURITY;

CREATE POLICY "probe_widget_isolation" ON "probe_widget"
  USING ("tenant_id" = verity.current_tenant_id())
  WITH CHECK ("tenant_id" = verity.current_tenant_id());

-- Registration is DATA, not schema: rows in the platform's own registries.
INSERT INTO "capability_definition" (id, name, version, dependencies, entity_types, updated_at)
VALUES ('verity.capability.probe', 'Composition Probe', '1.0.0',
        ARRAY[]::text[], ARRAY['verity.probe.widget'], now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO "entity_definition" (key, capability, class, table_name, tenant_scoped) VALUES
  ('verity.probe.widget', 'verity.capability.probe', 'Persistent', 'probe_widget', true)
ON CONFLICT (key) DO NOTHING;

-- A lifecycle that exercises every StateCategory the SLA substrate branches on:
-- Pending starts a clock, Blocked pauses it, Active resumes, Completed stops it.
INSERT INTO "state_definition" (id, entity_key, key, category, is_initial, is_terminal) VALUES
  (gen_random_uuid(), 'verity.probe.widget', 'received',  'Pending',   true,  false),
  (gen_random_uuid(), 'verity.probe.widget', 'working',   'Active',    false, false),
  (gen_random_uuid(), 'verity.probe.widget', 'waiting',   'Blocked',   false, false),
  (gen_random_uuid(), 'verity.probe.widget', 'finished',  'Completed', false, true),
  (gen_random_uuid(), 'verity.probe.widget', 'abandoned', 'Cancelled', false, true)
ON CONFLICT (entity_key, key) DO NOTHING;

INSERT INTO "transition_definition" (id, entity_key, from_state_id, to_state_id)
SELECT gen_random_uuid(), 'verity.probe.widget', f.id, t.id
FROM state_definition f, state_definition t
WHERE f.entity_key = 'verity.probe.widget' AND t.entity_key = 'verity.probe.widget'
  AND (f.key, t.key) IN (
    ('received','working'), ('working','waiting'), ('waiting','working'),
    ('working','finished'), ('received','abandoned'))
ON CONFLICT (from_state_id, to_state_id) DO NOTHING;
