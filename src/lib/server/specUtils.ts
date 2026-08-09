// Shared spec-value resolution. One place decides how an answered SpecField
// reads as text, and how an item's answers become an ordered label/value list.
//
// This is what makes every surface product-agnostic: a seat cover, a cardboard
// box and a shirt all render the same way — their own fields, their own labels,
// in the group's own column order. No hardcoded keys, no hardcoded labels.

export type SpecDetail = { label: string; value: string };

// The text a single spec answer reads as, whichever slot it is stored in
// (option pick, linked item, boolean, number+unit, or free text).
export function resolveText(v: any): string {
  if (!v) return "";
  if (v.option?.label) return v.option.label;
  if (v.valueItem) return v.valueItem.aliasName || v.valueItem.name || "";
  if (v.valueBool !== null && v.valueBool !== undefined) return v.valueBool ? "Yes" : "No";
  if (v.valueNumber !== null && v.valueNumber !== undefined) return `${v.valueNumber}${v.field?.unitSuffix ?? ""}`;
  return v.valueText ?? "";
}

// Every answered spec column on an item, resolved to { label, value } and
// ordered by the group's own SpecField.sortOrder. Empty answers are dropped.
//
// A referenced item's own answered specs are flattened in one level after it —
// so a Seat Cover that links to a Car surfaces the car's Brand/Model/Generation
// as rows too. Only active where the include loaded valueItem.specValues (see
// orderItemInclude); a no-op otherwise.
//
// The item must be loaded with specValues -> field(name, sortOrder, unitSuffix),
// option(label) and valueItem(name, aliasName[, specValues]).
export function describeSpecDetails(item: any): SpecDetail[] {
  const values: any[] = item?.specValues ?? [];
  const flattened: any[] = [];
  for (const v of [...values].sort((a, b) => (a.field?.sortOrder ?? 0) - (b.field?.sortOrder ?? 0))) {
    flattened.push(v);
    const nested: any[] = v.valueItem?.specValues ?? [];
    for (const n of [...nested].sort((a, b) => (a.field?.sortOrder ?? 0) - (b.field?.sortOrder ?? 0))) {
      flattened.push(n);
    }
  }
  const seen = new Set<string>();
  return flattened
    .map((v) => ({ label: (v.field?.name as string) ?? "", value: resolveText(v) }))
    .filter((d) => {
      if (!d.label || !d.value) return false;
      const k = `${d.label}=${d.value}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}

// Every picture that belongs to an ordered SKU, in the order a person would
// look at them: the product render first, then whatever its referenced specs
// carry (the chosen fabric's swatch, the design's artwork), then any image a
// text field holds. Deduped, because the same swatch is often referenced twice.
//
// Requires the item loaded with orderItemInclude (specValues -> valueItem).
export function collectSpecImages(item: any): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (url: unknown) => {
    if (typeof url !== "string") return;
    const u = url.trim();
    if (!u || seen.has(u)) return;
    // Only real links: a spec field holding "Beige" is not a picture.
    if (!/^https?:\/\//i.test(u)) return;
    seen.add(u);
    out.push(u);
  };

  push(item?.imageUrl);
  for (const v of item?.specValues ?? []) {
    push(v?.valueItem?.imageUrl);
    // A text field can hold an uploaded image URL (IMAGE/FILE spec columns).
    push(v?.valueText);
    for (const nested of v?.valueItem?.specValues ?? []) {
      push(nested?.valueItem?.imageUrl);
      push(nested?.valueText);
    }
  }
  return out;
}
