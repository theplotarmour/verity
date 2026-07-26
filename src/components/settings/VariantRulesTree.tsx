"use client";

import { useMemo, useState } from "react";
import { confirmDialog } from "@/components/ui/dialog-service";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Check, Loader2, Car, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { Button, Input } from "@/components/ui/primitives";
import { HEADREST_COUNTS } from "@/lib/variant-descriptor";
import {
  updateGenerationSpecs, addBrand, addModel, addVehicleGeneration,
  removeBrand, removeModel, removeVehicleGeneration,
} from "@/server/actions/masterData";

// Busy-app style categorical tree: Brand ▸ Model ▸ Generation. For each
// generation the owner ticks which specs actually exist in the real world
// (SB/DB, headrest counts, armrest). Empty selection = no restriction, so the
// variant search keeps offering every spec until a generation is curated.
// Fabrics and designs are intentionally NOT gated here — they stay open for
// every vehicle.

const SEAT_TYPE_OPTIONS = ["Single Back", "Double Back"] as const;

const ARMREST_OPTIONS = ["Arm", "No Arm"] as const;

type Gen = {
  id: string;
  name: string;
  allowedSeatTypes?: string[];
  allowedHeadrests?: number[];
  allowedArmrests?: string[];
};

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-1 text-xs font-semibold transition-colors",
        active
          ? "border-[var(--brand)] bg-[var(--brand)] text-white"
          : "border-border bg-surface text-text-secondary hover:border-[var(--brand)]/50"
      )}
    >
      {children}
    </button>
  );
}

