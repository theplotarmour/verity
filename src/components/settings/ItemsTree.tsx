"use client";

import { useEffect, useMemo, useState } from "react";
import { confirmDialog } from "@/components/ui/dialog-service";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronRight, Plus, Pencil, Loader2, X, Package, FolderTree, Search, ImagePlus, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { Button, Input, Select } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { getItemFormData, createItem, updateItem, uploadItemImage, deleteItem, addItemField, removeItemField } from "@/server/actions/items";
import { addMaterialCategory, addMaterialSubcategory, removeMaterialCategory, removeMaterialSubcategory } from "@/server/actions/masterData";

// The Item Master as a Busy-style tree: Category ▸ Subcategory ▸ Item. Reads and
// writes the same itemMaster rows as the Inventory Items tab, so the two stay in
// sync. The editor drawer captures every field an item carries.

type Category = { id: string; name: string; subcategories: { id: string; name: string }[] };
type Item = any;

type FieldDef = { id: string; name: string };

const emptyForm = () => ({
  id: undefined as string | undefined,
  name: "", itemCode: "", defaultUOM: "PCS", secondaryUOM: "", conversionFactor: "",
  categoryId: "", subcategoryId: "", brand: "", description: "", imageUrl: "",
  aliasName: "", keywords: "", status: "ACTIVE" as "ACTIVE" | "INACTIVE",
  minStockLevel: "0", hsnCode: "", customFields: {} as Record<string, string>,
});
type Form = ReturnType<typeof emptyForm>;

function Field({ label, children, hint, full }: { label: string; children: React.ReactNode; hint?: string; full?: boolean }) {
  return (
    <div className={cn("space-y-1.5", full && "sm:col-span-2")}>
      <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-text-tertiary">{hint}</p>}
    </div>
  );
}

