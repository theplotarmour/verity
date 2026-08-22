import { NextResponse } from "next/server";
import { clearUserSession } from "@/lib/server/auth";

export async function POST() {
  await clearUserSession();
  const response = NextResponse.json({ ok: true });
  response.cookies.set("verity_session", "", {
    expires: new Date(0),
    path: "/",
  });
  return response;
}
