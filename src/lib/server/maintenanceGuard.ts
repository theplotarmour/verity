import { NextRequest, NextResponse } from "next/server";

// Gate destructive/data-mutating maintenance endpoints behind an explicit token
// so they can never be triggered by a stray crawler, prefetch, or blind GET on
// the live database. Returns a 401 response when the token is missing/wrong,
// otherwise null (caller proceeds).
export function requireMaintenanceToken(request: NextRequest): NextResponse | null {
  const token = request.nextUrl.searchParams.get("token");
  if (!process.env.MAINTENANCE_TOKEN || token !== process.env.MAINTENANCE_TOKEN) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
