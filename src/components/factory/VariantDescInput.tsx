"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatVariant,
  productHasSeatSpecs,
  SEAT_TYPES,
  HEADREST_COUNTS,
  type VariantDescriptor,
} from "@/lib/variant-descriptor";

// A staged builder for one production variant:
//   {Brand} {Model} {Generation} {Product} {Specs} {Fabric} {Design}
//
// The user assembles it one stage at a time. First the dropdown offers the
// vehicle+product base ("Maruti Baleno 2015-2018 Seat Cover", "... Mats");
// picking one fills it in and the dropdown advances to the next stage — bench
// type, then headrests, then armrest (seat covers only), then fabric, then
// design. Typing filters the CURRENT stage's options; Backspace on an empty
// query steps back a stage. There is no separator syntax to learn.

export type VariantValue = {
  brand: string;
  model: string;
  generation: string;
  product: string;
  seatType: "SB" | "DB" | "";
  headrests: number | null;
  armrest: boolean;
  fabricName: string;
  designName: string;
  colorName: string;
};

export type VariantCatalog = {
  brands: string[];
  models: Array<{ brand: string; name: string; generations: string[] }>;
  products: string[];
};

type Stage = "base" | "seatType" | "headrests" | "armrest" | "fabric" | "designFamily" | "design" | "color";

export type DesignOption = { name: string; family: string; label: string };

// Per Model+Generation spec constraints, keyed by `brand|||model|||generation`.
// Empty arrays / null = no restriction (every spec allowed). The owner curates
// these in Master Data so nonsense combos (e.g. "Alto 7HDR") never generate.
export type SpecConstraint = { seatTypes: ("SB" | "DB")[]; headrests: number[]; armrests: ("Arm" | "No Arm")[] };
export const specKey = (brand: string, model: string, generation: string) =>
  `${brand}|||${model}|||${generation}`;

// One confirmed pick: the text shown for it, plus the descriptor fields it set,
// so a pick can be undone by dropping it and rebuilding from what remains.
type Segment = { stage: Stage; label: string; patch: Partial<VariantDescriptor> };

type Option = { label: string; patch: Partial<VariantDescriptor> };

// The stages still to come, given what's been picked so far. Specs only apply to
// seat covers, so steering covers and mats skip straight from product to fabric.
// Design is chosen by family first (ULTRA, PRO SERIES...) then design when the
// designs carry families.
function stagesFor(
  product: string | undefined,
  opts: { hasFamilies: boolean; hasFabrics: boolean; hasDesigns: boolean; hasColors: boolean }
): Stage[] {
  const s: Stage[] = ["base"];
  if (product && productHasSeatSpecs(product)) s.push("seatType", "headrests", "armrest");
  // Skip dimensions with no catalogue data yet, so a vehicles-only factory can
  // still assemble (and complete) a vehicle base instead of getting stuck on an
  // empty fabric/design dropdown.
  if (opts.hasFabrics) s.push("fabric");
  if (opts.hasDesigns) {
    if (opts.hasFamilies) s.push("designFamily");
    s.push("design");
  }
  // Colour is the last stage: it feeds the colour field lower in the popup.
  if (opts.hasColors) s.push("color");
  return s;
}

const tokenize = (q: string) => q.toLowerCase().split(/\s+/).map((t) => t.trim()).filter(Boolean);
const matchesAll = (label: string, q: string) => {
  const toks = tokenize(q);
  const hay = label.toLowerCase();
  return toks.every((t) => hay.includes(t));
};

function toDescriptor(v: VariantValue): Partial<VariantDescriptor> {
  const seatSpecs = productHasSeatSpecs(v.product);
  return {
    brand: v.brand,
    model: v.model,
    generation: v.generation,
    product: v.product,
    seatType: seatSpecs && v.seatType ? v.seatType : null,
    headrests: seatSpecs ? v.headrests : null,
    armrest: seatSpecs ? v.armrest : false,
    fabric: v.fabricName,
    design: v.designName,
    color: v.colorName || null,
  };
}

function toValue(d: Partial<VariantDescriptor>): VariantValue {
  return {
    brand: d.brand ?? "",
    model: d.model ?? "",
    generation: d.generation ?? "",
    product: d.product ?? "",
    seatType: d.seatType ?? "",
    headrests: d.headrests ?? null,
    armrest: !!d.armrest,
    fabricName: d.fabric ?? "",
    designName: d.design ?? "",
    colorName: d.color ?? "",
  };
}

