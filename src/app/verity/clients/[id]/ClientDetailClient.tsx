"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, KeyRound, Lock, Rocket, ShieldCheck } from "lucide-react";

import { toast } from "@/components/ui/toast";
import { confirmDialog } from "@/components/ui/dialog-service";
import {
  applyVerticalPack,
  deployTenantConfig,
  resetTenantUserPin,
  updateOnboardingStatus,
} from "@/server/actions/hq";
import { workflowStatus } from "@/platform/events/workflows";
import type { ModuleKey } from "@/platform/modules/registry";
import { HqButton, HqCard, HqDialog, HqField, HqInput, HqSelect, HqStat } from "../../ui";

type Factory = {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  onboardingStatus: string;
  setupFee: number;
  monthlyFee: number;
  createdAt: string;
  organizationId: string;
  organization: { name: string; currency: string; timezone: string } | null;
};

type User = {
  id: string;
  name: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  locked: boolean;
};

type Module = {
  key: string;
  name: string;
  description: string;
  requires: string[];
  alwaysOn: boolean;
  enabled: boolean;
};

type Pack = { key: string; label: string; modules: { key: string; name: string }[] };

type Role = {
  id: string;
  name: string;
  systemRole: string;
  isSystem: boolean;
  userCount: number;
  permissionCount: number;
};

type Brand = { logoUrl: string | null; themeColor: string | null; domain: string };

/** The accent every shell falls back to when a tenant has not chosen one. */
const DEFAULT_ACCENT = "#FF102A";

const STATUSES = ["SETUP", "LIVE", "SUSPENDED"];

