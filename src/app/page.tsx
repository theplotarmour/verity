import { getUserSession } from "@/lib/server/auth";
import { HomeClient } from "./client";
import prisma from "@/lib/prisma";
import { getSessionHomePath } from "@/lib/server/roleHome";

export default async function HomePage() {
  const session = await getUserSession();
  let isValidSession = false;
  let homePath: string | undefined;

  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true }
    });
    isValidSession = !!user;
    homePath = isValidSession ? await getSessionHomePath(session) : undefined;
  }

  return (
    <HomeClient 
      hasSession={isValidSession} 
      role={isValidSession ? session?.role : undefined} 
      homePath={homePath}
    />
  )
}
