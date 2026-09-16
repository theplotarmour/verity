CREATE OR REPLACE FUNCTION verity.incompatible_capability_activation_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT count(*)
  FROM public.tenant_activation AS activation
  JOIN public.capability_definition AS definition
    ON definition.id = activation.capability_id
  WHERE activation.status = 'Active'
    AND activation.pinned_version IS DISTINCT FROM definition.version
$$;

REVOKE ALL ON FUNCTION verity.incompatible_capability_activation_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION verity.incompatible_capability_activation_count() TO verity_app;