export function ClientDetailClient({
  factory,
  users,
  modules,
  packs,
  roles,
  brand,
}: {
  factory: Factory;
  users: User[];
  modules: Module[];
  packs: Pack[];
  roles: Role[];
  brand: Brand;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  // Local mirror so toggling several modules is one save, not one round trip
  // per checkbox — half-applied entitlements are worse than none.
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(modules.filter((m) => m.enabled).map((m) => m.key)),
  );
  const [issued, setIssued] = useState<{ name: string; phone: string; pin: string } | null>(null);
  const [themeColor, setThemeColor] = useState(brand.themeColor ?? DEFAULT_ACCENT);
  const [logoUrl, setLogoUrl] = useState<string | null>(brand.logoUrl);

  const modulesDirty = useMemo(() => {
    const original = new Set(modules.filter((m) => m.enabled).map((m) => m.key));
    if (original.size !== selected.size) return true;
    return [...selected].some((k) => !original.has(k));
  }, [modules, selected]);

  const brandDirty =
    themeColor !== (brand.themeColor ?? DEFAULT_ACCENT) || logoUrl !== brand.logoUrl;
  const dirty = modulesDirty || brandDirty;

  // Which composed workflows this selection lights up, recomputed as the operator
  // toggles rather than after saving. The point of showing it here is to answer
  // "will a completed job turn into a bill?" *before* the config is deployed.
  const workflows = useMemo(
    () => workflowStatus([...selected] as ModuleKey[]),
    [selected],
  );

  function toggle(mod: Module) {
    if (mod.alwaysOn) return;
    setSelected((was) => {
      const next = new Set(was);
      if (next.has(mod.key)) next.delete(mod.key);
      else next.add(mod.key);
      return next;
    });
  }

  /**
   * One button for the whole configuration.
   *
   * Modules and brand were two saves an operator had to remember to do in order.
   * `deployTenantConfig` applies both and refuses the second half if the first
   * fails, so the tenant is never left half-configured with nothing saying so.
   */
  function deploy() {
    start(async () => {
      const result = await deployTenantConfig({
        factoryId: factory.id,
        organizationId: factory.organizationId,
        moduleKeys: [...selected],
        themeColor,
        logoUrl,
      });
      if (!result.success) {
        toast.error(("error" in result && result.error) || "Could not deploy the configuration.");
        return;
      }
      toast.success("Configuration deployed.");
      router.refresh();
    });
  }

  function pickLogo(file: File | null) {
    if (!file) return;
    // Read to a data URI, the same shape `/api/settings` already stores. One
    // storage path for the asset, not two that disagree.
    const reader = new FileReader();
    reader.onload = () => setLogoUrl(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  // Named `applyPack`, not `usePack`: the `use` prefix makes lint treat it as a
  // React hook and reject the call from inside an onChange handler.
  function applyPack(packKey: string) {
    if (!packKey) return;
    start(async () => {
      const result = await applyVerticalPack(factory.organizationId, packKey);
      if (!result.success) {
        toast.error(result.error ?? "Could not apply the pack.");
        return;
      }
      toast.success("Pack applied.");
      router.refresh();
    });
  }

  function setStatus(status: string) {
    start(async () => {
      const result = await updateOnboardingStatus(factory.id, status);
      if (!result.success) {
        toast.error("Could not update status.");
        return;
      }
      router.refresh();
    });
  }

  async function resetPin(user: User) {
    const ok = await confirmDialog({
      title: `Issue a new PIN for ${user.name}?`,
      description:
        "Their current PIN stops working immediately. The new one is shown once and cannot be looked up again.",
      confirmLabel: "Issue new PIN",
      variant: "danger",
    });
    if (!ok) return;

    start(async () => {
      const result = await resetTenantUserPin(user.id);
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      if ("credentials" in result && result.credentials) setIssued(result.credentials);
      router.refresh();
    });
  }

  function copyIssued() {
    if (!issued) return;
    void navigator.clipboard.writeText(
      `Verity access — ${factory.name}\nName: ${issued.name}\nPhone: ${issued.phone}\nPIN: ${issued.pin}`,
    );
    toast.success("Copied.");
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <Link
        href="/verity/clients"
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/35 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Clients
      </Link>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(24px,3vw,32px)] font-semibold tracking-[-0.04em]">
            {factory.name}
          </h1>
          <p className="mt-1 text-[13px] text-white/40">
            /{factory.slug}
            {factory.industry ? ` · ${factory.industry}` : ""} · created{" "}
            {new Date(factory.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="w-44">
          <HqSelect
            value={factory.onboardingStatus}
            onChange={(e) => setStatus(e.currentTarget.value)}
            disabled={pending}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            {STATUSES.includes(factory.onboardingStatus) ? null : (
              <option value={factory.onboardingStatus}>{factory.onboardingStatus}</option>
            )}
          </HqSelect>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <HqStat label="Users" value={users.length} />
        <HqStat label="Modules" value={selected.size} tone="brand" />
        <HqStat label="Setup fee" value={factory.setupFee.toLocaleString()} />
        <HqStat label="Monthly" value={factory.monthlyFee.toLocaleString()} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        {/* Modules */}
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-[15px] font-semibold">Modules</h2>
            <div className="flex items-center gap-2">
              <div className="w-52">
                <HqSelect
                  defaultValue=""
                  onChange={(e) => applyPack(e.currentTarget.value)}
                  disabled={pending}
                >
                  <option value="">Apply a pack…</option>
                  {packs.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </HqSelect>
              </div>
              <HqButton onClick={deploy} disabled={pending || !dirty}>
                <Rocket className="h-3.5 w-3.5" />
                {pending ? "Deploying..." : dirty ? "Deploy config" : "Deployed"}
              </HqButton>
            </div>
          </div>

          <p className="mb-3 text-[12px] text-white/35">
            Turning a module off only hides it. No data is deleted, and turning it back on returns
            everything as it was. Dependencies are added automatically on save.
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            {modules.map((m) => {
              const on = selected.has(m.key) || m.alwaysOn;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => toggle(m)}
                  disabled={m.alwaysOn}
                  className={
                    on
                      ? "rounded-xl border border-[#FF1D2A]/40 bg-[#FF1D2A]/[0.07] p-3 text-left transition-colors disabled:opacity-60"
                      : "rounded-xl border border-white/8 bg-white/[0.02] p-3 text-left transition-colors hover:border-white/20"
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold">{m.name}</span>
                    {m.alwaysOn ? (
                      <Lock className="h-3 w-3 shrink-0 text-white/30" />
                    ) : (
                      <span
                        className={
                          on
                            ? "h-3.5 w-3.5 shrink-0 rounded-[4px] bg-[#FF1D2A]"
                            : "h-3.5 w-3.5 shrink-0 rounded-[4px] border border-white/20"
                        }
                      />
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-white/35">
                    {m.description}
                  </p>
                </button>
              );
            })}
          </div>
          {/* Workflow hooks — what the module selection actually composes into. */}
          <h2 className="mb-3 mt-7 font-display text-[15px] font-semibold">Workflows</h2>
          <p className="mb-3 text-[12px] text-white/35">
            Modules are screens; these are the chains between them. A step whose module is off is
            skipped at runtime — the rest of the chain still runs.
          </p>
          <div className="space-y-2">
            {workflows.map(({ workflow, missing, started }) => (
              <HqCard key={workflow.key} className="p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-[13px] font-semibold">{workflow.name}</h3>
                  <span
                    className={
                      missing.length === 0
                        ? "text-[10px] font-semibold uppercase tracking-[0.16em] text-[#4ADE80]"
                        : started
                          ? "text-[10px] font-semibold uppercase tracking-[0.16em] text-[#FBBF24]"
                          : "text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30"
                    }
                  >
                    {missing.length === 0 ? "complete" : started ? "partial" : "inactive"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-snug text-white/35">{workflow.purpose}</p>

                <ol className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1.5">
                  {workflow.steps.map((step, i) => {
                    const on = selected.has(step.module);
                    return (
                      <li key={`${workflow.key}-${i}`} className="flex items-center gap-1.5">
                        <span
                          className={
                            on
                              ? "rounded-md border border-[#FF1D2A]/40 bg-[#FF1D2A]/[0.07] px-2 py-1 text-[11px]"
                              : "rounded-md border border-white/8 px-2 py-1 text-[11px] text-white/30 line-through"
                          }
                          title={step.event ? `publishes ${step.event}` : "reacts"}
                        >
                          {step.label}
                        </span>
                        {i < workflow.steps.length - 1 ? (
                          <span aria-hidden className="text-white/20">
                            /
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>

                {missing.length > 0 ? (
                  <p className="mt-2 text-[11px] text-white/35">
                    Off: {missing.join(", ")}
                  </p>
                ) : null}
              </HqCard>
            ))}
          </div>
        </div>

        {/* People */}
        <div>
          <h2 className="mb-3 font-display text-[15px] font-semibold">People</h2>
          <HqCard className="p-0">
            {users.length === 0 ? (
              <p className="p-4 text-sm text-white/40">No users yet.</p>
            ) : (
              <div className="divide-y divide-white/6">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium">
                        {u.name}
                        {u.locked ? (
                          <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#FF6B74]">
                            locked
                          </span>
                        ) : null}
                        {!u.isActive ? (
                          <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
                            inactive
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate font-mono text-[11px] text-white/35">
                        {u.phone ?? "no phone"} · {u.role}
                      </p>
                    </div>
                    <HqButton
                      variant="ghost"
                      className="min-h-9 px-2.5 text-[11px]"
                      onClick={() => resetPin(u)}
                      disabled={pending}
                      aria-label={`Issue a new PIN for ${u.name}`}
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      PIN
                    </HqButton>
                  </div>
                ))}
              </div>
            )}
          </HqCard>

          {/* Role matrix — who can reach what the modules turned on. */}
          <h2 className="mb-3 mt-7 font-display text-[15px] font-semibold">Roles</h2>
          <HqCard className="p-0">
            {roles.length === 0 ? (
              <p className="p-4 text-sm text-white/40">
                No roles yet. Provisioning creates the system roles.
              </p>
            ) : (
              <div className="divide-y divide-white/6">
                {roles.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate text-[13px] font-medium">
                        {r.isSystem ? (
                          <ShieldCheck className="h-3 w-3 shrink-0 text-white/30" />
                        ) : null}
                        {r.name}
                      </p>
                      <p className="truncate text-[11px] text-white/35">
                        {r.userCount} {r.userCount === 1 ? "person" : "people"} ·{" "}
                        {r.permissionCount} permissions
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-white/25">
                      {r.systemRole}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </HqCard>

          {/* Brand identity — the first thing a client notices. */}
          <h2 className="mb-3 mt-7 font-display text-[15px] font-semibold">Brand identity</h2>
          <HqCard className="space-y-4 p-4">
            <HqField label="Accent">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.currentTarget.value)}
                  disabled={pending}
                  aria-label="Accent colour"
                  className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-transparent p-0.5"
                />
                <HqInput
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.currentTarget.value)}
                  disabled={pending}
                  spellCheck={false}
                  className="font-mono uppercase"
                  aria-label="Accent colour hex"
                />
              </div>
            </HqField>

            <div className="space-y-1.5">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
                Logo
              </span>
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                  {logoUrl ? (
                    // Data URI, so next/image would only add a loader for no gain.
                    <img src={logoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[10px] uppercase tracking-[0.14em] text-white/25">
                      none
                    </span>
                  )}
                </div>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <input
                    type="file"
                    accept="image/*"
                    disabled={pending}
                    onChange={(e) => pickLogo(e.currentTarget.files?.[0] ?? null)}
                    className="max-w-full text-[11px] text-white/40 file:mr-2 file:rounded-lg file:border-0 file:bg-white/8 file:px-2.5 file:py-1.5 file:text-[11px] file:text-white"
                  />
                  {logoUrl ? (
                    <button
                      type="button"
                      onClick={() => setLogoUrl(null)}
                      disabled={pending}
                      className="self-start text-[11px] text-white/35 underline-offset-2 hover:text-white hover:underline"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
                Domain
              </span>
              <p className="font-mono text-[12px] text-white/45">{brand.domain}</p>
            </div>

            <p className="text-[11px] leading-snug text-white/30">
              Applied on deploy, alongside the modules. The accent paints every tenant shell; the
              rest of Verity keeps its own.
            </p>
          </HqCard>
        </div>
      </div>

      <HqDialog open={issued !== null} onClose={() => setIssued(null)} title="New PIN issued">
        {issued ? (
          <>
            <p className="text-sm text-white/50">
              Shown once. Only the hash is stored, so this cannot be looked up again.
            </p>
            <div className="mt-4 space-y-2 rounded-xl border border-[#FF1D2A]/25 bg-[#FF1D2A]/[0.06] p-4">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-[11px] uppercase tracking-[0.16em] text-white/35">Name</span>
                <span className="text-sm">{issued.name}</span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-[11px] uppercase tracking-[0.16em] text-white/35">Phone</span>
                <span className="font-mono text-sm tracking-[0.12em]">{issued.phone}</span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-[11px] uppercase tracking-[0.16em] text-white/35">PIN</span>
                <span className="font-mono text-sm tracking-[0.12em]">{issued.pin}</span>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <HqButton variant="ghost" onClick={copyIssued}>
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
