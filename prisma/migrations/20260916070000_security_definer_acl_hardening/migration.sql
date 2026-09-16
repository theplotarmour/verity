-- VCA-019: PostgreSQL grants EXECUTE on new functions to PUBLIC by default.
-- SECURITY DEFINER functions cross an ordinary caller's table privileges, so
-- they must be callable only by the application runtime role (or an
-- administrative owner), never by every database principal.

ALTER DEFAULT PRIVILEGES IN SCHEMA verity
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

DO $acl$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature,
           p.prorettype = 'pg_catalog.trigger'::regtype AS is_trigger
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'verity'
       AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn.signature);

    -- Trigger functions execute through their trigger binding and do not need
    -- to be directly invokable by the application role.
    IF NOT fn.is_trigger
       AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'verity_app') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO verity_app', fn.signature);
    END IF;
  END LOOP;
END
$acl$;
