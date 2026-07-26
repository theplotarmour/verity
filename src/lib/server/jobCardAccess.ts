import prisma from "@/lib/prisma";
import type { SessionPayload } from "@/lib/server/auth";

const OWNER_ROLES = ["OWNER", "CO_OWNER", "MANAGER"];

type AccessibleJobCard = {
  factoryId: string;
  departmentId?: string | null;
  assignedToId?: string | null;
};

// Central authorization for a single job card. The list views are already
// scoped, but detail screens and mutations are reached by id/URL — without this
// a worker or supervisor could act on any card in the factory.
//
//   Owner / manager  → the whole factory.
//   Supervisor       → only cards in the department they staff.
//   Worker           → only cards assigned to them personally.
export async function canAccessJobCard(
  session: SessionPayload,
  jobCard: AccessibleJobCard,
): Promise<boolean> {
  if (jobCard.factoryId !== session.factoryId) return false;
  if (OWNER_ROLES.includes(session.role)) return true;
  if (session.role === "WORKER") return jobCard.assignedToId === session.userId;
  if (session.role === "SUPERVISOR") {
    const deptId = await getSessionDepartmentId(session);
    return !!deptId && deptId === jobCard.departmentId;
  }
  return false;
}

export function isOwnerRole(role: string) {
  return OWNER_ROLES.includes(role);
}

// The department the acting user staffs (null for owners/management, who
// aren't tied to one). Used to scope supervisor queues to their own department.
export async function getSessionDepartmentId(session: SessionPayload): Promise<string | null> {
  const me = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { departmentId: true },
  });
  return me?.departmentId ?? null;
}
