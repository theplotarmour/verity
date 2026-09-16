// Pure tests import platform modules that validate runtime configuration but do
// not issue database queries. Defined local sentinels keep generated Prisma
// Client from loading the repository's application .env as an import side
// effect. Integration suites continue to use setup-env.ts and an explicit
// isolated .env.test database.
process.env.DATABASE_URL ??= "postgresql://pure:unused@127.0.0.1:5432/verity_pure";
process.env.DIRECT_URL ??= "postgresql://pure:unused@127.0.0.1:5432/verity_pure";
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://pure-test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "pure-test-anon-key";
process.env.VERITY_SESSION_SECRET ??= "pure-test-private-session-secret";
