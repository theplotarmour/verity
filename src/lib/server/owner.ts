import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getUserSession } from "./auth";
import { getSessionHomePath } from "@/lib/server/roleHome";

export const getOwnerUser = cache(async () => {
  const session = await getUserSession();
  
  // Store managers reach the owner shell too (to book productions); individual
  // owner pages still gate on their own permissions, so a store manager only
  // lands on Production/Dashboard.
  const allowed = ["OWNER", "CO_OWNER", "MANAGER", "STORE_MANAGER"];
  if (!session || !allowed.includes(session.role)) {
    if (session) redirect(await getSessionHomePath(session));
    redirect("/");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { factory: true }
  });

  if (!dbUser) {
    redirect("/");
  }

  return dbUser;
});
