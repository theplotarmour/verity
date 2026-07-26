import { redirect } from "next/navigation";
import { getOwnerUser } from "@/lib/server/owner";
import { Badge, Card } from "@/components/ui/primitives";
import { STORAGE_BUCKET } from "@/lib/storage/config";

export default async function StorageDiagnosticsPage() {
  const owner = await getOwnerUser();
  if (!owner) redirect("/onboarding");

  const diagnostics = {
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL),
    supabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    serviceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    mediaBucket: STORAGE_BUCKET,
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">System</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-text-primary">Storage Diagnostics</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Internal support page for checking Supabase configuration and media storage readiness.
        </p>
      </div>

      <Card className="space-y-4">
        <StatusRow label="Supabase URL" value={diagnostics.supabaseUrl} />
        <StatusRow label="Anon key" value={diagnostics.supabaseAnonKey} />
        <StatusRow label="Service role key" value={diagnostics.serviceRoleKey} />
        <StatusRow label="Media bucket" value={true} text={diagnostics.mediaBucket} />
      </Card>

      <Card>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-tertiary">API</p>
        <pre className="mt-3 overflow-x-auto rounded-[16px] bg-slate-950 p-4 text-xs leading-6 text-slate-100">
          {JSON.stringify(diagnostics, null, 2)}
        </pre>
      </Card>
    </div>
  );
}

function StatusRow({
  label,
  value,
  text,
}: {
  label: string;
  value: boolean;
  text?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[16px] border border-border bg-surface-2 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {text ? <p className="text-xs text-text-tertiary">{text}</p> : null}
      </div>
      <Badge className={value ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}>
        {value ? "Ready" : "Missing"}
      </Badge>
    </div>
  );
}
