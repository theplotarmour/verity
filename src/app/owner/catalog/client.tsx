"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink, Search } from "lucide-react";

import { PageHeader } from "@/components/design/PageHeader";
import { Surface } from "@/components/design/Surface";
import { Sheet } from "@/components/design/Sheet";
import { Button, Input, TextArea, EmptyState } from "@/components/ui/primitives";
import { formatPaise } from "@/lib/money";
import { type CatalogRow, updateCatalogItem } from "@/server/actions/catalog";

/**
 * Prices are typed in rupees and stored in paise.
 *
 * The owner thinks in rupees and the database stores paise, so the conversion
 * happens once, here, at the edge. Parsing with a rounded multiply rather than
 * accumulating floats: `12.35` becomes 1235, not 1234.9999999999998.
 */
const toPaise = (rupees: string): number => {
  const n = Number.parseFloat(rupees.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.max(0, Math.round(n * 100)) : 0;
};
const toRupees = (paise: number): string => (paise / 100).toFixed(2);

export function CatalogClient({
  items,
  canManage,
  portalSlug,
}: {
  items: CatalogRow[];
  canManage: boolean;
  portalSlug: string | null;
}) {
  const [rows, setRows] = useState<CatalogRow[]>(items);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<CatalogRow | null>(null);
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [published, setPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return rows;
    return rows.filter((r) => {
      const hay = `${r.name} ${r.sku} ${r.itemCode ?? ""} ${r.categoryName ?? ""}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [rows, query]);

  const publishedCount = rows.filter((r) => r.isPublished).length;

  function open(row: CatalogRow) {
    setEditing(row);
    setPrice(toRupees(row.pricePaise));
    setDescription(row.description ?? "");
    setImageUrl(row.imageUrl ?? "");
    setPublished(row.isPublished);
    setError(null);
  }

  function save() {
    if (!editing) return;
    const payload = {
      id: editing.id,
      pricePaise: toPaise(price),
      description,
      imageUrl,
      isPublished: published,
    };
    startTransition(async () => {
      const result = await updateCatalogItem(payload);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setRows((prev) =>
        prev.map((r) =>
          r.id === payload.id
            ? {
                ...r,
                pricePaise: payload.pricePaise,
                isPublished: payload.isPublished,
                description: payload.description.trim() || null,
                imageUrl: payload.imageUrl.trim() || null,
              }
            : r,
        ),
      );
      setEditing(null);
    });
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader
        title="Catalogue"
        description={`${publishedCount} of ${rows.length} items are live on your customer portal`}
        actions={
          portalSlug ? (
            <Link
              href={`/c/${portalSlug}/menu`}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-secondary transition hover:text-text-primary"
            >
              <ExternalLink className="h-4 w-4" />
              View portal
            </Link>
          ) : null
        }
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, code or category…"
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={rows.length === 0 ? "Nothing to sell yet" : "No matches"}
          description={
            rows.length === 0
              ? "Services and finished products you add in Inventory show up here, ready to be priced and published."
              : "No catalogue item matches that search."
          }
        />
      ) : (
        <div className="grid gap-3 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((row) => (
            <Surface key={row.id} className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary">{row.name}</p>
                  <p className="mt-0.5 truncate text-xs text-text-tertiary">
                    {row.itemCode ?? row.sku}
                    {row.categoryName ? ` · ${row.categoryName}` : ""}
                  </p>
                </div>
                <span
                  className={
                    row.isPublished
                      ? "shrink-0 rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success"
                      : "shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-text-tertiary"
                  }
                >
                  {row.isPublished ? "Live" : "Hidden"}
                </span>
              </div>

              <p className="font-mono text-2xl font-semibold tracking-[-0.03em] text-text-primary">
                {formatPaise(row.pricePaise)}
              </p>

              {row.description && (
                <p className="line-clamp-2 text-xs text-text-secondary">{row.description}</p>
              )}

              {canManage && (
                <Button variant="secondary" className="mt-auto w-full" onClick={() => open(row)}>
                  Edit listing
                </Button>
              )}
            </Surface>
          ))}
        </div>
      )}

      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.name ?? "Edit listing"}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-text-tertiary">
              Price (₹)
            </label>
            <Input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-text-tertiary">
              Description
            </label>
            <TextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What a customer sees under the name."
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-text-tertiary">
              Image URL
            </label>
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>

          <label className="flex items-center gap-3 rounded-lg border border-border p-3">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="h-4 w-4 accent-[var(--brand)]"
            />
            <span className="text-sm text-text-secondary">
              Show this item on the customer portal
            </span>
          </label>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
