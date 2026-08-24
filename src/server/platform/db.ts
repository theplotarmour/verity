import { PrismaClient } from "@prisma/client";

// Authority: Bible V1 — Prisma/PostgreSQL is the system of record.
//
// The connection this client uses MUST be a role that is neither SUPERUSER nor
// BYPASSRLS. Row-level security is silently skipped for such roles, which would
// defeat INV-001 while every isolation test still passed. `assertRlsEnforceable`
// in ./tenancy.ts checks this on the first tenant-scoped operation (via
// `withTenant`) and in the test suite.

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