function GenerationEditor({ gen }: { gen: Gen }) {
  const [seatTypes, setSeatTypes] = useState<string[]>(gen.allowedSeatTypes ?? []);
  const [headrests, setHeadrests] = useState<number[]>(gen.allowedHeadrests ?? []);
  const [armrests, setArmrests] = useState<string[]>(gen.allowedArmrests ?? []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const sortedEq = (a: any[], b: any[]) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
  const dirty =
    !sortedEq(seatTypes, gen.allowedSeatTypes ?? []) ||
    !sortedEq(headrests, gen.allowedHeadrests ?? []) ||
    !sortedEq(armrests, gen.allowedArmrests ?? []);

  const save = async () => {
    setSaving(true);
    try {
      await updateGenerationSpecs(gen.id, {
        allowedSeatTypes: seatTypes,
        allowedHeadrests: headrests,
        allowedArmrests: armrests,
      });
      // Keep the local baseline in sync so the row stops looking dirty.
      gen.allowedSeatTypes = seatTypes;
      gen.allowedHeadrests = headrests;
      gen.allowedArmrests = armrests;
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      toast.success("Spec rules saved");
    } catch {
      toast.error("Could not save spec rules");
    } finally {
      setSaving(false);
    }
  };

  const clearAll = () => {
    setSeatTypes([]);
    setHeadrests([]);
    setArmrests([]);
  };

  return (
    <div className="space-y-3 px-4 py-3">
      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-text-tertiary">
          Bench type
        </p>
        <div className="flex flex-wrap gap-2">
          {SEAT_TYPE_OPTIONS.map((s) => (
            <Chip key={s} active={seatTypes.includes(s)} onClick={() => setSeatTypes(toggle(seatTypes, s))}>
              {s}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-text-tertiary">
          Headrest counts
        </p>
        <div className="flex flex-wrap gap-2">
          {HEADREST_COUNTS.map((n) => (
            <Chip key={n} active={headrests.includes(n)} onClick={() => setHeadrests(toggle(headrests, n))}>
              {n} HDR
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-text-tertiary">
          Armrest
        </p>
        <div className="flex flex-wrap gap-2">
          {ARMREST_OPTIONS.map((a) => (
            <Chip key={a} active={armrests.includes(a)} onClick={() => setArmrests(toggle(armrests, a))}>
              {a === "Arm" ? "Armrest" : "No armrest"}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={save}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            dirty && !saving
              ? "bg-[var(--brand)] text-white hover:opacity-90"
              : "cursor-not-allowed bg-surface-2 text-text-tertiary"
          )}
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5" /> : null}
          {saved ? "Saved" : "Save"}
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="text-xs font-medium text-text-tertiary hover:text-text-primary"
        >
          Allow all (clear)
        </button>
        <span className="text-[11px] text-text-tertiary">
          Nothing ticked = every spec allowed.
        </span>
      </div>
    </div>
  );
}

function summarize(gen: Gen): string {
  const parts: string[] = [];
  const st = gen.allowedSeatTypes ?? [];
  const hr = gen.allowedHeadrests ?? [];
  const ar = gen.allowedArmrests ?? [];
  if (st.length) parts.push(st.map((s) => (s === "Single Back" ? "SB" : s === "Double Back" ? "DB" : s)).join("/"));
  if (hr.length) parts.push([...hr].sort((a, b) => a - b).map((n) => `${n}HDR`).join("/"));
  if (ar.length === 1) parts.push(ar[0] === "Arm" ? "Arm only" : "No arm only");
  return parts.length ? parts.join(" · ") : "All specs allowed";
}

export function VariantRulesTree({ models, brands = [], query = "" }: { models: any[]; brands?: Array<{ id: string; name: string }>; query?: string }) {
  const router = useRouter();
  const [openBrands, setOpenBrands] = useState<Set<string>>(new Set());
  const [openModels, setOpenModels] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  // Inline add state
  const [newBrand, setNewBrand] = useState("");
  const [modelFor, setModelFor] = useState<string | null>(null); // brandId
  const [newModel, setNewModel] = useState("");
  const [genFor, setGenFor] = useState<string | null>(null); // modelId
  const [newGen, setNewGen] = useState("");

  // Every brand (even ones with no models yet), each with its models.
  const tree = useMemo(() => {
    const byId = new Map<string, { id: string; name: string; models: any[] }>();
    for (const b of brands) byId.set(b.id, { id: b.id, name: b.name, models: [] });
    for (const m of models) {
      const bid = m.brand?.id ?? m.brandId;
      const bname = m.brand?.name ?? "—";
      if (!byId.has(bid)) byId.set(bid, { id: bid, name: bname, models: [] });
      byId.get(bid)!.models.push(m);
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [models, brands]);

  const q = query.trim().toLowerCase();
  const matchModel = (m: any) => !q || (m.name ?? "").toLowerCase().includes(q);
  const matchBrand = (name: string) => !q || name.toLowerCase().includes(q);

  const toggle = (set: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) =>
    set((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const run = async (fn: () => Promise<any>, after?: () => void) => {
    setBusy(true);
    try {
      const res: any = await fn();
      if (res?.error) { toast.error(res.error); return; }
      after?.();
      router.refresh();
    } finally { setBusy(false); }
  };

  const createBrand = () => { const n = newBrand.trim(); if (n) run(() => addBrand(n), () => setNewBrand("")); };
  const createModel = (brandId: string) => { const n = newModel.trim(); if (n) run(() => addModel(brandId, n), () => { setNewModel(""); setModelFor(null); setOpenBrands((p) => new Set(p).add(brandId)); }); };
  const createGen = (modelId: string) => { const n = newGen.trim(); if (n) run(() => addVehicleGeneration(modelId, n), () => { setNewGen(""); setGenFor(null); setOpenModels((p) => new Set(p).add(modelId)); }); };
  const delBrand = async (id: string, name: string) => { if (await confirmDialog({ title: `Delete brand "${name}" and its models?`, variant: "danger", confirmLabel: "Delete" })) run(() => removeBrand(id)); };
  const delModel = async (id: string, name: string) => { if (await confirmDialog({ title: `Delete model "${name}"?`, variant: "danger", confirmLabel: "Delete" })) run(() => removeModel(id)); };
  const delGen = async (id: string, name: string) => { if (await confirmDialog({ title: `Delete generation "${name}"?`, variant: "danger", confirmLabel: "Delete" })) run(() => removeVehicleGeneration(id)); };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-text-primary">Vehicles</h2>
        <p className="mt-0.5 text-xs text-text-tertiary">
          Add a brand, then models, then generations (year ranges). Expand a generation to curate the
          specs (bench type, headrests, armrest) offered in variant search — fabrics and designs stay open for all.
        </p>
        {/* Add brand (top of the tree) */}
        <div className="mt-2.5 flex max-w-md items-center gap-2">
          <Input value={newBrand} onChange={(e) => setNewBrand(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") createBrand(); }}
            placeholder="New brand — e.g. Maruti, Hyundai" className="h-9 text-sm" />
          <Button onClick={createBrand} disabled={busy || !newBrand.trim()} className="h-9 shrink-0 gap-1.5 text-xs">
            <Plus className="h-4 w-4" /> Brand
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tree.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-text-tertiary">No brands yet. Add one above to start.</p>
        ) : tree.map(({ id: brandId, name: brand, models: bms }) => {
          const shown = bms.filter(matchModel);
          if (q && shown.length === 0 && !matchBrand(brand)) return null;
          const brandOpen = openBrands.has(brandId) || !!q;
          return (
            <div key={brandId} className="border-b border-border/60">
              <div className="flex items-center gap-1 bg-surface-2 px-3 py-2">
                <button type="button" onClick={() => toggle(setOpenBrands, brandId)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  {brandOpen ? <ChevronDown className="h-3.5 w-3.5 text-text-tertiary" /> : <ChevronRight className="h-3.5 w-3.5 text-text-tertiary" />}
                  <span className="truncate text-[11px] font-bold uppercase tracking-[0.15em] text-text-secondary">{brand}</span>
                  <span className="text-[10px] text-text-tertiary">{bms.length}</span>
                </button>
                <button onClick={() => { setModelFor(modelFor === brandId ? null : brandId); setNewModel(""); setOpenBrands((p) => new Set(p).add(brandId)); }}
                  className="rounded-lg px-2 py-1 text-[11px] font-semibold text-text-secondary hover:bg-surface hover:text-[var(--brand)]">+ Model</button>
                <button onClick={() => delBrand(brandId, brand)} title="Delete brand" className="rounded-lg p-1 text-text-tertiary hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>

              {brandOpen && (
                <>
                  {modelFor === brandId && (
                    <div className="flex items-center gap-2 px-4 py-2">
                      <Input autoFocus value={newModel} onChange={(e) => setNewModel(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") createModel(brandId); if (e.key === "Escape") setModelFor(null); }}
                        placeholder="New model — e.g. Swift" className="h-8 text-xs" />
                      <Button onClick={() => createModel(brandId)} disabled={busy || !newModel.trim()} className="h-8 shrink-0 text-[11px]">Add</Button>
                    </div>
                  )}
                  {shown.length === 0 && modelFor !== brandId && (
                    <p className="px-4 py-2 text-xs text-text-tertiary">No models — use “+ Model”.</p>
                  )}
                  {shown.map((m: any) => {
                    const gens: Gen[] = m.generations ?? [];
                    const isOpen = openModels.has(m.id) || !!q;
                    return (
                      <div key={m.id} className="border-t border-border/40">
                        <div className="flex items-center gap-1 px-4 py-2.5 hover:bg-surface-2/50">
                          <button type="button" onClick={() => toggle(setOpenModels, m.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                            {isOpen ? <ChevronDown className="h-4 w-4 text-text-tertiary" /> : <ChevronRight className="h-4 w-4 text-text-tertiary" />}
                            <Car className="h-4 w-4 text-text-tertiary" />
                            <span className="truncate text-sm font-semibold text-text-primary">{m.name}</span>
                            <span className="text-[11px] text-text-tertiary">{gens.length} generation{gens.length === 1 ? "" : "s"}</span>
                          </button>
                          <button onClick={() => { setGenFor(genFor === m.id ? null : m.id); setNewGen(""); setOpenModels((p) => new Set(p).add(m.id)); }}
                            className="rounded-lg px-2 py-0.5 text-[10px] font-semibold text-text-tertiary hover:text-[var(--brand)]">+ Gen</button>
                          <button onClick={() => delModel(m.id, m.name)} title="Delete model" className="rounded p-0.5 text-text-tertiary hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>

                        {isOpen && (
                          <div className="pb-1 pl-6">
                            {genFor === m.id && (
                              <div className="flex items-center gap-2 px-4 py-2">
                                <Input autoFocus value={newGen} onChange={(e) => setNewGen(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") createGen(m.id); if (e.key === "Escape") setGenFor(null); }}
                                  placeholder="Year range — e.g. 2015-2022" className="h-8 text-xs" />
                                <Button onClick={() => createGen(m.id)} disabled={busy || !newGen.trim()} className="h-8 shrink-0 text-[11px]">Add</Button>
                              </div>
                            )}
                            {gens.length === 0 && genFor !== m.id && (
                              <p className="px-4 py-2 text-xs text-text-tertiary">No generations — use “+ Gen”.</p>
                            )}
                            {gens.map((g) => (
                              <details key={g.id} className="border-l border-border/60">
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2 hover:bg-surface-2/50">
                                  <span className="truncate text-sm font-medium text-text-primary">{g.name}</span>
                                  <span className="flex shrink-0 items-center gap-2">
                                    <span className="text-[11px] font-medium text-text-tertiary">{summarize(g)}</span>
                                    <button type="button" onClick={(e) => { e.preventDefault(); delGen(g.id, g.name); }} title="Delete generation" className="rounded p-0.5 text-text-tertiary hover:text-danger"><Trash2 className="h-3 w-3" /></button>
                                  </span>
                                </summary>
                                <GenerationEditor gen={g} />
                              </details>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
