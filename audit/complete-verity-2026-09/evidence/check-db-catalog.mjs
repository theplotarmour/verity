/**
 * Read-only database catalogue probe for the September 2026 Verity audit.
 * It prints roles, RLS/ FORCE RLS state, policy counts, grants, and security-
 * definer metadata. It never selects tenant rows or prints connection strings.
 */
import { PrismaClient } from "@prisma/client";

process.loadEnvFile(".env");
const db = new PrismaClient();

const result = {};

result.runtimeRole = await db.$queryRawUnsafe(`
  SELECT rolname AS role, rolsuper AS superuser, rolbypassrls AS bypass_rls
  FROM pg_roles WHERE rolname = current_user
`);

result.tableSummary = await db.$queryRawUnsafe(`
  SELECT
    count(*)::int AS tables,
    count(*) FILTER (WHERE relrowsecurity)::int AS rls_enabled,
    count(*) FILTER (WHERE relforcerowsecurity)::int AS force_rls,
    count(*) FILTER (WHERE NOT relrowsecurity)::int AS without_rls
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
`);

result.tablesWithoutRls = await db.$queryRawUnsafe(`
  SELECT c.relname AS table_name
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
  ORDER BY c.relname
`);

result.tablesWithoutForceRls = await db.$queryRawUnsafe(`
  SELECT c.relname AS table_name
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
    AND c.relname <> '_prisma_migrations'
    AND NOT c.relforcerowsecurity
  ORDER BY c.relname
`);

result.policySummary = await db.$queryRawUnsafe(`
  SELECT count(*)::int AS policies, count(DISTINCT tablename)::int AS tables_with_policy
  FROM pg_policies WHERE schemaname = 'public'
`);

result.rlsTablesWithoutPolicy = await db.$queryRawUnsafe(`
  SELECT c.relname AS table_name
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_policies p ON p.schemaname = n.nspname AND p.tablename = c.relname
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
  GROUP BY c.relname
  HAVING count(p.policyname) = 0
  ORDER BY c.relname
`);

result.runtimeGrantSummary = await db.$queryRawUnsafe(`
  SELECT privilege_type, count(DISTINCT table_name)::int AS tables
  FROM information_schema.role_table_grants
  WHERE grantee = current_user AND table_schema = 'public'
  GROUP BY privilege_type ORDER BY privilege_type
`);

result.sensitiveTableGrants = await db.$queryRawUnsafe(`
  SELECT table_name, privilege_type
  FROM information_schema.role_table_grants
  WHERE grantee = current_user AND table_schema = 'public'
    AND table_name IN ('_prisma_migrations', 'request_quota')
  ORDER BY table_name, privilege_type
`);

result.securityDefinerFunctions = await db.$queryRawUnsafe(`
  SELECT p.proname AS function_name,
         p.prosecdef AS security_definer,
         coalesce(array_to_string(p.proconfig, ','), '') AS configuration
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'verity' AND p.prosecdef
  ORDER BY p.proname
`);

result.schemaCreatePrivileges = await db.$queryRawUnsafe(`
  SELECT n.nspname AS schema_name,
         has_schema_privilege(current_user, n.oid, 'USAGE') AS runtime_can_use,
         has_schema_privilege('public', n.oid, 'USAGE') AS public_can_use,
         has_schema_privilege(current_user, n.oid, 'CREATE') AS runtime_can_create,
         has_schema_privilege('public', n.oid, 'CREATE') AS public_can_create
  FROM pg_namespace n
  WHERE n.nspname IN ('public', 'verity')
  ORDER BY n.nspname
`);

result.securityDefinerExecuteGrants = await db.$queryRawUnsafe(`
  SELECT p.proname AS function_name,
         has_function_privilege(current_user, p.oid, 'EXECUTE') AS runtime_can_execute,
         has_function_privilege('public', p.oid, 'EXECUTE') AS public_can_execute
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'verity' AND p.prosecdef
  ORDER BY p.proname
`);

result.rolesWithVerityUsage = await db.$queryRawUnsafe(`
  SELECT rolname AS role
  FROM pg_roles
  WHERE has_schema_privilege(rolname, 'verity', 'USAGE')
  ORDER BY rolname
`);

result.capabilityCatalog = await db.$queryRawUnsafe(`
  SELECT id, name, version, dependencies, entity_types
  FROM capability_definition
  ORDER BY id
`);

console.log(JSON.stringify(result, null, 2));
await db.$disconnect();
