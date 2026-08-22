import { NextResponse } from "next/server";

import { getActiveSessionUser } from "@/lib/server/session-user";
import { suggestPack } from "@/lib/server/onboarding";

/**
 * Suggest a vertical pack from a free-text business description (R5).
 *
 * Authenticated — this reaches the model, and the model is a metered resource —
 * but tenant-agnostic: it recommends a pack, it does not change anyone's
 * entitlements. Applying the suggestion is a separate, guarded step in settings.
 */
export async function POST(request: Request) {
  const session = await getActiveSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { description?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  const result = await suggestPack(body.description ?? "");
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 400 });

  return NextResponse.json({ suggestion: result.suggestion });
}
