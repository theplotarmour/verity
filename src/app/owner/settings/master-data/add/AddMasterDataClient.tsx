"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { NamePreviewBar } from "@/components/spec/NamePreviewBar";
import { SpecFieldInput, type SpecFieldShape } from "@/components/spec/SpecFieldInput";
import { SpecCombobox } from "@/components/spec/SpecCombobox";
import { VariantGrid } from "@/components/spec/VariantGrid";
import { VariantBomModal, type BomTweak } from "@/components/spec/VariantBomModal";
import { fetchResolvedFields, fetchReferenceOptions } from "@/server/actions/spec";
import {
  previewSpecName,
  createItemFromSpec,
  previewSpecVariants,
  previewInheritedBom,
  createItemsFromSpecBatch,
  type VariantPreview,
} from "@/server/actions/itemsFromSpec";
import type { MultiSelection } from "@/lib/spec/combinations";
import { UOM_SUGGESTIONS } from "@/lib/item-constants";
import { normaliseUnits } from "@/lib/item-units";
import { resolveColumnLabels } from "@/lib/spec/columns";
import { listUsedUnits } from "@/server/actions/itemUnits";
import type { RefOption, SpecAnswer } from "@/lib/spec/types";
import { MASTER_DATA_DOMAINS, MASTER_DATA_DOMAIN_LABELS, type MasterDataDomainId } from "@/lib/master-data/domains";
import { createFieldEntry } from "@/server/actions/fieldEntries";

/**
 * Deliberately carries the alias column's configuration, not just the tree.
 *
 * Configure lets the owner rename the alias column per category and hide it
 * altogether — Warehouse calls it Kind, Supplier calls it Contact person. The
 * grid, the column strip and both halves of CSV all honoured that; this form
 * hardcoded the word "Alias", so renaming it changed every screen except the
 * one where the value is first typed.
 */
type Group = {
  id: string;
  name: string;
  parentId: string | null;
  aliasLabel: string | null;
  aliasHidden: boolean;
  /** Attribute categories (Vehicles, Designs, Colours) are never stocked. */
  hasInventoryUnits?: boolean;
  /** Set in Configure. Decides whether the BOM button appears, and what it writes. */
  bomMode?: "OFF" | "RECIPE" | "INGREDIENTS";
};