// Rebuild the segment list from a value handed in by the parent, so an external
// edit (Section 3/4) or a pre-filled draft shows as assembled stages.
function segmentsFromValue(v: VariantValue, designs: DesignOption[]): Segment[] {
  const segs: Segment[] = [];
  if (v.brand && v.model && v.product) {
    const patch = { brand: v.brand, model: v.model, generation: v.generation, product: v.product };
    segs.push({ stage: "base", label: formatVariant(patch), patch });
    if (productHasSeatSpecs(v.product)) {
      if (v.seatType) segs.push({ stage: "seatType", label: v.seatType, patch: { seatType: v.seatType } });
      else return segs;
      if (v.headrests) segs.push({ stage: "headrests", label: `${v.headrests}HDR`, patch: { headrests: v.headrests } });
      else return segs;
      segs.push({ stage: "armrest", label: v.armrest ? "Arm" : "No Arm", patch: { armrest: v.armrest } });
    }
    if (v.fabricName) segs.push({ stage: "fabric", label: v.fabricName, patch: { fabric: v.fabricName } });
    else return segs;
    if (v.designName) {
      // Insert the family stage ahead of the design so the assembled stages line
      // up with the family-first flow, and show the design segment without its
      // family prefix (the family is its own segment).
      const match = designs.find((d) => d.label.toLowerCase() === v.designName.toLowerCase());
      const fam = match?.family;
      if (fam) segs.push({ stage: "designFamily", label: fam, patch: {} });
      segs.push({ stage: "design", label: match && fam ? match.name : v.designName, patch: { design: v.designName } });
    }
    if (v.colorName) segs.push({ stage: "color", label: v.colorName, patch: { color: v.colorName } });
  }
  return segs;
}

