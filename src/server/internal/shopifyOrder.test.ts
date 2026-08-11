import { describe, it, expect } from "vitest";
import { mapShopifyOrder } from "./shopifyOrder";
import { verifyShopifySignature } from "@/lib/api-keys/signing";
import { createHmac } from "node:crypto";

/**
 * Shopify payload mapping.
 *
 * The documented example payload is not what a real customiser sends. The
 * fields that matter for manufacturing — fabric, vehicle, headrest count —
 * live in `properties` or `note_attributes` under whatever name the storefront
 * developer chose, and a mapper that only handles the happy shape produces
 * orders that arrive with no spec at all. A job card with no fabric is not a
 * job anyone can work, so these tests are mostly about the awkward shapes.
 */

const base = {
  id: 5678901234,
  name: "#1001",
  order_number: 1001,
  customer: { first_name: "Anita", last_name: "Desai", phone: "+919876543210" },
  line_items: [{ sku: "SC-BUCKET", title: "Seat Cover", quantity: 2, price: "4500.00" }],
};

function mapped(payload: unknown) {
  const result = mapShopifyOrder(payload);
  if ("error" in result) throw new Error(`expected success, got: ${result.error}`);
  return result;
}

describe("mapShopifyOrder", () => {
  it("maps a plain order", () => {
    const order = mapped(base);
    expect(order.customer.name).toBe("Anita Desai");
    expect(order.lines).toHaveLength(1);
    expect(order.lines[0]).toMatchObject({ quantity: 2, sku: "SC-BUCKET", unitPrice: 4500 });
    expect(order.externalId).toBe("5678901234");
  });

  it("reads custom spec from line item properties", () => {
    // The product-customiser pattern: everything hangs off the line.
    const order = mapped({
      ...base,
      line_items: [
        {
          ...base.line_items[0],
          properties: [
            { name: "Fabric", value: "Nappa Leather" },
            { name: "Colour", value: "Tan" },
            { name: "Vehicle Brand", value: "Toyota" },
            { name: "Vehicle Model", value: "Fortuner" },
            { name: "Headrests", value: "5" },
            { name: "Armrest", value: "Yes" },
          ],
        },
      ],
    });

    expect(order.spec).toMatchObject({
      material: "Nappa Leather",
      colour: "Tan",
      headrestCount: 5,
      hasArmrest: true,
    });
    expect(order.vehicle).toMatchObject({ brand: "Toyota", model: "Fortuner" });
  });

  it("reads spec from order-level note_attributes too", () => {
    // The cart-attributes pattern: the same information, a different place.
    const order = mapped({
      ...base,
      note_attributes: [{ name: "Fabric", value: "Alcantara" }],
    });
    expect(order.spec?.material).toBe("Alcantara");
  });

  it("lets a line property win over an order attribute", () => {
    // The line is more specific to what is actually being made.
    const order = mapped({
      ...base,
      note_attributes: [{ name: "Fabric", value: "Cart Level" }],
      line_items: [{ ...base.line_items[0], properties: [{ name: "Fabric", value: "Line Level" }] }],
    });
    expect(order.spec?.material).toBe("Line Level");
  });

  it("matches attribute names storefronts actually use", () => {
    // "Material" not "Fabric"; "Make" not "Vehicle Brand"; "Car" not "Model".
    const order = mapped({
      ...base,
      line_items: [
        {
          ...base.line_items[0],
          properties: [
            { name: "Material", value: "Vinyl" },
            { name: "Make", value: "Honda" },
            { name: "Car", value: "City" },
          ],
        },
      ],
    });
    expect(order.spec?.material).toBe("Vinyl");
    expect(order.vehicle?.brand).toBe("Honda");
    expect(order.vehicle?.model).toBe("City");
  });

  it("finds an attribute by partial name", () => {
    // "Seat fabric" should still answer the fabric question.
    const order = mapped({
      ...base,
      line_items: [{ ...base.line_items[0], properties: [{ name: "Seat fabric", value: "Suede" }] }],
    });
    expect(order.spec?.material).toBe("Suede");
  });

  it("drops zero-quantity lines, which are refunds and removals", () => {
    // Booking these produces a job card for nothing.
    const order = mapped({
      ...base,
      line_items: [
        { sku: "A", quantity: 0 },
        { sku: "B", quantity: 3 },
      ],
    });
    expect(order.lines).toHaveLength(1);
    expect(order.lines[0].sku).toBe("B");
  });

  it("refuses an order where every line is zero", () => {
    const result = mapShopifyOrder({ ...base, line_items: [{ sku: "A", quantity: 0 }] });
    expect("error" in result).toBe(true);
  });

  it("refuses an order with no line items", () => {
    expect("error" in mapShopifyOrder({ ...base, line_items: [] })).toBe(true);
    expect("error" in mapShopifyOrder({ id: 1 })).toBe(true);
  });

  it("names an order with no customer rather than refusing it", () => {
    // A guest checkout is still a real order.
    const order = mapped({ ...base, customer: null, shipping_address: { name: "R. Sharma" } });
    expect(order.customer.name).toBe("R. Sharma");

    const anonymous = mapped({ ...base, customer: null });
    expect(anonymous.customer.name).toContain("#1001");
  });

  it("falls back through the phone number's three possible homes", () => {
    expect(mapped({ ...base, customer: { first_name: "X" }, phone: "+919000000001" }).customer.phone)
      .toBe("+919000000001");
    expect(
      mapped({
        ...base,
        customer: { first_name: "X" },
        shipping_address: { phone: "+919000000002" },
      }).customer.phone,
    ).toBe("+919000000002");
  });

  it("treats a non-numeric headrest value as unknown, not zero", () => {
    // "Zero headrests" and "we do not know" are different orders.
    const order = mapped({
      ...base,
      line_items: [{ ...base.line_items[0], properties: [{ name: "Headrests", value: "n/a" }] }],
    });
    expect(order.spec?.headrestCount).toBeNull();
  });

  it("reads armrest as a boolean from the words a storefront uses", () => {
    const yes = mapped({
      ...base,
      line_items: [{ ...base.line_items[0], properties: [{ name: "Armrest", value: "With armrest" }] }],
    });
    expect(yes.spec?.hasArmrest).toBe(true);

    const no = mapped({
      ...base,
      line_items: [{ ...base.line_items[0], properties: [{ name: "Armrest", value: "No" }] }],
    });
    expect(no.spec?.hasArmrest).toBe(false);
  });

  it("does not throw on junk", () => {
    expect("error" in mapShopifyOrder(null)).toBe(true);
    expect("error" in mapShopifyOrder("not an object")).toBe(true);
    expect("error" in mapShopifyOrder(42)).toBe(true);
  });
});

