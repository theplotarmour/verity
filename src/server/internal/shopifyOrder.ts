import type { IngestOrderInput, IngestLine } from "./orderIngest";

/**
 * Shopify's `orders/create` payload, mapped onto Verity's ingest shape.
 *
 * Kept separate from the route so it can be tested against real payload shapes
 * without a request, a database or a signature — which is what actually gets
 * this right. Shopify's payload is large, inconsistently populated, and the
 * fields that matter for manufacturing are not the ones in the documented
 * examples.
 */

/** The subset we read. Everything is optional because Shopify means it. */
interface ShopifyOrder {
  id?: number | string;
  name?: string;
  order_number?: number;
  note?: string | null;
  customer?: {
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
  } | null;
  shipping_address?: { phone?: string | null; name?: string | null } | null;
  billing_address?: { phone?: string | null; name?: string | null } | null;
  phone?: string | null;
  line_items?: ShopifyLineItem[];
  note_attributes?: { name?: string; value?: string }[];
}

interface ShopifyLineItem {
  sku?: string | null;
  title?: string | null;
  variant_title?: string | null;
  quantity?: number;
  price?: string | number | null;
  properties?: { name?: string; value?: string }[] | null;
}

/**
 * Custom values arrive in two different places depending on how the storefront
 * was built: `properties` on a line item (the product customiser pattern) and
 * `note_attributes` on the order (the cart-attributes pattern). Both are
 * name/value pairs, so both are read and line properties win — they are more
 * specific to what is being made.
 */
function attributes(order: ShopifyOrder, line?: ShopifyLineItem): Map<string, string> {
  const map = new Map<string, string>();
  for (const attr of order.note_attributes ?? []) {
    if (attr?.name && attr.value) map.set(attr.name.trim().toLowerCase(), String(attr.value).trim());
  }
  for (const prop of line?.properties ?? []) {
    if (prop?.name && prop.value) map.set(prop.name.trim().toLowerCase(), String(prop.value).trim());
  }
  return map;
}

/**
 * Read the first attribute matching any of these names.
 *
 * Storefronts label the same field a dozen ways — "Fabric", "Material",
 * "fabric_choice". Matching a list of aliases is the difference between an
 * order arriving with its spec and one arriving blank, and a blank spec is a
 * job card nobody can work.
 */
function pick(attrs: Map<string, string>, ...names: string[]): string | null {
  for (const name of names) {
    const found = attrs.get(name.toLowerCase());
    if (found) return found;
  }
  // Fall back to a contains-match, so "Seat fabric" still answers "fabric".
  for (const [key, value] of attrs) {
    if (names.some((name) => key.includes(name.toLowerCase()))) return value;
  }
  return null;
}

function customerName(order: ShopifyOrder): string {
  const first = order.customer?.first_name?.trim() ?? "";
  const last = order.customer?.last_name?.trim() ?? "";
  const full = `${first} ${last}`.trim();
  if (full) return full;

  const fromAddress =
    order.shipping_address?.name?.trim() || order.billing_address?.name?.trim() || "";
  if (fromAddress) return fromAddress;

  // An order with no name at all is still an order. Naming it after the
  // Shopify order number keeps it identifiable rather than refusing it.
  return order.name?.trim() || `Shopify order ${order.order_number ?? order.id ?? ""}`.trim();
}

export function mapShopifyOrder(payload: unknown): IngestOrderInput | { error: string } {
  if (!payload || typeof payload !== "object") return { error: "Body is not an object." };
  const order = payload as ShopifyOrder;

  const items = order.line_items ?? [];
  if (items.length === 0) return { error: "Order has no line items." };

  const lines: IngestLine[] = [];
  for (const item of items) {
    const quantity = Number(item?.quantity ?? 0);
    // Shopify sends refunded and removed lines with quantity 0; those are not
    // work, and booking them produces a job card for nothing.
    if (!Number.isFinite(quantity) || quantity <= 0) continue;

    lines.push({
      quantity: Math.floor(quantity),
      // SKU first — it is the thing most likely to match an item master.
      // Falling back to the variant title, then the product title.
      sku: item.sku?.trim() || item.variant_title?.trim() || item.title?.trim() || null,
      unitPrice: item.price === null || item.price === undefined ? null : Number(item.price) || null,
    });
  }

  if (lines.length === 0) return { error: "Every line item had zero quantity." };

  const orderAttrs = attributes(order);
  const firstLineAttrs = attributes(order, items[0]);

  return {
    // Shopify's own id, so a duplicate is visible to a human and the outbound
    // webhook can quote it back to the storefront.
    externalId: order.id ? String(order.id) : (order.name ?? null),
    customer: {
      name: customerName(order),
      phone:
        order.customer?.phone?.trim() ||
        order.shipping_address?.phone?.trim() ||
        order.phone?.trim() ||
        null,
    },
    // Everything from a storefront is a retail sale unless the operation says
    // otherwise; a dealer portal posts with its own key and can set this.
    orderType: "RETAIL",
    remarks: order.note?.trim() || null,
    vehicle: {
      brand: pick(firstLineAttrs, "vehicle brand", "brand", "make"),
      model: pick(firstLineAttrs, "vehicle model", "model", "car"),
      year: pick(firstLineAttrs, "year", "vehicle year"),
    },
    spec: {
      material: pick(firstLineAttrs, "fabric", "material"),
      design: pick(firstLineAttrs, "design", "pattern", "stitching"),
      colour: pick(firstLineAttrs, "colour", "color"),
      seatType: pick(firstLineAttrs, "seat type", "seat"),
      hasArmrest: (() => {
        const value = pick(firstLineAttrs, "armrest");
        if (!value) return null;
        return /^(yes|true|1|with)/i.test(value);
      })(),
      headrestCount: (() => {
        const value = pick(firstLineAttrs, "headrest", "headrests");
        if (!value) return null;
        const n = parseInt(value.replace(/\D/g, ""), 10);
        return Number.isFinite(n) ? n : null;
      })(),
    },
    // Order-level attributes are the fallback for a storefront that puts
    // everything in the cart rather than on the line.
    expectedDeliveryDate: pick(orderAttrs, "delivery date", "expected delivery") ?? null,
    lines,
  };
}
