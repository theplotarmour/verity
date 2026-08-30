-- ---------------------------------------------------------------------------
-- Remove the Plywood logistics module (slice 2)
--
-- Authority: taskplans/45_plywood_workflow_program.md §D-01, taken as an
-- explicit product decision on 2026-08-31; PLYWOOD_TARGET_WORKFLOW_GAP_AUDIT.md
-- P0-10.
--
-- WHY THE TABLES GO RATHER THAN BEING LEFT BEHIND
-- The alternative considered was to drop the product surface and keep the
-- schema. It was rejected: dead tables carrying live foreign keys to sales
-- orders, purchase orders, locations, customers and assets are not inert. They
-- constrain every future migration on those tables, and the next reader has to
-- be told which of two shipment-shaped concepts is real.
--
-- The deeper reason is the one the audit gives as P0-04: while a shipment can
-- move material out of a godown, a godown has two doors. A stock ledger with
-- two doors cannot be reconciled to its documents, and "every quantity traces
-- to a source document" is the property this whole programme is being built to
-- obtain. Material now leaves through a Goods Issue and through nothing else.
--
-- DATA
-- This is destructive and irreversible. It is being run against deployments
-- that have no production plywood shipments; a deployment that did would need
-- an export first, and that export is not written here because writing one for
-- a case that does not exist is how untested code enters a migration.
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS "plywood_shipment";
DROP TABLE IF EXISTS "plywood_transporter";