describe("verifyShopifySignature", () => {
  const secret = "shpss_" + "a".repeat(32);
  const body = JSON.stringify(base);
  const valid = createHmac("sha256", secret).update(body, "utf8").digest("base64");

  it("accepts Shopify's base64 HMAC", () => {
    expect(verifyShopifySignature({ secret, signature: valid, rawBody: body })).toBe(true);
  });

  it("rejects a body altered after signing", () => {
    const tampered = JSON.stringify({ ...base, line_items: [{ sku: "X", quantity: 999 }] });
    expect(verifyShopifySignature({ secret, signature: valid, rawBody: tampered })).toBe(false);
  });

  it("rejects the wrong secret", () => {
    const other = createHmac("sha256", "different").update(body, "utf8").digest("base64");
    expect(verifyShopifySignature({ secret, signature: other, rawBody: body })).toBe(false);
  });

  it("rejects a hex signature, which is our own format not Shopify's", () => {
    // Guards against someone unifying the two verifiers and breaking this one.
    const hex = createHmac("sha256", secret).update(body, "utf8").digest("hex");
    expect(verifyShopifySignature({ secret, signature: hex, rawBody: body })).toBe(false);
  });

  it("rejects empty input rather than throwing", () => {
    expect(verifyShopifySignature({ secret, signature: "", rawBody: body })).toBe(false);
    expect(verifyShopifySignature({ secret: "", signature: valid, rawBody: body })).toBe(false);
  });
});