export function VariantDescInput({
  catalog,
  fabricNames,
  designNames,
  designOptions,
  colorNames,
  specConstraints,
  value,
  onApply,
  className,
  compact = false,
}: {
  combinations?: any[];
  catalog?: VariantCatalog;
  fabricNames: string[];
  designNames: string[];
  designOptions?: DesignOption[];
  colorNames?: string[];
  specConstraints?: Record<string, SpecConstraint>;
  value: VariantValue;
  onApply: (v: VariantValue) => void;
  className?: string;
  compact?: boolean;
}) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Distinct vehicle+product bases, built once from the catalog.
  const bases: Option[] = useMemo(() => {
    const out: Option[] = [];
    const seen = new Set<string>();
    // Fall back to a single empty product so vehicle bases still generate before
    // any products exist (the base then carries no product until section 3 sets one).
    const productList = (catalog?.products?.length ? catalog.products : [""]);
    for (const m of catalog?.models ?? []) {
      const gens = m.generations.length > 0 ? m.generations : [""];
      for (const g of gens) {
        for (const product of productList) {
          const patch = { brand: m.brand, model: m.name, generation: g, product };
          const label = formatVariant(patch);
          if (seen.has(label)) continue;
          seen.add(label);
          out.push({ label, patch });
        }
      }
    }
    return out;
  }, [catalog]);

  // Designs, and their distinct families, from the richer designOptions prop when
  // present (falls back to the flat designNames list when it isn't).
  const designs: DesignOption[] = useMemo(
    () => designOptions ?? (designNames ?? []).filter(Boolean).map((d) => ({ name: d, family: "", label: d })),
    [designOptions, designNames]
  );
  const families = useMemo(
    () => [...new Set(designs.map((d) => d.family).filter(Boolean))].sort(),
    [designs]
  );
  const hasFamilies = families.length > 0;
  const hasFabrics = (fabricNames?.filter(Boolean).length ?? 0) > 0;
  const hasDesigns = designs.length > 0;
  const colorList = useMemo(() => (colorNames ?? []).filter(Boolean), [colorNames]);
  const hasColors = colorList.length > 0;
  const stageOpts = { hasFamilies, hasFabrics, hasDesigns, hasColors };

  const descriptor = useMemo(
    () => segments.reduce<Partial<VariantDescriptor>>((acc, s) => ({ ...acc, ...s.patch }), {}),
    [segments]
  );
  // Spec constraints for the base the user picked, if any are configured for
  // that Model+Generation. Undefined = curate nothing = every spec allowed.
  const activeConstraint: SpecConstraint | undefined = useMemo(() => {
    if (!specConstraints || !descriptor.brand || !descriptor.model) return undefined;
    return specConstraints[specKey(descriptor.brand, descriptor.model, descriptor.generation ?? "")];
  }, [specConstraints, descriptor.brand, descriptor.model, descriptor.generation]);

  // The design family the user picked, if any — used to narrow the design stage.
  const pickedFamily = segments.find((s) => s.stage === "designFamily")?.label ?? "";
  const stages = useMemo(() => stagesFor(descriptor.product, stageOpts), [descriptor.product, hasFamilies, hasFabrics, hasDesigns, hasColors]);
  const currentStage: Stage | null = segments.length < stages.length ? stages[segments.length] : null;
  const complete = currentStage === null;

  // The options for whatever stage we're on now, filtered by the current query.
  const options: Option[] = useMemo(() => {
    if (!currentStage) return [];
    let opts: Option[] = [];
    switch (currentStage) {
      case "base":
        opts = bases;
        break;
      case "seatType": {
        const allow = activeConstraint?.seatTypes ?? [];
        opts = SEAT_TYPES.filter((s) => allow.length === 0 || allow.includes(s)).map((s) => ({
          label: s,
          patch: { seatType: s },
        }));
        break;
      }
      case "headrests": {
        const allow = activeConstraint?.headrests ?? [];
        opts = HEADREST_COUNTS.filter((n) => allow.length === 0 || allow.includes(n)).map((n) => ({
          label: `${n}HDR`,
          patch: { headrests: n },
        }));
        break;
      }
      case "armrest": {
        const allow = activeConstraint?.armrests ?? [];
        opts = [
          { label: "Arm", patch: { armrest: true } },
          { label: "No Arm", patch: { armrest: false } },
        ].filter((o) => allow.length === 0 || allow.includes(o.label as "Arm" | "No Arm"));
        break;
      }
      case "fabric":
        opts = (fabricNames ?? []).filter(Boolean).map((f) => ({ label: f, patch: { fabric: f } }));
        break;
      case "designFamily":
        opts = families.map((f) => ({ label: f, patch: {} }));
        break;
      case "design":
        // Only the designs inside the family the user just chose (or all of
        // them when designs have no families).
        // When a family segment already precedes this stage, show the bare
        // design name (the family is its own segment) so the assembled text
        // reads "ERGO FIT Archer", not "ERGO FIT ERGO FIT Archer". The stored
        // descriptor keeps the full label for downstream consistency.
        opts = designs
          .filter((d) => !pickedFamily || d.family === pickedFamily)
          .map((d) => ({ label: hasFamilies && d.family ? d.name : d.label, patch: { design: d.label } }));
        break;
      case "color":
        opts = colorList.map((c) => ({ label: c, patch: { color: c } }));
        break;
    }
    const q = query.trim();
    const filtered = q ? opts.filter((o) => matchesAll(o.label, q)) : opts;
    return filtered.slice(0, 60);
  }, [currentStage, bases, fabricNames, designs, families, pickedFamily, query, activeConstraint, colorList]);

  const committedText = segments.map((s) => s.label).join(" ");
  const displayText = committedText + (committedText && !complete ? " " : "") + (complete ? "" : query);

  const stageHint: Record<Stage, string> = {
    base: "brand / model / generation / product",
    seatType: "bench type — SB or DB",
    headrests: "headrest count",
    armrest: "armrest",
    fabric: "fabric",
    designFamily: "design family",
    design: "design",
    color: "colour",
  };

  const notFound = focused && query.trim().length > 0 && options.length === 0 && !complete;

  useEffect(() => setHighlight(0), [query, segments.length]);

  useEffect(() => {
    const onAway = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", onAway);
    return () => document.removeEventListener("mousedown", onAway);
  }, []);

  // Reflect an external change (parent value) while the user isn't building. This
  // keeps the box in step when Section 3/4 is edited, and seeds a pre-filled draft.
  // Colour is not part of formatVariant, so include it explicitly or an external
  // colour change wouldn't re-sync the assembled segments.
  const valueSig = useMemo(() => formatVariant(toDescriptor(value)) + "|" + (value.colorName ?? ""), [value]);
  const lastSyncRef = useRef<string>("__init__");
  useEffect(() => {
    if (focused || open) return;
    if (valueSig === lastSyncRef.current) return;
    lastSyncRef.current = valueSig;
    // Only overwrite when it actually differs from what we already show.
    const mine = segments.map((s) => s.label).join(" ");
    if (valueSig !== mine) {
      setSegments(segmentsFromValue(value, designs));
      setQuery("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueSig, focused, open]);

  const applyIfComplete = (segs: Segment[]) => {
    const stgs = stagesFor(segs.reduce<Partial<VariantDescriptor>>((a, s) => ({ ...a, ...s.patch }), {}).product, stageOpts);
    if (segs.length === stgs.length) {
      const d = segs.reduce<Partial<VariantDescriptor>>((a, s) => ({ ...a, ...s.patch }), {});
      onApply(toValue(d));
    }
  };

  const select = (opt: Option) => {
    if (!currentStage) return;
    const segs = [...segments, { stage: currentStage, label: opt.label, patch: opt.patch }];
    setSegments(segs);
    setQuery("");
    setHighlight(0);
    // Partial apply as we go, so Section 3/4 tracks the build; full apply at the end.
    onApply(toValue(segs.reduce<Partial<VariantDescriptor>>((a, s) => ({ ...a, ...s.patch }), {})));
    applyIfComplete(segs);
    setOpen(true);
  };

  const back = () => {
    if (segments.length === 0) return;
    const segs = segments.slice(0, -1);
    setSegments(segs);
    setQuery("");
    onApply(toValue(segs.reduce<Partial<VariantDescriptor>>((a, s) => ({ ...a, ...s.patch }), {})));
  };

  const reset = () => {
    setSegments([]);
    setQuery("");
    setOpen(true);
    onApply(toValue({}));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (open && options[highlight]) {
        e.preventDefault();
        select(options[highlight]);
      }
    } else if (e.key === "Backspace" && query === "" && segments.length > 0) {
      e.preventDefault();
      back();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      {!compact && (
        <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">
          Variant Search
        </label>
      )}
      <div className={cn("relative", !compact && "mt-1")}>
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-tertiary">
          <Search className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </span>
        <input
          type="text"
          value={displayText}
          placeholder={segments.length === 0 ? "Search brand, model, product — e.g. baleno seat" : ""}
          onChange={(e) => {
            const v = e.target.value;
            const prefix = committedText + (committedText ? " " : "");
            if (v.startsWith(prefix)) {
              setQuery(v.slice(prefix.length));
            } else if (v.length < prefix.length) {
              // Edited into the committed part — drop back to plain editing.
              setSegments([]);
              setQuery(v);
              onApply(toValue({}));
            } else {
              setQuery(v);
            }
            setOpen(true);
          }}
          onFocus={() => {
            setFocused(true);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          className={cn(
            "w-full rounded-xl border bg-surface text-text-primary font-semibold",
            "focus:outline-none focus:ring-1 focus:ring-[var(--brand)]",
            compact ? "h-8 pl-9 pr-8 text-[11px]" : "h-11 pl-10 pr-9 text-sm",
            notFound ? "border-danger/60" : "border-border"
          )}
        />
        {(complete || segments.length > 0) && (
          <button
            type="button"
            onClick={reset}
            title="Clear"
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-tertiary hover:text-text-primary"
          >
            {complete ? <Check className="h-4 w-4 text-success" /> : <span className="text-xs font-bold">×</span>}
          </button>
        )}
      </div>

      {notFound && (
        <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-danger">
          <AlertCircle className="h-3 w-3 shrink-0" />
          No {currentStage ? stageHint[currentStage] : ""} matches “{query}”.
        </p>
      )}

      {open && !complete && options.length > 0 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          <div className="border-b border-border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
            {currentStage ? `Pick ${stageHint[currentStage]}` : ""}
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {options.map((o, i) => (
              <li key={o.label}>
                <button
                  type="button"
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => select(o)}
                  className={cn(
                    "block w-full px-3 py-2 text-left text-xs transition-colors cursor-pointer",
                    i === highlight ? "bg-[var(--brand)] text-white" : "text-text-primary hover:bg-surface-2"
                  )}
                >
                  {o.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
