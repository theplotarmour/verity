import prisma from "@/lib/prisma";
import type { SessionPayload } from "@/lib/server/auth";

export async function getSessionDepartment(session: SessionPayload) {
  if (session.role !== "SUPERVISOR" && session.role !== "WORKER") return null;

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: { department: { select: { id: true, name: true, isQcStage: true } } },
  }).then((user) => user?.department ?? null);
}

export async function getSessionHomePath(session: SessionPayload) {
  if (session.role === "OWNER" || session.role === "CO_OWNER" || session.role === "MANAGER" || session.role === "STORE_MANAGER") {
    return "/owner";
  }

  if (session.role === "SUPERVISOR") {
    const dept = await getSessionDepartment(session);
    return dept?.isQcStage ? "/inspector" : "/supervisor";
  }

  if (session.role === "WORKER") return "/worker";
  return "/";
}
