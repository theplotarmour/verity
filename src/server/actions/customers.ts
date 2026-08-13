"use server";

import { guardModuleAction, guardModuleWrite } from "@/platform/modules/guard";
import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { revalidatePath } from "next/cache";

// Customer master — a simple master record, NOT a CRM. Dealers are just
// customers tagged "Dealer" (the order carries the Retail/Dealer/OEM/Internal
// type). No pipeline, no activities, no follow-ups.

export type CustomerInput = {
  name: string;
  companyName?: string;
  phone?: string;
  altPhone?: string;
  email?: string;
  gstNumber?: string;
  billingAddress?: string;
  shippingAddress?: string;
  notes?: string;
  tags?: string[];
  assignedSalesperson?: string;
  creditLimit?: number;
  paymentTerms?: string;
};

// Next customer code for the factory: CUST-0001, mirroring the item-code
// generator so codes stay stable and gap-free-ish.
async function nextCustomerCode(factoryId: string) {
  const rows = await prisma.customer.findMany({
    where: { factoryId, customerCode: { startsWith: "CUST-" } },
    select: { customerCode: true },
  });
  const max = rows.reduce((m, r) => {
    const n = parseInt((r.customerCode ?? "").split("-")[1] ?? "0", 10);
    return Number.isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return `CUST-${String(max + 1).padStart(4, "0")}`;
}

export async function listCustomers(search?: string, tag?: string) {
  await guardModuleAction("sales");
  const owner = await getOwnerUser();
  if (!owner) return [];
  const q = (search ?? "").trim();
  const customers = await prisma.customer.findMany({
    where: {
      factoryId: owner.factoryId,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { companyName: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
              { customerCode: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(tag && tag !== "ALL" ? { tags: { has: tag } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { salesOrders: true } } },
  });
  return customers;
}

export async function getCustomer(id: string) {
  await guardModuleAction("sales");
  const owner = await getOwnerUser();
  if (!owner) return null;
  return prisma.customer.findFirst({
    where: { id, factoryId: owner.factoryId },
    include: {
      salesOrders: {
        orderBy: { orderDate: "desc" },
        select: {
          id: true, soNumber: true, status: true, orderType: true, orderDate: true,
          totalAmount: true, vehicleBrand: { select: { name: true } }, vehicleModel: { select: { name: true } },
        },
      },
    },
  });
}

export async function createCustomer(input: CustomerInput) {
  await guardModuleWrite("sales");
  const owner = await getOwnerUser();
  if (!owner) return { error: "Unauthorized" };
  if (!input.name?.trim()) return { error: "Customer name is required." };
  try {
    const customer = await prisma.customer.create({
      data: {
        factoryId: owner.factoryId,
        customerCode: await nextCustomerCode(owner.factoryId),
        name: input.name.trim(),
        companyName: input.companyName?.trim() || null,
        phone: input.phone?.trim() || null,
        altPhone: input.altPhone?.trim() || null,
        email: input.email?.trim() || null,
        gstNumber: input.gstNumber?.trim() || null,
        billingAddress: input.billingAddress?.trim() || null,
        shippingAddress: input.shippingAddress?.trim() || null,
        notes: input.notes?.trim() || null,
        tags: (input.tags ?? []).filter(Boolean),
        assignedSalesperson: input.assignedSalesperson?.trim() || null,
        creditLimit: input.creditLimit ?? 0,
        paymentTerms: input.paymentTerms?.trim() || null,
      },
    });
    revalidatePath("/owner/customers");
    return { success: true, id: customer.id };
  } catch (e) {
    console.error("createCustomer failed:", e);
    return { error: "Failed to create customer." };
  }
}

export async function updateCustomer(id: string, input: CustomerInput) {
  await guardModuleWrite("sales");
  const owner = await getOwnerUser();
  if (!owner) return { error: "Unauthorized" };
  const existing = await prisma.customer.findFirst({ where: { id, factoryId: owner.factoryId }, select: { id: true } });
  if (!existing) return { error: "Customer not found." };
  if (!input.name?.trim()) return { error: "Customer name is required." };
  try {
    await prisma.customer.update({
      where: { id },
      data: {
        name: input.name.trim(),
        companyName: input.companyName?.trim() || null,
        phone: input.phone?.trim() || null,
        altPhone: input.altPhone?.trim() || null,
        email: input.email?.trim() || null,
        gstNumber: input.gstNumber?.trim() || null,
        billingAddress: input.billingAddress?.trim() || null,
        shippingAddress: input.shippingAddress?.trim() || null,
        notes: input.notes?.trim() || null,
        tags: (input.tags ?? []).filter(Boolean),
        assignedSalesperson: input.assignedSalesperson?.trim() || null,
        creditLimit: input.creditLimit ?? 0,
        paymentTerms: input.paymentTerms?.trim() || null,
      },
    });
    revalidatePath("/owner/customers");
    revalidatePath(`/owner/customers/${id}`);
    return { success: true };
  } catch (e) {
    console.error("updateCustomer failed:", e);
    return { error: "Failed to update customer." };
  }
}

// A customer with orders is never hard-deleted (it would orphan production
// history). Deletion is only allowed when the customer has no orders.
export async function deleteCustomer(id: string) {
  await guardModuleWrite("sales");
  const owner = await getOwnerUser();
  if (!owner) return { error: "Unauthorized" };
  const customer = await prisma.customer.findFirst({
    where: { id, factoryId: owner.factoryId },
    include: { _count: { select: { salesOrders: true } } },
  });
  if (!customer) return { error: "Customer not found." };
  if (customer._count.salesOrders > 0) {
    return { error: "This customer has orders and can't be deleted." };
  }
  await prisma.customer.delete({ where: { id } });
  revalidatePath("/owner/customers");
  return { success: true };
}

/**
 * Bulk import a customer directory from CSV.
 *
 * Matched on customerCode when given, else on name, so re-importing a corrected
 * sheet updates the existing rows instead of doubling the book. Blank cells are
 * left alone rather than wiping what is already there — a partial sheet is the
 * normal case when someone exports, edits one column and sends it back.
 */
export async function importCustomersCsv(rows: Array<Record<string, string>>) {
  await guardModuleAction("sales");
  const owner = await getOwnerUser();
  if (!owner) return { error: "Unauthorized" };
  const factoryId = owner.factoryId;

  const get = (row: Record<string, string>, ...keys: string[]) => {
    for (const k of keys) {
      const v = row[k] ?? row[k.toLowerCase()] ?? row[k.toUpperCase()];
      if (v && String(v).trim()) return String(v).trim();
    }
    return "";
  };

  let created = 0;
  let updated = 0;
  const failures: string[] = [];

  for (const row of rows) {
    const name = get(row, "Name", "Customer", "customerName");
    const code = get(row, "Code", "Customer Code", "customerCode");
    if (!name && !code) continue;

    const data: Record<string, unknown> = {};
    const set = (key: string, value: string) => {
      if (value) data[key] = value;
    };
    set("companyName", get(row, "Company", "companyName"));
    set("phone", get(row, "Phone", "phone"));
    set("altPhone", get(row, "Alternate Phone", "Alt Phone", "altPhone"));
    set("email", get(row, "Email", "email"));
    set("gstNumber", get(row, "GST", "GST Number", "gstNumber"));
    set("billingAddress", get(row, "Billing Address", "billingAddress"));
    set("shippingAddress", get(row, "Shipping Address", "shippingAddress"));
    set("notes", get(row, "Notes", "notes"));
    set("paymentTerms", get(row, "Payment Terms", "paymentTerms"));
    const tags = get(row, "Tags", "tags");
    if (tags) {
      data.tags = tags.split(/[,|]/).map((t) => t.trim().toUpperCase()).filter(Boolean);
    }

    try {
      const existing = await prisma.customer.findFirst({
        where: {
          factoryId,
          ...(code ? { customerCode: code } : { name: { equals: name, mode: "insensitive" } }),
        },
        select: { id: true },
      });

      if (existing) {
        await prisma.customer.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await prisma.customer.create({
          data: { factoryId, name: name || code, ...(code ? { customerCode: code } : {}), ...data },
        });
        created++;
      }
    } catch (err: unknown) {
      failures.push(`${name || code}: ${err instanceof Error ? err.message : "failed"}`);
    }
  }

  revalidatePath("/owner/customers");
  return { created, updated, failures };
}