export function ItemsTree({ query = "" }: { query?: string }) {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [fieldDefs, setFieldDefs] = useState<FieldDef[]>([]);
  const [newField, setNewField] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [drawer, setDrawer] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Inline add controls (Busy-style tree: category → subcategory → item).
  const [newCat, setNewCat] = useState("");
  const [subFor, setSubFor] = useState<string | null>(null); // categoryId whose add-subcategory input is open
  const [newSub, setNewSub] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getItemFormData();
      setItems(data.items ?? []);
      setCategories((data.categories ?? []) as Category[]);
      setFieldDefs(((data as any).fieldDefs ?? []) as FieldDef[]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { setMounted(true); void load(); }, []);

  const q = query.trim().toLowerCase();
  const match = (it: Item) => !q || [it.name, it.itemCode, it.sku, it.aliasName, it.brand, ...(it.searchKeywords ?? [])]
    .filter(Boolean).some((s: string) => s.toLowerCase().includes(q));

  // Item index: items for a given (categoryId, subcategoryId|"loose"). Filtered
  // by the search query. Categories/subcategories themselves come from the tree,
  // so empty ones still render (you can add into them).
  const itemsAt = useMemo(() => {
    const map = new Map<string, Item[]>();
    const key = (cat: string | null, sub: string | null) => `${cat ?? "none"}::${sub ?? "loose"}`;
    for (const it of items) {
      if (!match(it)) continue;
      const k = key(it.categoryId ?? null, it.subcategoryId ?? null);
      const list = map.get(k) ?? [];
      list.push(it); map.set(k, list);
    }
    return { get: (cat: string | null, sub: string | null) => map.get(key(cat, sub)) ?? [] };
  }, [items, q]);

  const uncategorised = useMemo(() => items.filter((it) => !it.categoryId && match(it)), [items, q]);

  const toggle = (id: string) =>
    setOpen((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  // --- category / subcategory CRUD (Busy-style inline add) ---
  const createCat = async () => {
    const name = newCat.trim();
    if (!name) return;
    setBusy(true);
    try {
      const res: any = await addMaterialCategory(name);
      if (res?.error) { toast.error(res.error); return; }
      setNewCat("");
      await load();
    } finally { setBusy(false); }
  };
  const createSub = async (categoryId: string) => {
    const name = newSub.trim();
    if (!name) return;
    setBusy(true);
    try {
      const res: any = await addMaterialSubcategory(categoryId, name);
      if (res?.error) { toast.error(res.error); return; }
      setNewSub(""); setSubFor(null);
      setOpen((p) => new Set(p).add(categoryId));
      await load();
    } finally { setBusy(false); }
  };
  const delCat = async (id: string, name: string) => {
    if (!(await confirmDialog({ title: `Delete category "${name}"? Items keep their data but lose this category.`, variant: "danger", confirmLabel: "Delete" }))) return;
    const res: any = await removeMaterialCategory(id);
    if (res?.error) { toast.error(res.error); return; }
    await load();
  };
  const delSub = async (id: string, name: string) => {
    if (!(await confirmDialog({ title: `Delete subcategory "${name}"?`, variant: "danger", confirmLabel: "Delete" }))) return;
    const res: any = await removeMaterialSubcategory(id);
    if (res?.error) { toast.error(res.error); return; }
    await load();
  };

  // Open the item drawer pre-filed with a category/subcategory context.
  const openItemFor = (categoryId = "", subcategoryId = "") =>
    setDrawer({ ...emptyForm(), categoryId, subcategoryId });

  const subsForCat = (catId: string) => categories.find((c) => c.id === catId)?.subcategories ?? [];

  const delItem = async (it: Item) => {
    if (!(await confirmDialog({ title: `Delete item "${it.name}"?`, variant: "danger", confirmLabel: "Delete" }))) return;
    const res: any = await deleteItem(it.id);
    if (res?.error) { toast.error(res.error); return; }
    toast.success("Item deleted");
    await load();
  };
  const openEdit = (it: Item) => {
    const conv = (it.conversions ?? [])[0];
    setDrawer({
      id: it.id, name: it.name ?? "", itemCode: it.itemCode ?? "", defaultUOM: it.defaultUOM ?? "PCS",
      secondaryUOM: it.secondaryUOM ?? "", conversionFactor: conv?.conversionFactor ? String(conv.conversionFactor) : "",
      categoryId: it.categoryId ?? "", subcategoryId: it.subcategoryId ?? "", brand: it.brand ?? "",
      description: it.description ?? "", imageUrl: it.imageUrl ?? "", aliasName: it.aliasName ?? "",
      keywords: (it.searchKeywords ?? []).join(", "), status: it.status ?? "ACTIVE",
      minStockLevel: String(it.minStockLevel ?? 0), hsnCode: it.hsnCode ?? "",
      customFields: (it.customFields ?? {}) as Record<string, string>,
    });
  };

  const addField = async () => {
    const name = newField.trim();
    if (!name) return;
    setBusy(true);
    try {
      const res: any = await addItemField(name);
      if (res?.error) { toast.error(res.error); return; }
      setNewField("");
      await load();
    } finally { setBusy(false); }
  };
  const delField = async (def: FieldDef) => {
    if (!(await confirmDialog({ title: `Remove field "${def.name}" from all items?`, variant: "danger", confirmLabel: "Remove" }))) return;
    const res: any = await removeItemField(def.id);
    if (res?.error) { toast.error(res.error); return; }
    await load();
  };

  const onImage = async (file: File) => {
    setUploading(true);
    try {
      const dataUrl: string = await new Promise((res, rej) => {
        const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file);
      });
      const up: any = await uploadItemImage(dataUrl, file.name, file.type || "image/jpeg", file.size);
      if (up?.error) { toast.error(up.error); return; }
      setDrawer((d) => d ? { ...d, imageUrl: up.url } : d);
    } catch {
      toast.error("Image upload failed");
    } finally { setUploading(false); }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drawer) return;
    if (!drawer.name.trim()) { toast.error("Item name is required"); return; }
    setSaving(true);
    try {
      const payload = {
        id: drawer.id, name: drawer.name, itemCode: drawer.itemCode || undefined,
        defaultUOM: drawer.defaultUOM, secondaryUOM: drawer.secondaryUOM || undefined,
        conversionFactor: drawer.conversionFactor ? Number(drawer.conversionFactor) : null,
        categoryId: drawer.categoryId || null, subcategoryId: drawer.subcategoryId || null,
        brand: drawer.brand || undefined, description: drawer.description || undefined,
        imageUrl: drawer.imageUrl || undefined, aliasName: drawer.aliasName || undefined,
        searchKeywords: drawer.keywords ? drawer.keywords.split(",").map((k) => k.trim()).filter(Boolean) : [],
        status: drawer.status, minStockLevel: Number(drawer.minStockLevel) || 0, hsnCode: drawer.hsnCode || undefined,
        customFields: drawer.customFields ?? {},
      };
      const res: any = drawer.id ? await updateItem(payload) : await createItem(payload);
      if (res?.error) { toast.error(res.error); return; }
      toast.success(drawer.id ? "Item updated" : "Item created");
      setDrawer(null);
      await load();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save item");
    } finally { setSaving(false); }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-text-primary">Items</h2>
        <p className="mt-0.5 text-xs text-text-tertiary">
          Add a category, then a subcategory, then items inside it — the Item Master, synced with Inventory.
        </p>
        {/* Add category (top level of the tree) */}
        <div className="mt-2.5 flex max-w-md items-center gap-2">
          <Input value={newCat} onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void createCat(); }}
            placeholder="New category — e.g. Fabric, Foam, Thread" className="h-9 text-sm" />
          <Button onClick={createCat} disabled={busy || !newCat.trim()} className="h-9 shrink-0 gap-1.5 text-xs">
            <Plus className="h-4 w-4" /> Category
          </Button>
        </div>

        {/* Custom item fields: added here apply to every item's editor. */}
        <div className="mt-3 rounded-xl border border-border/60 bg-surface-2/40 p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">Custom item fields</p>
          <div className="flex flex-wrap items-center gap-2">
            {fieldDefs.map((def) => (
              <span key={def.id} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text-secondary">
                {def.name}
                <button type="button" onClick={() => delField(def)} title="Remove field" className="text-text-tertiary hover:text-danger"><X className="h-3 w-3" /></button>
              </span>
            ))}
            <div className="flex items-center gap-1.5">
              <Input value={newField} onChange={(e) => setNewField(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void addField(); }}
                placeholder="Add field — e.g. xyz" className="h-8 w-40 text-xs" />
              <Button onClick={addField} disabled={busy || !newField.trim()} className="h-8 shrink-0 gap-1 text-[11px]"><Plus className="h-3.5 w-3.5" /> Field</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-text-tertiary"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : categories.length === 0 && uncategorised.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-text-tertiary">No categories yet. Add one above to start.</p>
        ) : (
          <>
            {categories.map((cat) => {
              const catOpen = open.has(cat.id);
              const looseItems = itemsAt.get(cat.id, null);
              const total = looseItems.length + cat.subcategories.reduce((s, sub) => s + itemsAt.get(cat.id, sub.id).length, 0);
              return (
                <div key={cat.id} className="mb-1.5 rounded-xl border border-border/60 bg-surface-2/30">
                  <div className="flex items-center gap-1 px-2 py-2">
                    <button onClick={() => toggle(cat.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                      {catOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-text-tertiary" /> : <ChevronRight className="h-4 w-4 shrink-0 text-text-tertiary" />}
                      <FolderTree className="h-4 w-4 shrink-0 text-[var(--brand)]" />
                      <span className="truncate text-sm font-bold text-text-primary">{cat.name}</span>
                      <span className="shrink-0 text-[11px] text-text-tertiary">{total} item{total === 1 ? "" : "s"}</span>
                    </button>
                    <button onClick={() => { setSubFor(subFor === cat.id ? null : cat.id); setNewSub(""); setOpen((p) => new Set(p).add(cat.id)); }}
                      title="Add subcategory" className="rounded-lg px-2 py-1 text-[11px] font-semibold text-text-secondary hover:bg-surface-2 hover:text-[var(--brand)]">+ Sub</button>
                    <button onClick={() => openItemFor(cat.id, "")} title="Add item" className="rounded-lg px-2 py-1 text-[11px] font-semibold text-text-secondary hover:bg-surface-2 hover:text-[var(--brand)]">+ Item</button>
                    <button onClick={() => delCat(cat.id, cat.name)} title="Delete category" className="rounded-lg p-1 text-text-tertiary hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>

                  {catOpen && (
                    <div className="space-y-1 px-2 pb-2">
                      {subFor === cat.id && (
                        <div className="flex items-center gap-2 px-1 pb-1">
                          <Input autoFocus value={newSub} onChange={(e) => setNewSub(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") void createSub(cat.id); if (e.key === "Escape") setSubFor(null); }}
                            placeholder="New subcategory name" className="h-8 text-xs" />
                          <Button onClick={() => createSub(cat.id)} disabled={busy || !newSub.trim()} className="h-8 shrink-0 text-[11px]">Add</Button>
                        </div>
                      )}

                      {cat.subcategories.map((sub) => {
                        const sk = `${cat.id}:${sub.id}`;
                        const so = open.has(sk);
                        const list = itemsAt.get(cat.id, sub.id);
                        return (
                          <div key={sub.id} className="rounded-lg border border-border/50 bg-surface">
                            <div className="flex items-center gap-1 px-2 py-1.5">
                              <button onClick={() => toggle(sk)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                                {so ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-tertiary" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />}
                                <span className="truncate text-xs font-semibold text-text-secondary">{sub.name}</span>
                                <span className="shrink-0 text-[10px] text-text-tertiary">{list.length}</span>
                              </button>
                              <button onClick={() => openItemFor(cat.id, sub.id)} title="Add item" className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-text-tertiary hover:text-[var(--brand)]">+ Item</button>
                              <button onClick={() => delSub(sub.id, sub.name)} title="Delete subcategory" className="rounded p-0.5 text-text-tertiary hover:text-danger"><Trash2 className="h-3 w-3" /></button>
                            </div>
                            {so && (list.length === 0
                              ? <p className="px-4 pb-2 text-[11px] text-text-tertiary">No items — use “+ Item”.</p>
                              : <ul className="pb-1">{list.map((it) => <ItemRow key={it.id} it={it} onEdit={openEdit} onDelete={delItem} />)}</ul>)}
                          </div>
                        );
                      })}

                      {looseItems.length > 0 && (
                        <ul className="rounded-lg border border-border/40">{looseItems.map((it) => <ItemRow key={it.id} it={it} onEdit={openEdit} onDelete={delItem} />)}</ul>
                      )}
                      {cat.subcategories.length === 0 && looseItems.length === 0 && subFor !== cat.id && (
                        <p className="px-3 py-2 text-[11px] text-text-tertiary">Empty — add a subcategory or an item.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {uncategorised.length > 0 && (
              <div className="mb-1.5 rounded-xl border border-dashed border-border/60 bg-surface-2/20">
                <button onClick={() => toggle("__none__")} className="flex w-full items-center gap-2 px-3 py-2.5 text-left">
                  {open.has("__none__") ? <ChevronDown className="h-4 w-4 text-text-tertiary" /> : <ChevronRight className="h-4 w-4 text-text-tertiary" />}
                  <span className="text-sm font-bold text-text-secondary">Uncategorised</span>
                  <span className="text-[11px] text-text-tertiary">{uncategorised.length}</span>
                </button>
                {open.has("__none__") && <ul className="px-2 pb-2">{uncategorised.map((it) => <ItemRow key={it.id} it={it} onEdit={openEdit} onDelete={delItem} />)}</ul>}
              </div>
            )}
          </>
        )}
      </div>

      {mounted && drawer && createPortal(
        <div className="fixed inset-0 z-[100] flex items-stretch justify-end bg-black/50 backdrop-blur-sm" onMouseDown={() => setDrawer(null)}>
          <form
            onMouseDown={(e) => e.stopPropagation()}
            onSubmit={save}
            className="flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-border bg-background shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand">Item Master</p>
                <h3 className="text-lg font-bold text-text-primary">{drawer.id ? "Edit item" : "New item"}</h3>
              </div>
              <button type="button" onClick={() => setDrawer(null)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-2 text-text-secondary hover:bg-surface" aria-label="Close"><X className="h-4 w-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                <Field label="Item name *" full>
                  <Input value={drawer.name} onChange={(e) => setDrawer({ ...drawer, name: e.target.value })} placeholder="e.g. Heavy Napa" />
                </Field>

                <Field label="Category">
                  <Select value={drawer.categoryId} onChange={(e) => setDrawer({ ...drawer, categoryId: e.target.value, subcategoryId: "" })}>
                    <option value="">Uncategorised</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </Field>
                <Field label="Subcategory">
                  <Select value={drawer.subcategoryId} onChange={(e) => setDrawer({ ...drawer, subcategoryId: e.target.value })} disabled={!drawer.categoryId}>
                    <option value="">None</option>
                    {subsForCat(drawer.categoryId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                </Field>

                <Field label="Primary unit" hint="Base unit of measure">
                  <Input value={drawer.defaultUOM} onChange={(e) => setDrawer({ ...drawer, defaultUOM: e.target.value })} placeholder="PCS" />
                </Field>
                <Field label="Secondary unit">
                  <Input value={drawer.secondaryUOM} onChange={(e) => setDrawer({ ...drawer, secondaryUOM: e.target.value })} placeholder="roll, box…" />
                </Field>

                <Field label="Conversion factor" hint="1 secondary = N primary" full>
                  <Input type="number" value={drawer.conversionFactor} onChange={(e) => setDrawer({ ...drawer, conversionFactor: e.target.value })} placeholder="e.g. 50" />
                </Field>

                <Field label="Brand">
                  <Input value={drawer.brand} onChange={(e) => setDrawer({ ...drawer, brand: e.target.value })} />
                </Field>
                <Field label="Alias name">
                  <Input value={drawer.aliasName} onChange={(e) => setDrawer({ ...drawer, aliasName: e.target.value })} />
                </Field>

                <Field label="HSN code">
                  <Input value={drawer.hsnCode} onChange={(e) => setDrawer({ ...drawer, hsnCode: e.target.value })} placeholder="5407" />
                </Field>
                <Field label="Minimum stock level">
                  <Input type="number" value={drawer.minStockLevel} onChange={(e) => setDrawer({ ...drawer, minStockLevel: e.target.value })} />
                </Field>

                <Field label="Search keywords" hint="Comma-separated" full>
                  <Input value={drawer.keywords} onChange={(e) => setDrawer({ ...drawer, keywords: e.target.value })} placeholder="fabric, napa, premium" />
                </Field>

                <Field label="Description" full>
                  <textarea value={drawer.description} onChange={(e) => setDrawer({ ...drawer, description: e.target.value })} rows={3}
                    className="w-full rounded-[12px] border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none focus:border-[var(--brand)]/70" />
                </Field>

                <Field label="Image" full>
                  <div className="flex items-center gap-4">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-2">
                      {drawer.imageUrl ? <img src={drawer.imageUrl} alt="" className="h-full w-full object-cover" /> : <Package className="h-6 w-6 text-text-tertiary" />}
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                      {drawer.imageUrl ? "Replace" : "Upload"}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void onImage(file); e.target.value = ""; }} />
                    </label>
                    {drawer.imageUrl && <button type="button" onClick={() => setDrawer({ ...drawer, imageUrl: "" })} className="text-xs text-danger hover:underline">Remove</button>}
                  </div>
                </Field>

                <Field label="Status">
                  <Select value={drawer.status} onChange={(e) => setDrawer({ ...drawer, status: e.target.value as any })}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </Select>
                </Field>

                {/* Owner-defined custom fields (apply to every item) */}
                {fieldDefs.map((def) => (
                  <Field key={def.id} label={def.name}>
                    <Input
                      value={drawer.customFields?.[def.id] ?? ""}
                      onChange={(e) => setDrawer({ ...drawer, customFields: { ...drawer.customFields, [def.id]: e.target.value } })}
                    />
                  </Field>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
              <Button type="button" variant="secondary" onClick={() => setDrawer(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}{drawer.id ? "Save item" : "Create item"}</Button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
}

function ItemRow({ it, onEdit, onDelete }: { it: Item; onEdit: (it: Item) => void; onDelete: (it: Item) => void }) {
  return (
    <li className="group flex items-center gap-1 pr-2 hover:bg-surface-2/60">
      <button onClick={() => onEdit(it)} className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-2">
          {it.imageUrl ? <img src={it.imageUrl} alt="" className="h-full w-full object-cover" /> : <Package className="h-3.5 w-3.5 text-text-tertiary" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text-primary">
            {it.name}
            {it.status === "INACTIVE" && <span className="ml-2 text-[10px] font-semibold uppercase text-text-tertiary">Inactive</span>}
          </p>
          <p className="truncate text-[11px] text-text-tertiary">
            {it.itemCode ?? it.sku}{it.brand ? ` · ${it.brand}` : ""} · {it.defaultUOM}{it.secondaryUOM ? ` / ${it.secondaryUOM}` : ""}
          </p>
        </div>
        <Pencil className="h-3.5 w-3.5 shrink-0 text-text-tertiary opacity-0 group-hover:opacity-100" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(it)}
        title="Delete item"
        className="shrink-0 rounded-lg p-1.5 text-text-tertiary transition-colors hover:bg-danger/10 hover:text-danger"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}
