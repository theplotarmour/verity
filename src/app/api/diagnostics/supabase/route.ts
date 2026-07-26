import { NextResponse } from "next/server";
import { STORAGE_BUCKET } from "@/lib/storage/config";

export async function GET() {
  const hasPublicUrl =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) || Boolean(process.env.SUPABASE_URL);
  const hasAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return NextResponse.json({
    ok: true,
    env: {
      supabaseUrl: hasPublicUrl,
      supabaseAnonKey: hasAnonKey,
      serviceRoleKey: hasServiceRoleKey,
      mediaBucket: STORAGE_BUCKET,
    },
    recommendation: hasPublicUrl && hasAnonKey && hasServiceRoleKey
      ? "Supabase env vars look present."
      : "One or more Supabase env vars are missing.",
  });
}
