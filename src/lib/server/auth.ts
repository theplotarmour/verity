import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { SystemRole } from "@prisma/client";
import { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { getSessionHomePath } from "@/lib/server/roleHome";

const secretKey = process.env.JWT_SECRET || "fallback-secret-key-for-dev";
const encodedKey = new TextEncoder().encode(secretKey);

export type SessionPayload = {
  userId: string;
  factoryId: string;
  role: SystemRole;
  language: string;
};

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

export async function decrypt(session: string | undefined = "") {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as SessionPayload;
  } catch (error) {
    return null;
  }
}

export async function createUserSession(payload: SessionPayload) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await encrypt(payload);
  const cookieStore = await cookies();

  cookieStore.set("verity_session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function getUserSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("verity_session")?.value;
  if (!session) return null;
  return await decrypt(session);
}

export async function clearUserSession() {
  const cookieStore = await cookies();
  cookieStore.delete("verity_session");
}

export async function getUserSessionFromRequest(request: NextRequest) {
  const session = request.cookies.get("verity_session")?.value;
  if (!session) return null;
  return await decrypt(session);
}

export async function enforceRole(allowedRoles: SystemRole[]) {
  const session = await getUserSession();
  if (!session) {
    redirect("/");
  }
  
  if (!allowedRoles.includes(session.role)) {
    redirect(await getSessionHomePath(session));
  }
  return session;
}
