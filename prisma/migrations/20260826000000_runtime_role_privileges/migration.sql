-- Runtime role privileges — reproducibility fix (Phase 0.9, remediation F1).
--
-- WHY THIS EXISTS
-- The migration history reproduced Verity's schema exactly — every table, policy,
-- function, index and trigger — but reproduced none of the runtime role's
-- privileges. A database built from migrations alone came up structurally
-- complete and unusable: the first query as `verity_app` failed with
--
--     ERROR: permission denied for table tenant   (SQLSTATE 42501)
--
-- because two PostgreSQL properties hid the gap. Roles are cluster-wide but
-- GRANTs are per-database, so the role connects successfully and only fails at
-- the first statement. And ALTER DEFAULT PRIVILEGES is per-database and
-- per-grantor, so the arrangement that grants each new table to `verity_app`
-- automatically applied only to the database where it was once set by hand.
--
-- Evidence: implementation/phase-0-9-fresh-migration.md
--
-- WHAT THIS DOES NOT DO
-- It does not create the role. Role provisioning is deliberately outside the
-- migration system — `verity_app` is a cluster object, its credentials are an
-- environment concern, and CLAUDE.md's runtime/migration role split is an
-- operational boundary rather than a schema one. This migration configures
-- privileges for a role that already exists, and no-ops with a NOTICE when it
-- does not, so a database provisioned without the runtime role still migrates.
--
-- It grants nothing beyond what the verified application database already
-- grants. The privilege set below was read from that database, not chosen:
--
--     public tables      verity_app=arwd/postgres   (SELECT INSERT UPDATE DELETE)
--     public sequences   verity_app=rU/postgres     (SELECT USAGE)
--     schema public      verity_app=U               (USAGE, never CREATE)
--     schema verity      verity_app=U               (USAGE, never CREATE)
--     verity functions   verity_app=X/postgres      (EXECUTE, all 23)
--     _prisma_migrations NOT GRANTED — migration bookkeeping is not application data
--
-- No role attribute is altered. No ownership changes. No RLS is disabled and no
-- policy is touched: `verity_app` remains NOSUPERUSER NOBYPASSRLS, so every
-- grant below is still filtered by the 62 policies that enforce INV-001.
-- Widening privileges is a security change; this migration deliberately widens
-- nothing.
--
-- Idempotent: GRANT and ALTER DEFAULT PRIVILEGES both restate cleanly, so this
-- is a no-op against the existing application database.

DO $$
DECLARE
  -- The runtime role from CLAUDE.md's connection-role contract. Named here
  -- rather than discovered, because a migration that guessed which role should
  -- receive write access would be a privilege decision made by inference.
  runtime_role CONSTANT text := 'verity_app';

  -- The role running this migration, which is also the role that owns every
  -- object the migrations create. ALTER DEFAULT PRIVILEGES applies per grantor:
  -- a default privilege set for role X governs only objects X creates. Pinning
  -- it to `postgres` would silently do nothing in an environment that migrates
  -- as some other role, so it is taken from the session rather than assumed.
  migration_owner CONSTANT text := current_user;

  target record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = runtime_role) THEN
    RAISE NOTICE
      'Role % does not exist; skipping runtime privilege grants. Provision the role, then re-run this migration or apply the same grants manually.',
      runtime_role;
    RETURN;
  END IF;

  -- Schema access. USAGE only — the runtime role must never create objects.
  EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', runtime_role);
  EXECUTE format('GRANT USAGE ON SCHEMA verity TO %I', runtime_role);

  -- Application tables, one at a time so `_prisma_migrations` is never included.
  -- GRANT ... ON ALL TABLES IN SCHEMA public would sweep it in, and the runtime
  -- role has no business reading or rewriting migration bookkeeping.
  FOR target IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
    ORDER BY tablename
  LOOP
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO %I',
      target.tablename, runtime_role);
  END LOOP;

  -- Sequences. There are none today; the application database nevertheless
  -- carries the sequence default privilege, so reproducing it keeps a future
  -- serial column from re-opening exactly this defect.
  EXECUTE format(
    'GRANT SELECT, USAGE ON ALL SEQUENCES IN SCHEMA public TO %I', runtime_role);

  -- Platform functions. EXECUTE is granted to PUBLIC by default, so these
  -- explicit grants are not what makes the functions callable — they are what
  -- keeps them callable if PUBLIC's default is ever revoked. The application
  -- database carries all 23 explicitly; reproducing that keeps the two states
  -- identical rather than merely equivalent.
  EXECUTE format(
    'GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA verity TO %I', runtime_role);

  -- Future objects created by this migration owner. This is the rule whose
  -- absence caused the defect: without it, the next migration's table would
  -- arrive unreadable in every database except the one where the rule was set
  -- by hand.
  EXECUTE format(
    'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I',
    migration_owner, runtime_role);
  EXECUTE format(
    'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO %I',
    migration_owner, runtime_role);

  RAISE NOTICE 'Runtime privileges configured for % (objects owned by %).',
    runtime_role, migration_owner;
END
$$;
