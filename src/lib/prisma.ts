import { PrismaClient } from '@prisma/client'

// The database is a direct (unpooled) Postgres connection with max_connections
// of 50, shared by every dev server, every deployed instance and every
// `migrate deploy` that runs on build. Prisma's default pool is
// num_cpus * 2 + 1 — around 17-25 on a typical machine — so two or three
// clients exhaust the whole ceiling and everything after that fails with
// "too many connections for role".
//
// Two things keep that from happening:
//   1. the pool is capped explicitly instead of scaling with the host,
//   2. exactly one client is reused per process, in production as well as dev.
const POOL_LIMIT = Number(process.env.DATABASE_POOL_LIMIT ?? 5)

function pooledUrl() {
  const base = process.env.DATABASE_URL
  // Accelerate / Data Proxy URLs pool server-side; leave those alone.
  if (!base || base.startsWith('prisma://') || base.startsWith('prisma+postgres://')) return undefined
  try {
    const url = new URL(base)
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', String(POOL_LIMIT))
    }
    // Fail fast rather than piling up waiters once the pool is saturated.
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', '20')
    }
    return url.toString()
  } catch {
    return undefined
  }
}

const prismaClientSingleton = () => {
  const url = pooledUrl()
  return url ? new PrismaClient({ datasources: { db: { url } } }) : new PrismaClient()
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

// Held in production too. The usual "dev only" form of this guard assumes the
// module is evaluated exactly once per process, but Next.js can evaluate it per
// worker and per route bundle — and every fresh client brought its own pool.
globalThis.prismaGlobal = prisma