function WizardSection({
  step,
  title,
  hint,
  children,
}: {
  step: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-border/60 px-6 py-5">
      <div className="mb-3 flex items-baseline gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-soft text-[10px] font-bold text-[var(--brand)]">{step}</span>
        <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary">{title}</h2>
        {hint && <span className="text-[11px] text-text-tertiary">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

export function AddMasterDataClient({
  groups,
  initialGroupId,
  embedded = false,
  onCancel,
  onSaved,
}: {
  groups: Group[];
  initialGroupId?: string;
  embedded?: boolean;
  onCancel?: () => void;
  onSaved?: (groupId: string) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [domain] = useState<MasterDataDomainId>("INVENTORY");
  const initial = groups.find((g) => g.id === initialGroupId) ?? null;
  const rootOf = (g: Group): Group => {
    let cur = g;
    let guard = groups.length + 1;
    while (cur.parentId && guard-- > 0) cur = groups.find((x) => x.id === cur.parentId) ?? cur;
    return cur;
  };

  const [rootId, setRootId] = useState<string | null>(initial ? rootOf(initial).id : null);
  const [groupId, setGroupId] = useState<string | null>(initialGroupId ?? null);
  const [fields, setFields] = useState<SpecFieldShape[]>([]);
  const [answers, setAnswers] = useState<Record<string, SpecAnswer>>({});
  const [options, setOptions] = useState<Record<string, RefOption[]>>({});
  /**
   * What every id ever offered actually *is*, keyed by id and never cleared.
   *
   * Deliberately separate from `options` above, which is a display list: that
   * one is filtered as the owner narrows, and emptied outright while a
   * dependent field waits on its parent. A tick survives both, so identity has
   * to be remembered somewhere that does not.
   */
  const [optionMeta, setOptionMeta] = useState<Record<string, RefOption>>({});
  const [preview, setPreview] = useState({ name: "", code: "" });
  const [uom, setUom] = useState("PCS");
  const [secondaryUom, setSecondaryUom] = useState("");
  const [uomFactor, setUomFactor] = useState("");
  const [alias, setAlias] = useState("");
  const [error, setError] = useState<string | null>(null);
  /**
   * Units this factory already uses, merged with the common ones.
   *
   * The row expander's editor did this and the wizard did not, so a unit the
   * owner invented on one item was missing from the list the next time he
   * created one — and the list was closed, so he could not type it either.
   */
  const [usedUnits, setUsedUnits] = useState<string[]>([]);
  useEffect(() => {
    listUsedUnits().then(setUsedUnits).catch(() => {});
  }, []);

  const unitOptions = useMemo(
    () =>
      [...new Set([...usedUnits, ...UOM_SUGGESTIONS])].map((u) => ({
        id: u,
        label: u,
        sublabel: null,
        searchText: u.toLowerCase(),
      })),
    [usedUnits]
  );

  /**
   * Take a unit the owner typed rather than picked.
   *
   * It has to join the options list, not just the state: the picker renders its
   * selection by looking the id up in `options`, so a unit that exists only in
   * state would leave the box looking empty right after he typed it.
   */
  const takeNewUnit = (entered: string) => {
    const unit = entered.trim().toUpperCase();
    if (unit) setUsedUnits((prev) => (prev.includes(unit) ? prev : [...prev, unit]));
    return unit;
  };

  /**
   * Ids ticked per field. Every option and reference field holds an array, so
   * there is no mode to switch: one tick is one item, a second tick starts
   * describing variants. The grid below shows exactly what that will create,
   * which is what makes the extra configuration step unnecessary.
   */
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  /**
   * Answers that differ per generated row, keyed row -> field.
   *
   * Ten variants that each need their own CAD file used to mean saving ten
   * items and then editing ten rows in the grid. They are filled in beside the
   * row they belong to instead.
   */
  const [overrides, setOverrides] = useState<Record<string, Record<string, SpecAnswer>>>({});
  // What the SKU will inherit from its specs — shown, never edited here: a run
  // can mint forty variants, and one grid cannot honestly represent forty
  // recipes. Tweaking lives on the item's own page.
  const [inheritedBom, setInheritedBom] = useState<{ name: string; quantity: number; uom: string; source: string }[]>([]);
  // Per-variant BOM edits, keyed by the preview row key. Held here until the
  // batch runs, because both an override and a contribution need the item id
  // creation mints.
  const [bomTweaks, setBomTweaks] = useState<Record<string, BomTweak[]>>({});
  const [bomRowKey, setBomRowKey] = useState<string | null>(null);
  // The same edits for a single-item run, where there is no row to key them by.
  // One design still needs its ingredients, and asking the owner to save it and
  // then reopen it to add them is a step that exists only because of how the
  // state is stored.
  const [singleBomEdits, setSingleBomEdits] = useState<BomTweak[]>([]);
  const [singleBomOpen, setSingleBomOpen] = useState(false);
  const [variants, setVariants] = useState<VariantPreview | null>(null);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [batchNote, setBatchNote] = useState<string | null>(null);

  /** Only a closed set of values can be crossed; free text has nothing to cross. */
  const canGoMulti = (f: SpecFieldShape) => f.kind === "OPTION" || f.kind === "REFERENCE";

  // A free-text VALUE field typed as "a, b, c" describes several variants, the
  // same gesture as a second tick on an option. Numeric fields are excluded:
  // their input only ever holds one parsed number, so a comma cannot survive.
  // Only free text can be split into several variants. An uploaded image, a
  // file, a date or a colour swatch cannot — and the comma hint was rendering
  // under the Product Image upload box, where it means nothing.
  const isTextValueField = (f: SpecFieldShape) =>
    f.kind === "VALUE" &&
    !["NUMBER", "MEASUREMENT", "TOGGLE", "CHECKBOX", "IMAGE", "FILE", "DATE", "COLOR"].includes(
      f.valueType ?? ""
    );
  const splitCsv = (s: string | null | undefined): string[] => {
    if (!s) return [];
    return [...new Set(s.split(",").map((v) => v.trim()).filter(Boolean))];
  };
  const valueMultiKeys = fields
    .filter((f) => isTextValueField(f) && splitCsv(answers[f.key]?.valueText).length > 1)
    .map((f) => f.key);

  // A field with two or more ticks — or a value field carrying several
  // comma-separated entries — is a variant axis. Anything with one value is
  // simply an answer, and joins the fixed part of the spec.
  const pickedAxisKeys = Object.entries(picked)
    .filter(([, ids]) => ids.length > 1)
    .map(([key]) => key);
  const varyingKeys = [...pickedAxisKeys, ...valueMultiKeys];
  const isMulti = varyingKeys.length > 0;

  /**
   * What the spec currently says, for naming and for the fixed part of a
   * variant set: the typed answers, plus every field settled on one value.
   * A field with two ticks is deliberately absent — it is an axis, not an answer.
   */
  const effectiveAnswers = (): Record<string, SpecAnswer> => {
    const out: Record<string, SpecAnswer> = { ...answers };
    for (const [key, ids] of Object.entries(picked)) {
      const field = fields.find((f) => f.key === key);
      if (field && ids.length === 1) out[key] = answerFor(field, ids[0]);
    }
    // A comma-separated value field is an axis, not one answer — leave it out of
    // the fixed spec so its values expand into rows instead of printing "a, b, c"
    // verbatim into a single name.
    for (const key of valueMultiKeys) delete out[key];
    return out;
  };

  /** Turn a ticked id back into the answer shape its field stores. */
  const answerFor = (field: SpecFieldShape, id: string): SpecAnswer => {
    if (field.kind === "OPTION") return { optionId: id };
    // A column-picking reference can resolve to any of three things, and an
    // option id and an item id are both opaque strings — so the option itself
    // says which slot it belongs in. Guessing here would file every brand as a
    // link to a nonexistent item.
    if (field.targetFieldId) {
      // Read from the identity map, never from the visible list. The list is
      // emptied on purpose whenever a dependent field's parent is unanswered,
      // so a ticked model outlives the options it came from — and looking it up
      // there wrote the raw id into the database as if it were the text the
      // owner typed.
      const opt = optionMeta[id];
      if (opt?.kind === "option") return { optionId: id };
      if (opt?.kind === "item") return { valueItemId: id };
      // Still unknown: say what it is rather than guessing a slot. The server
      // knows whether this id is an option, an item or genuinely just text.
      return opt ? { valueText: opt.label } : { refKey: id };
    }
    return field.refTarget === "ITEM_GROUP" ? { valueItemId: id } : { valueRefId: id };
  };

  const optionsFor = (field: SpecFieldShape): RefOption[] =>
    field.kind === "OPTION"
      ? field.options.map((o) => ({
          id: o.id,
          label: o.label,
          sublabel: o.shortCode,
          searchText: [o.label, o.shortCode].filter(Boolean).join(" ").toLowerCase(),
          kind: "option",
        }))
      : options[field.key] ?? [];

  const mergeOptions = (existing: RefOption[], incoming: RefOption[]) => {
    const byId = new Map<string, RefOption>();
    for (const option of existing) byId.set(option.id, option);
    for (const option of incoming) byId.set(option.id, { ...byId.get(option.id), ...option });
    return [...byId.values()];
  };

  /**
   * Store what the owner typed into a dropdown as a new entry on that field,
   * then select it — so a fabric that does not exist yet is never a dead end.
   */
  function createEntry(field: SpecFieldShape, text: string) {
    setError(null);
    const parent = fields.find((f) => f.id === field.dependsOnFieldId);
    const parentPicked = parent ? picked[parent.key] ?? [] : [];
    const parentValue = parent
      ? parentPicked.length === 1
        ? parentPicked[0]
        : answers[parent.key]?.valueRefId ?? answers[parent.key]?.valueItemId ?? undefined
      : undefined;

    start(async () => {
      const result = await createFieldEntry(field.id, text, parentValue ?? undefined, columnFilters(field));
      if ("error" in result) {
        setError(result.error);
        return;
      }
      const { option } = result;
      setOptionMeta((m) => ({ ...m, [option.id]: option }));

      if (field.kind === "OPTION") {
        setFields((fs) =>
          fs.map((f) =>
            f.id === field.id
              ? {
                  ...f,
                  options: mergeOptions(
                    f.options.map((o) => ({
                      id: o.id,
                      label: o.label,
                      sublabel: o.shortCode,
                      searchText: [o.label, o.shortCode].filter(Boolean).join(" ").toLowerCase(),
                      kind: "option" as const,
                    })),
                    [option]
                  ).map((o) => ({ id: o.id, label: o.label, shortCode: o.sublabel }))
                }
              : f
          )
        );
      } else {
        setOptions((o) => ({ ...o, [field.key]: mergeOptions(o[field.key] ?? [], [option]) }));
      }

      // Tick it straight away, so the thing just created is the thing selected.
      if (canGoMulti(field)) {
        setPicked((v) => ({ ...v, [field.key]: [...(v[field.key] ?? []), option.id] }));
      } else {
        setAnswers((a) => ({ ...a, [field.key]: answerFor(field, option.id) }));
      }
    });
  }

  const roots = groups.filter((g) => !g.parentId);

  /**
   * The subcategory rows to show: the root's children, then the children of
   * whichever of those is on the path to the current selection, and so on.
   *
   * A row appears only when its parent has children, so the form grows one step
   * at a time rather than showing empty levels. Capped by the group count so a
   * cycle terminates rather than hanging.
   */
  const subcategoryLevels = useMemo(() => {
    if (!rootId) return [];
    const byId = new Map(groups.map((g) => [g.id, g]));

    // Root-first path down to the selected group.
    const path: string[] = [];
    let cursor = groupId ? byId.get(groupId) : undefined;
    let guard = groups.length + 1;
    while (cursor && guard-- > 0) {
      path.unshift(cursor.id);
      cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
    }

    const levels: { parent: Group; options: Group[]; selectedId: string | null }[] = [];
    let parent = byId.get(rootId);
    let depth = groups.length + 1;
    while (parent && depth-- > 0) {
      const options = groups.filter((g) => g.parentId === parent!.id);
      if (options.length === 0) break;
      // The child on the path to the selection, if any — that is what opens the
      // next row.
      const at = path.indexOf(parent.id);
      const selectedId = at >= 0 && at + 1 < path.length ? path[at + 1] : null;
      levels.push({ parent, options, selectedId });
      parent = selectedId ? byId.get(selectedId) : undefined;
    }
    return levels;
  }, [groups, rootId, groupId]);

  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;
    fetchResolvedFields(groupId).then((f) => {
      if (cancelled) return;
      setFields(f as SpecFieldShape[]);
      setAnswers({});
      setPicked({});
      setVariants(null);
      setExcluded(new Set());
      // Per-row answers are keyed by a hash of the row's spec, so any left over
      // from the previous category could never match — but they would sit in
      // memory growing for the length of the session.
      setOverrides({});
      setBomTweaks({});
      setSingleBomEdits([]);
      setBatchNote(null);
    });
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  /**
   * What the sibling columns pointing at the same category have already been
   * answered, as target field id -> chosen key.
   *
   * Brand, Model and Generation on a Seat Cover all link to Vehicle > Car and
   * each show a different column of it. Read on their own they are three
   * independent lists, so Swift would appear under Tata; the target's rows are
   * what say which combinations are real, and this is what lets the server
   * consult them. A column settled on several values is deliberately left out —
   * it is describing variants, so nothing below it can be narrowed yet.
   */
  const columnFilters = (field: SpecFieldShape): Record<string, string> => {
    if (!field.targetFieldId) return {};
    const out: Record<string, string> = {};
    for (const sibling of fields) {
      if (sibling.id === field.id || !sibling.targetFieldId) continue;
      if (sibling.targetGroupId !== field.targetGroupId) continue;
      const ids = picked[sibling.key] ?? [];
      const chosen =
        ids.length === 1
          ? ids[0]
          : answers[sibling.key]?.optionId ??
            answers[sibling.key]?.valueItemId ??
            answers[sibling.key]?.valueText ??
            null;
      if (chosen) out[sibling.targetFieldId] = chosen;
    }
    return out;
  };

  /**
   * Widen one field's list for what the owner has typed.
   *
   * Merged rather than replaced, so a value picked earlier survives a search
   * that would not have returned it — the form reads its own answer back out of
   * this list, and a narrowed list must not make a chosen fabric disappear.
   */
  const searchField = (field: SpecFieldShape, query: string) => {
    // Guarded here too: an empty query means "everything", and merging
    // everything back in is exactly what narrowing exists to prevent.
    if (!query.trim()) return;
    const parent = fields.find((f) => f.id === field.dependsOnFieldId);
    const parentPicked = parent ? picked[parent.key] ?? [] : [];
    const parentValue =
      parentPicked.length === 1
        ? parentPicked[0]
        : parent
          ? answers[parent.key]?.valueRefId ?? answers[parent.key]?.valueItemId ?? undefined
          : undefined;
    if (field.dependsOnFieldId && !parentValue) return;

    fetchReferenceOptions(field.id, parentValue ?? undefined, columnFilters(field), query)
      .then((opts) => {
        setOptions((o) => ({ ...o, [field.key]: mergeOptions(o[field.key] ?? [], opts) }));
        setOptionMeta((m) => {
          const next = { ...m };
          for (const o of opts) next[o.id] = o;
          return next;
        });
      })
      .catch(() => {});
  };

  useEffect(() => {
    let cancelled = false;
    for (const field of fields) {
      if (field.kind !== "REFERENCE") continue;
      const parent = fields.find((f) => f.id === field.dependsOnFieldId);
      // A parent narrowed to one value filters its children; a parent still
      // holding several cannot, so the child stays unfiltered rather than empty.
      const parentPicked = parent ? picked[parent.key] ?? [] : [];
      const parentValue =
        parentPicked.length === 1
          ? parentPicked[0]
          : parent
            ? answers[parent.key]?.valueRefId ?? answers[parent.key]?.valueItemId ?? undefined
            : undefined;
      if (field.dependsOnFieldId && !parentValue) {
        setOptions((o) => ({ ...o, [field.key]: [] }));
        continue;
      }
      fetchReferenceOptions(field.id, parentValue ?? undefined, columnFilters(field)).then(
        (opts) => {
          if (cancelled) return;
          setOptions((o) => ({ ...o, [field.key]: mergeOptions(o[field.key] ?? [], opts) }));
          setOptionMeta((m) => {
            const next = { ...m };
            for (const o of opts) next[o.id] = o;
            return next;
          });
        }
      );
    }
    return () => {
      cancelled = true;
    };
  }, [fields, answers, picked]);

  useEffect(() => {
    if (!groupId || domain !== "INVENTORY") return;
    let cancelled = false;
    previewSpecName(groupId, effectiveAnswers()).then((p) => {
      if (!cancelled) setPreview(p);
    });
    return () => {
      cancelled = true;
    };
  }, [groupId, answers, picked, fields, domain]);

  // The components these answers drag in, refreshed as the spec is filled.
  useEffect(() => {
    if (!groupId || domain !== "INVENTORY") { setInheritedBom([]); return; }
    let cancelled = false;
    const timer = setTimeout(() => {
      previewInheritedBom(groupId, effectiveAnswers())
        .then((rows) => { if (!cancelled) setInheritedBom(rows); })
        .catch(() => { if (!cancelled) setInheritedBom([]); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, answers, picked, fields, domain]);

  // Rebuild the combination grid whenever the fixed answers or the ticked
  // values move. Debounced: ticking six fabrics in a row is one preview, not six.
  useEffect(() => {
    if (!groupId || domain !== "INVENTORY" || !isMulti) {
      setVariants(null);
      return;
    }
    const selections: MultiSelection[] = [
      ...pickedAxisKeys.map((key) => {
        const field = fields.find((f) => f.key === key);
        if (!field) return null;
        return { key, answers: (picked[key] ?? []).map((id) => answerFor(field, id)) };
      }),
      ...valueMultiKeys.map((key) => ({
        key,
        answers: splitCsv(answers[key]?.valueText).map((v) => ({ valueText: v })),
      })),
    ].filter((s): s is MultiSelection => s !== null);

    setVariantsLoading(true);
    const timer = setTimeout(() => {
      previewSpecVariants(groupId, effectiveAnswers(), selections)
        .then((p) => {
          setVariants(p);
          // Anything that already exists is off by default; the owner can see it
          // but cannot create it twice.
          if (!p.capped) {
            setExcluded((prev) => {
              const next = new Set(prev);
              for (const r of p.rows) if (r.existingName) next.add(r.key);
              return next;
            });
          }
        })
        .finally(() => setVariantsLoading(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [groupId, domain, isMulti, picked, answers, fields]);

  const includedRows =
    variants && !variants.capped
      ? variants.rows.filter((r) => !r.existingName && !excluded.has(r.key))
      : [];

  function save() {
    if (!groupId || !domain) return;
    setError(null);
    setBatchNote(null);

    // The same check the server runs, so a missing conversion factor is caught
    // beside the field rather than after a round trip — and, in the batch case,
    // before forty rows are attempted one at a time.
    // A category that does not track inventory never showed the units section,
    // so it has nothing to validate — enforcing a conversion factor there would
    // block a save on a field the owner was never asked for.
    const tracksUnits = activeGroup?.hasInventoryUnits !== false;
    const units = normaliseUnits(
      tracksUnits
        ? {
            primaryUOM: uom,
            secondaryUOM: secondaryUom,
            factor: uomFactor ? Number(uomFactor) : null,
          }
        : { primaryUOM: uom || "PCS", secondaryUOM: "", factor: null }
    );
    if (!units.ok) {
      setError(units.error);
      return;
    }

    if (domain === "INVENTORY" && isMulti) {
      start(async () => {
        const result = await createItemsFromSpecBatch({
          groupId: groupId!,
          // The row's own answers win over the shared ones: a per-row cell is
          // the owner saying "this one is different", which is the whole point.
          rows: includedRows.map((r) => ({
            answers: { ...r.answers, ...(overrides[r.key] ?? {}) },
            bomEdits: bomTweaks[r.key] ?? [],
          })),
          defaultUOM: units.units.primaryUOM,
          secondaryUOM: units.units.secondaryUOM,
          uomFactor: units.units.factor,
          aliasName: alias || null,
        });
        if (result.failures.length) {
          // Partial success is the normal outcome of a wide selection. Report
          // what landed before what did not, so the count is never lost.
          setError(
            `${result.created} created. ${result.failures.length} failed: ` +
              result.failures.map((f) => `${f.name} (${f.error})`).join("; ")
          );
          setBatchNote(null);
          return;
        }
        const parts = [`${result.created} item${result.created === 1 ? "" : "s"} created`];
        if (result.skipped) parts.push(`${result.skipped} already existed`);
        setBatchNote(parts.join(" · "));
        if (onSaved) onSaved(groupId!);
        else router.push(`/owner/master-data?group=${groupId}`);
      });
      return;
    }

    start(async () => {
      // One path: every record is an item in a category.
      const result = await createItemFromSpec({
        groupId,
        answers: effectiveAnswers(),
        defaultUOM: units.units.primaryUOM,
        secondaryUOM: units.units.secondaryUOM,
        uomFactor: units.units.factor,
        aliasName: alias || null,
        bomEdits: singleBomEdits,
      });
      if ("error" in result) setError(result.error ?? "Failed to create master data.");
      else if (onSaved) onSaved(groupId);
      else router.push(`/owner/master-data?group=${groupId}`);
    });
  }

  /**
   * Columns the form above left blank, which are therefore free to differ row
   * by row.
   *
   * A field answered once at the top already applies to every row, and a field
   * being varied is what produced the rows — offering either here would ask the
   * same question twice with two possible answers.
   */
  const perRowFields = fields.filter(
    (f) => !answers[f.key] && (picked[f.key] ?? []).length === 0
  );

  const activeRoot = rootId ? groups.find((g) => g.id === rootId) ?? null : null;
  const activeGroup = groupId ? groups.find((g) => g.id === groupId) ?? null : null;

  // Both decided by the category's BOM mode, set in Configure. Recipe means the
  // edits override this SKU's own recipe; Ingredients means they are what the
  // item hands to whatever picks it. Off means there is nothing to edit, so the
  // button does not appear at all.
  const bomMode = activeGroup?.bomMode ?? "OFF";
  const bomEnabled = bomMode !== "OFF";
  const contributesBom = bomMode === "INGREDIENTS";

  // Step numbers count the sections actually on screen. A root with no
  // subcategories skips step 2, and numbering straight past it read as a
  // question the owner had somehow missed.
  const specStep = subcategoryLevels.length > 0 ? 3 : 2;

  // Whatever this category calls the alias column, so the form asks for it by
  // the same word the grid and the CSV headers use.
  const aliasLabel = activeGroup
    ? resolveColumnLabels({ codeLabel: null, nameLabel: null, aliasLabel: activeGroup.aliasLabel }).alias
    : "Alias";

  const chip = (selected: boolean) =>
    `rounded-xl border px-4 py-2.5 text-left text-sm font-bold transition ${
      selected
        ? "border-[var(--brand)] bg-brand-soft text-[var(--brand)]"
        : "border-border bg-surface text-text-primary hover:border-[var(--brand)]/50 hover:bg-surface-secondary/40"
    }`;

  const renderSpecGrid = (emptyName: string, allowMulti = false) => {
    if (fields.length === 0) {
      return <p className="text-sm text-text-secondary">{emptyName} has no fields yet - add some in Configure mode first.</p>;
    }
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
        {fields.map((field) => {
          const parent = fields.find((f) => f.id === field.dependsOnFieldId);
          const parentAnswered = parent
            ? (picked[parent.key] ?? []).length > 0 || Boolean(answers[parent.key])
            : true;
          const blocked = Boolean(field.dependsOnFieldId && parent && !parentAnswered);

          // Every closed-set field can hold several values. Ticking a second one
          // is the whole gesture — there is no mode to turn on first.
          const selectable = allowMulti && canGoMulti(field);
          const ids = picked[field.key] ?? [];
          const csvCount = allowMulti && isTextValueField(field) ? splitCsv(answers[field.key]?.valueText).length : 0;
          const wide = ids.length > 1 || csvCount > 1;

          return (
            <div key={field.id} className={wide ? "col-span-2" : undefined}>
              {selectable ? (
                <>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">
                    {field.name}
                    {field.isRequired && <span className="ml-0.5 text-red-500">*</span>}
                    {ids.length > 1 && (
                      <span className="ml-1 font-bold text-[var(--brand)]">
                        {ids.length} — varies
                      </span>
                    )}
                  </label>
                  <SpecFieldInput
                    field={field}
                    options={options[field.key] ?? []}
                    value={answers[field.key] ?? {}}
                    selectedIds={ids}
                    onSelectIds={(next) => setPicked((v) => ({ ...v, [field.key]: next }))}
                    disabled={blocked}
                    disabledReason={parent ? `Choose ${parent.name} first` : undefined}
                    onChange={() => {}}
                    onCreate={(text) => createEntry(field, text)}
                    onSearch={(q) => searchField(field, q)}
                    hideLabel
                  />
                </>
              ) : (
                <>
                  <SpecFieldInput
                    field={field}
                    options={options[field.key] ?? []}
                    value={answers[field.key] ?? {}}
                    disabled={blocked}
                    disabledReason={parent ? `Choose ${parent.name} first` : undefined}
                    onChange={(next) => setAnswers((a) => ({ ...a, [field.key]: next }))}
                    onCreate={(text) => createEntry(field, text)}
                    onSearch={(q) => searchField(field, q)}
                  />
                  {allowMulti && isTextValueField(field) && (
                    <p className="mt-1 text-[11px] text-text-tertiary">
                      {csvCount > 1 ? (
                        <span className="font-bold text-[var(--brand)]">{csvCount} — varies</span>
                      ) : (
                        "Separate with commas to make several variants."
                      )}
                    </p>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const saveLabel =
    domain === "INVENTORY"
      ? isMulti
        ? `Save ${includedRows.length} item${includedRows.length === 1 ? "" : "s"}`
        : "Save item"
      : domain
        ? `Save ${MASTER_DATA_DOMAIN_LABELS[domain]}`
        : "Save";

  const canSave =
    domain === "INVENTORY"
      ? isMulti
        ? includedRows.length > 0
        : Boolean(preview.name)
      : Boolean(groupId && fields.length);

  return (
    <div className={`flex flex-col ${embedded ? "min-h-0 flex-1" : "h-[calc(100vh-4rem)]"}`}>
      {/* In multi mode the variant grid is the preview — a single composed name
          at the top would only show one of the rows about to be created. */}
      {domain === "INVENTORY" && groupId && !isMulti && (
        <NamePreviewBar name={preview.name} code={preview.code} />
      )}

      <div className="flex-1 overflow-auto">
        {roots.length === 0 && (
          <WizardSection step={1} title="Category">
            <p className="text-sm text-text-secondary">
              No master data categories exist yet. Create a category in Configure mode first.
            </p>
          </WizardSection>
        )}

        {domain === "INVENTORY" && roots.length > 0 && (
          <WizardSection step={1} title="Category">
            <div className="flex flex-wrap gap-2">
              {roots.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    setRootId(g.id);
                    // A root with no subcategories IS the group. Leaving this
                    // null waited for a choice from a row that never renders,
                    // so a freshly created category — the common case for a new
                    // factory — could not be added to at all.
                    const hasChildren = groups.some((c) => c.parentId === g.id);
                    setGroupId(hasChildren ? null : g.id);
                    setFields([]);
                    setAnswers({});
                  }}
                  className={chip(rootId === g.id)}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </WizardSection>
        )}

        {/* Hidden when the root has none, rather than shown empty: an
            "inside Trading Goods" heading with nothing under it reads as a
            step the owner has failed to complete. */}
        {domain === "INVENTORY" && activeRoot && subcategoryLevels.length > 0 && (
          <WizardSection step={2} title="Subcategory" hint={`inside ${activeRoot.name}`}>
            {/* One row per level, revealed as you drill in. The tree is
                recursive and the owner can nest as deep as he likes, but this
                only ever offered the root's direct children — so a third level
                could be created in the studio and never chosen here. */}
            <div className="space-y-2">
              {subcategoryLevels.map((level) => (
                <div key={level.parent.id} className="flex flex-wrap gap-2">
                  {level.options.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGroupId(g.id)}
                      className={chip(groupId === g.id || level.selectedId === g.id)}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </WizardSection>
        )}

        {domain === "INVENTORY" && activeGroup && (
          <WizardSection
            step={specStep}
            title="Specification"
            hint={fields.length ? `${fields.length} field(s) · tick more than one value to build variants` : undefined}
          >
            {/* First field in the section: the short name applies to every
                category, metadata attribute or physical item alike, so it is
                asked before the dynamic spec columns rather than buried under
                them. Single items only — one alias stamped on forty variants
                would break the type-ahead it exists for. */}
            {!isMulti && !activeGroup.aliasHidden && (
              <div className="mb-4 w-48">
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  {aliasLabel} <span className="text-text-tertiary">short name</span>
                </label>
                <input
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="Beige"
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:ring-1 focus:ring-[var(--brand)]"
                />
                <p className="mt-1 text-[11px] text-text-tertiary">Printed into the names of items that reference this one.</p>
              </div>
            )}

            {renderSpecGrid(activeGroup.name, true)}

            {/* What these specs bring with them. In a variant run this stays
                read-only — one panel cannot honestly represent forty recipes, so
                each row carries its own BOM button. A single item has no row to
                hang that on, so the button sits here instead. */}
            {(inheritedBom.length > 0 || !isMulti) && (
              <div className="mt-4 rounded-xl border border-border bg-surface-secondary/40 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-[11px] font-bold text-text-secondary">
                    {inheritedBom.length > 0
                      ? `This configuration inherits ${inheritedBom.length} component${inheritedBom.length === 1 ? "" : "s"}`
                      : contributesBom
                        ? "Nothing set yet — add what one of these consumes"
                        : "Nothing inherited yet"}
                  </p>
                  {!isMulti && bomEnabled && (
                    <button
                      type="button"
                      onClick={() => setSingleBomOpen(true)}
                      className="shrink-0 rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-text-secondary transition hover:border-[var(--brand)]/50 hover:text-[var(--brand)]"
                    >
                      BOM
                      {singleBomEdits.length > 0 && (
                        <span className="ml-1 font-bold text-[var(--brand)]">({singleBomEdits.length})</span>
                      )}
                    </button>
                  )}
                </div>
                {inheritedBom.length > 0 && (
                  <ul className="space-y-1">
                    {inheritedBom.map((l) => (
                      <li key={l.name} className="flex flex-wrap items-baseline gap-x-2 text-xs">
                        <span className="font-semibold text-text-primary">
                          {l.quantity} {l.uom}
                        </span>
                        <span className="text-text-primary">{l.name}</span>
                        <span className="text-[11px] text-text-tertiary">from {l.source}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {isMulti && (
                  <p className="mt-2 text-[11px] text-text-tertiary">
                    Shared by every row. Use BOM on a row to change one variant.
                  </p>
                )}
              </div>
            )}
          </WizardSection>
        )}

        {domain === "INVENTORY" && activeGroup && isMulti && (
          <WizardSection step={specStep + 1} title="Variants" hint="one row per SKU — untick what you don't sell">
            <VariantGrid
              preview={variants}
              loading={variantsLoading}
              excluded={excluded}
              narrowLabel={
                variants?.capped && variants.narrow
                  ? fields.find((f) => f.key === variants.narrow)?.name ?? variants.narrow
                  : null
              }
              onToggle={(key) =>
                setExcluded((prev) => {
                  const next = new Set(prev);
                  if (next.has(key)) next.delete(key);
                  else next.add(key);
                  return next;
                })
              }
              perRowFields={perRowFields}
              overrides={overrides}
              fieldOptions={options}
              onFieldSearch={searchField}
              onTweakBom={bomEnabled ? (rowKey) => setBomRowKey(rowKey) : undefined}
              bomTweakCount={(rowKey) => (bomTweaks[rowKey] ?? []).length}
              onOverride={(rowKey, fieldKey, answer) =>
                setOverrides((prev) => ({
                  ...prev,
                  [rowKey]: { ...(prev[rowKey] ?? {}), [fieldKey]: answer },
                }))
              }
              onSetAll={(keys) => {
                // Rows that already exist stay excluded whatever "tick all" does —
                // they are not creatable, so offering them would only fail on save.
                const stuck = variants && !variants.capped
                  ? variants.rows.filter((r) => r.existingName).map((r) => r.key)
                  : [];
                setExcluded(new Set([...keys, ...stuck]));
              }}
            />
          </WizardSection>
        )}

        {/* Units and conversions only make sense for something the factory
            physically stocks or buys. A category with Track Inventory & Units
            off (Vehicles, Brands, Designs) hides the section entirely. */}
        {domain === "INVENTORY" && activeGroup && activeGroup.hasInventoryUnits !== false && (
          <WizardSection step={specStep + (isMulti ? 2 : 1)} title="Units">
            <div className="flex flex-wrap items-start gap-4">
              <div className="w-32">
                <label className="mb-1 block text-xs font-medium text-text-secondary">Stocked in</label>
                <SpecCombobox
                  options={unitOptions}
                  value={uom}
                  onChange={(id) => setUom(id ?? "PCS")}
                  onCreate={(entered) => setUom(takeNewUnit(entered))}
                  placeholder="PCS"
                />
              </div>

              {/* Fabric arrives as rolls and is issued by the metre. Setting
                  that here rather than only in the row expander means the first
                  goods receipt converts correctly instead of after someone
                  notices stock is fifty times too small. */}
              <div className="w-32">
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Bought in <span className="text-text-tertiary">optional</span>
                </label>
                <SpecCombobox
                  options={unitOptions}
                  value={secondaryUom || null}
                  onChange={(id) => setSecondaryUom(id ?? "")}
                  onCreate={(entered) => setSecondaryUom(takeNewUnit(entered))}
                  placeholder="ROLL"
                />
              </div>

              {secondaryUom && (
                <div className="flex items-end gap-1.5">
                  <div className="w-20">
                    <label className="mb-1 block text-xs font-medium text-text-secondary">Conversion</label>
                    <input
                      inputMode="decimal"
                      value={uomFactor}
                      onChange={(e) => setUomFactor(e.target.value)}
                      placeholder="50"
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:ring-1 focus:ring-[var(--brand)]"
                    />
                  </div>
                  <span className="pb-2.5 text-[11px] text-text-secondary">
                    {uom || "units"} in one {secondaryUom}
                  </span>
                </div>
              )}
            </div>

            {/* Spelled out because it is the one part people get backwards, and
                a wrong factor multiplies every receipt from here on. */}
            {secondaryUom && Number(uomFactor) > 0 && (
              <p className="mt-2 text-[11px] text-text-tertiary">
                Receiving 3 {secondaryUom} will add {3 * Number(uomFactor)} {uom} to stock.
              </p>
            )}
          </WizardSection>
        )}

        {/* One variant's recipe at a time, so a forty-row run stays readable. */}
        {bomRowKey && groupId && variants && !variants.capped && (() => {
          const row = variants.rows.find((r) => r.key === bomRowKey);
          if (!row) return null;
          return (
            <VariantBomModal
              groupId={groupId}
              answers={{ ...row.answers, ...(overrides[row.key] ?? {}) }}
              title={row.name}
              contributes={contributesBom}
              tweaks={bomTweaks[row.key] ?? []}
              onChange={(next) => setBomTweaks((prev) => ({ ...prev, [row.key]: next }))}
              onClose={() => setBomRowKey(null)}
            />
          );
        })()}

        {/* The same modal for a single item. Held in state until save, exactly
            as the row version is — the item has no id to write against yet. */}
        {singleBomOpen && groupId && (
          <VariantBomModal
            groupId={groupId}
            answers={effectiveAnswers()}
            title={preview.name || activeGroup?.name || "This item"}
            contributes={contributesBom}
            tweaks={singleBomEdits}
            onChange={setSingleBomEdits}
            onClose={() => setSingleBomOpen(false)}
          />
        )}

        {error && <p className="px-6 py-4 text-sm text-red-600">{error}</p>}
        {batchNote && <p className="px-6 py-4 text-sm font-bold text-[var(--brand)]">{batchNote}</p>}
      </div>

      {domain && (
        <div className="flex shrink-0 justify-end gap-2 border-t border-border p-4">
          <button type="button" onClick={onCancel ?? (() => router.push("/owner/master-data"))} className="rounded-xl px-4 py-2 text-sm text-text-secondary">
            Cancel
          </button>
          <button onClick={save} disabled={pending || !canSave} className="rounded-xl bg-[var(--brand)] px-6 py-2 text-sm font-bold text-white disabled:opacity-50">
            {pending ? "Saving..." : saveLabel}
          </button>
        </div>
      )}
    </div>
  );
}
