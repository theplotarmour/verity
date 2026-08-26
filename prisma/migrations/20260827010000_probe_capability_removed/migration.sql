-- ---------------------------------------------------------------------------
-- Remove the composition probe
--
-- The probe existed to prove gate 9 and has done so; the evidence is the commit
-- that added it and the run recorded in implementation/client-readiness.md.
-- PLATFORM-FREEZE forbids a demonstration capability surviving in the tree, so
-- it goes — table, registrations, states and all.
--
-- Dropped in dependency order. The state and transition rows would cascade from
-- entity_definition, but naming them makes the removal readable rather than
-- implicit.
-- ---------------------------------------------------------------------------

DELETE FROM transition_definition WHERE entity_key = 'verity.probe.widget';
DELETE FROM state_definition      WHERE entity_key = 'verity.probe.widget';
DELETE FROM custom_field_schema   WHERE entity_key = 'verity.probe.widget';
DELETE FROM sla_clock             WHERE entity_key = 'verity.probe.widget';
DELETE FROM sla_policy            WHERE entity_key = 'verity.probe.widget';
DELETE FROM activity              WHERE entity_key = 'verity.probe.widget';
DELETE FROM notification          WHERE entity_key = 'verity.probe.widget';
DELETE FROM permission            WHERE entity = 'verity.probe.widget';
DELETE FROM config_parameter      WHERE key = 'probe.max_widgets';
DELETE FROM tenant_activation     WHERE capability_id = 'verity.capability.probe';
DELETE FROM entity_definition     WHERE key = 'verity.probe.widget';
DELETE FROM capability_definition WHERE id = 'verity.capability.probe';

DROP TABLE IF EXISTS "probe_widget";
