"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Copy, Plus, Search } from "lucide-react";

import { toast } from "@/components/ui/toast";
import { provisionClient } from "@/server/actions/hq";
import { HqButton, HqCard, HqDialog, HqField, HqInput, HqSelect, HqStat } from "../ui";

type Client = {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  industry: string | null;
  onboardingStatus: string;
  userCount: number;
  orderCount: number;
  setupFee: number;
  monthlyFee: number;
};

type Pack = { key: string; label: string; modules: { key: string; name: string }[] };

type Issued = { name: string; phone: string; pin: string; workspace: string };

const BLANK = {
  name: "",
  ownerName: "",
  ownerPhone: "",
  verticalPack: "",
  setupFee: "",
  monthlyFee: "",
};

export function ClientsClient({ clients, packs }: { clients: Client[]; packs: Pack[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(BLANK);
  // Held in memory only, and only until dismissed. Never re-fetchable.
  const [issued, setIssued] = useState<Issued | null>(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.name, c.slug, c.industry].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [clients, query]);

  const totals = useMemo(
    () => ({
      clients: clients.length,
      users: clients.reduce((sum, c) => sum + c.userCount, 0),
      live: clients.filter((c) => c.onboardingStatus === "LIVE").length,
      mrr: clients.reduce((sum, c) => sum + c.monthlyFee, 0),
    }),
    [clients],
  );

  const selectedPack = packs.find((p) => p.key === form.verticalPack);

  function submit() {
    if (!form.name.trim() || !form.ownerName.trim()) {
      toast.error("Workspace and owner name are both required.");
      return;
    }
    if (!form.verticalPack) {
      toast.error("Pick a business type.");
      return;
    }

    start(async () => {
      const result = await provisionClient({
        name: form.name,
        ownerName: form.ownerName,
        ownerPhone: form.ownerPhone,
        verticalPack: form.verticalPack,
        setupFee: Number(form.setupFee) || 0,
        monthlyFee: Number(form.monthlyFee) || 0,
      });

      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      if (!("credentials" in result) || !result.credentials) return;

      setCreating(false);
      setForm(BLANK);
      setIssued({ ...result.credentials, workspace: form.name });
      router.refresh();
    });
  }

  function copyCredentials() {
    if (!issued) return;
    const text = `Verity access — ${issued.workspace}\nName: ${issued.name}\nPhone: ${issued.phone}\nPIN: ${issued.pin}`;
    void navigator.clipboard.writeText(text);
    toast.success("Copied.");
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/35">
            Verity HQ
          </p>
          <h1 className="mt-2 font-display text-[clamp(26px,3.5vw,36px)] font-semibold tracking-[-0.04em]">
            Clients
          </h1>
          <p className="mt-1.5 text-sm text-white/45">
            Every workspace on the platform, and the modules each one runs.
          </p>
        </div>
        <HqButton onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          New client
        </HqButton>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <HqStat label="Workspaces" value={totals.clients} />
        <HqStat label="Live" value={totals.live} tone="brand" />
        <HqStat label="Users" value={totals.users} />
        <HqStat label="Monthly fees" value={totals.mrr.toLocaleString()} />
      </div>

      <div className="mt-6 relative max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
        <HqInput
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          placeholder="Search clients..."
          className="pl-9"
        />
      </div>

      <div className="mt-4 space-y-2">
        {shown.length === 0 ? (
          <HqCard className="py-12 text-center">
            <Building2 className="mx-auto h-6 w-6 text-white/20" />
            <p className="mt-3 text-sm text-white/50">
              {clients.length === 0
                ? "No workspaces yet. Create the first client."
                : "No client matches that search."}
            </p>
          </HqCard>
        ) : (
          shown.map((c) => (
            <Link
              key={c.id}
              href={`/verity/clients/${c.id}`}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/8 bg-white/[0.02] p-4 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
            >
              <div className="min-w-0">
                <p className="truncate font-display text-[15px] font-semibold">{c.name}</p>
                <p className="truncate text-[12px] text-white/40">
                  /{c.slug}
                  {c.industry ? ` · ${c.industry}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-6 text-right">
                <div>
                  <p className="font-mono text-sm">{c.userCount}</p>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/30">Users</p>
                </div>
                <div>
                  <p className="font-mono text-sm">{c.orderCount}</p>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/30">Orders</p>
                </div>
                <span
                  className={
                    c.onboardingStatus === "LIVE"
                      ? "rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300"
                      : "rounded-full border border-white/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45"
                  }
                >
                  {c.onboardingStatus}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* New client */}
      <HqDialog open={creating} onClose={() => setCreating(false)} title="New client workspace">
        <div className="space-y-4">
          <HqField label="Workspace name">
            <HqInput
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.currentTarget.value })}
              placeholder="Sentinel Facility Services"
            />
          </HqField>

          <HqField
            label="Business type"
            hint="Decides which modules the workspace is entitled to."
          >
            <HqSelect
              value={form.verticalPack}
              onChange={(e) => setForm({ ...form, verticalPack: e.currentTarget.value })}
            >
              <option value="">Select…</option>
              {packs.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </HqSelect>
          </HqField>

          {selectedPack ? (
            <div className="flex flex-wrap gap-1.5 rounded-xl border border-white/8 bg-white/[0.02] p-3">
              {selectedPack.modules.map((m) => (
                <span
                  key={m.key}
                  className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-white/45"
                >
                  {m.name}
                </span>
              ))}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <HqField label="Owner name">
              <HqInput
                value={form.ownerName}
                onChange={(e) => setForm({ ...form, ownerName: e.currentTarget.value })}
              />
            </HqField>
            <HqField label="Owner phone" hint="This is their username.">
              <HqInput
                inputMode="numeric"
                value={form.ownerPhone}
                onChange={(e) =>
                  setForm({ ...form, ownerPhone: e.currentTarget.value.replace(/\D/g, "").slice(0, 10) })
                }
                placeholder="9876543210"
              />
            </HqField>
            <HqField label="Setup fee">
              <HqInput
                inputMode="numeric"
                value={form.setupFee}
                onChange={(e) => setForm({ ...form, setupFee: e.currentTarget.value })}
              />
            </HqField>
            <HqField label="Monthly fee">
              <HqInput
                inputMode="numeric"
                value={form.monthlyFee}
                onChange={(e) => setForm({ ...form, monthlyFee: e.currentTarget.value })}
              />
            </HqField>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <HqButton variant="ghost" onClick={() => setCreating(false)} disabled={pending}>
            Cancel
          </HqButton>
          <HqButton onClick={submit} disabled={pending}>
            {pending ? "Provisioning..." : "Create workspace"}
          </HqButton>
        </div>
      </HqDialog>

      {/* Credentials, shown once */}
      <HqDialog
        open={issued !== null}
        onClose={() => setIssued(null)}
        title="Workspace created"
      >
        {issued ? (
          <>
            <p className="text-sm text-white/50">
              This PIN is shown once and is not recoverable — only its hash is stored. Copy it now;
              if it is lost, issue a new one from the client&apos;s page.
            </p>
            <div className="mt-4 space-y-2 rounded-xl border border-[#FF1D2A]/25 bg-[#FF1D2A]/[0.06] p-4">
              <Row label="Workspace" value={issued.workspace} />
              <Row label="Owner" value={issued.name} />
              <Row label="Phone" value={issued.phone} mono />
              <Row label="PIN" value={issued.pin} mono />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <HqButton variant="ghost" onClick={copyCredentials}>
                <Copy className="h-3.5 w-3.5" />
                Copy
              </HqButton>
              <HqButton onClick={() => setIssued(null)}>Done</HqButton>
            </div>
          </>
        ) : null}
      </HqDialog>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[11px] uppercase tracking-[0.16em] text-white/35">{label}</span>
      <span className={mono ? "font-mono text-sm tracking-[0.12em]" : "text-sm"}>{value}</span>
    </div>
  );
}
