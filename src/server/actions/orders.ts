"use server";

import { guardModuleAction, guardModuleWrite } from "@/platform/modules/guard";
import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { resolveOrderItem } from "./orderItemResolver";
import { itemsInRootCategory } from "@/lib/server/categoryItems";
import { revalidatePath } from "next/cache";

export async function createSalesOrder(customerId: string, items: {
  productVariantId: string; quantity: number; unitPrice: number }[]) {
  const owner = await getOwnerUser();
  if (!owner) return { error: "Unauthorized" };
  await guardModuleWrite("sales");

  try {
    // Generate a simple SO Number
    const count = await prisma.salesOrder.count({ where: { factoryId: owner.factoryId } });
    const soNumber = `SO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const totalAmount = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);

    const order = await prisma.salesOrder.create({
      data: {
        factoryId: owner.factoryId,
        soNumber,
        customerId,
        status: "DRAFT",
        totalAmount,
        items: {
          create: items.map(i => ({
            productVariantId: i.productVariantId,
            quantity: i.quantity,
            unitPrice: i.unitPrice
          }))
        }
      }
    });

    revalidatePath("/owner/production");
    return { success: true, orderId: order.id };
  } catch (error) {
    console.error("Error creating sales order", error);
    return { error: "Failed to create Sales Order" };
  }
}

export async function createCustomer(name: string, companyName?: string, phone?: string) {
  await guardModuleWrite("sales");
  const owner = await getOwnerUser();
  if (!owner) return { error: "Unauthorized" };

  try {
    const customer = await prisma.customer.create({
      data: {
        factoryId: owner.factoryId,
        name,
        companyName,
        phone
      }
    });
    return { success: true, customer };
  } catch (error) {
    return { error: "Failed to create Customer" };
  }
}

export async function approveSalesOrder(orderId: string) {
  await guardModuleAction("sales");
  const owner = await getOwnerUser();
  if (!owner) return { error: "Unauthorized" };
  
  try {
    await prisma.salesOrder.update({
      where: { id: orderId, factoryId: owner.factoryId },
      data: { status: "APPROVED" }
    });
    revalidatePath("/owner/production");
    return { success: true };
  } catch (error) {
    return { error: "Failed to approve Sales Order" };
  }
}

// ==========================================
// Legacy order flow (approved V1 UI), ported onto the
// SalesOrder -> ProductionPlan -> WorkOrder -> JobCard chain.
// ==========================================

import { salesOrderInclude, toLegacyOrder } from "@/lib/server/jobCardAdapter";
import { issueMaterialsForWorkOrder } from "@/server/internal/stockMovements";
import { recordTimeline } from "@/lib/server/stages";
import { ensureFactoryDepartments } from "@/lib/server/departments";
import { resolveOrderTemplate } from "@/lib/server/templates";
import { publishChange } from "@/lib/server/live-bus";

export async function getMasterData() {
  await guardModuleAction("sales");
  const dbUser = await getOwnerUser();
  if (!dbUser) throw new Error("Unauthorized");

  const factoryId = dbUser.factoryId;

  // One parallel batch instead of 14 sequential round-trips (was 150–400 ms of
  // pure serial latency on a remote Postgres before the page could render).
  const [
    brands, models, products, materials,
    designs, colors, workers, inspectors, customers, combinations,
    productTypes, workflowStages, departments,
  ] = await Promise.all([
    Promise.resolve([]),
    Promise.resolve([]),
    // Legacy Product table is retired; the studio searches finished goods
    // directly through searchFinishedGoods.
    Promise.resolve([] as any[]),
    // Only fabrics are directly selectable in the studio. Other raw materials
    // (foam, thread, zips...) are consumed via the BOM, never picked here.
    //
    // Scoped by item *group*, not the legacy MaterialCategory table: that table
    // is empty since the spec engine took over, so this filter was silently
    // returning nothing and the fabric picker rendered blank.
    prisma.itemMaster.findMany({
      where: { factoryId, itemType: "RAW_MATERIAL", status: "ACTIVE", group: { name: "Fabric" } },
      orderBy: { name: 'asc' },
    }),
    Promise.resolve([]),
    // Colours are items in the Colour category now, not rows in their own
    // table. Reading the old table here left the picker blank, exactly as the
    // fabric one was before the comment above.
    itemsInRootCategory(factoryId, "Colour"),
    prisma.user.findMany({ where: { factoryId, role: 'WORKER' } }),
    prisma.user.findMany({ where: { factoryId, role: 'SUPERVISOR' } }),
    prisma.customer.findMany({ where: { factoryId } }),
    // Legacy ProductCombination / ProductType tables are retired: the studio's
    // variant search and the generic spec engine replaced them. Both are empty,
    // and the UI already guards on length, so an empty list changes nothing.
    Promise.resolve([] as any[]),
    Promise.resolve([] as any[]),
    prisma.workflowStage.findMany({
      where: { factoryId },
      orderBy: { sortOrder: 'asc' }
    }),
    // The production chain with each department's roster, so the studio can
    // assign a person per stage (workers per dept; the QC supervisor for QC).
    prisma.department.findMany({
      where: { factoryId, active: true },
      orderBy: { sortOrder: 'asc' },
      include: { members: { select: { id: true, name: true, role: true }, orderBy: { name: 'asc' } } },
    }),
  ]);

  // Finished goods are no longer shipped with this payload: the production
  // studio searches them directly through searchFinishedGoods, so sending the
  // whole catalogue on every page load was several hundred rows nothing read.
  //
  // Producible categories, for the fallback builder's product stage. The old
  // Product and ProductType tables are empty since the spec engine took over,
  // so sourcing the list from them left the builder with no product to pick.
  const finishedGoodGroups = await prisma.itemGroup.findMany({
    where: { factoryId, isProducible: true, parentId: { not: null } },
    select: { name: true },
    orderBy: { name: 'asc' },
  });

  return {
    finishedGoodGroups,
    brands,
    models,
    products,
    materials,
    designs,
    colors,
    workers,
    inspectors,
    customers,
    combinations,
    productTypes,
    workflowStages,
    departments,
  };
}

export async function createOrder(data: {
  /**
   * The customer chosen from the master list. When present the order is booked
   * against exactly that account and no name matching happens at all — which is
   * the point: matching on an exact, case-insensitive name meant "Sharma Motors"
   * and "Sharma Motor" were two customers and neither could be invoiced together.
   *
   * Verified against the caller's factory before use. An id from the client
   * chooses which row an order attaches to, so an unscoped one would let a
   * caller book against another tenant's customer.
   */
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  vehicleBrandId?: string;
  vehicleModelId?: string;
  vehicleYear?: string;
  /**
   * The finished-good ItemMaster being ordered — the master-data path. When
   * given it wins over productVariantId: the item is what production is
   * planned against.
   */
  itemId?: string;
  productVariantId: string;
  quantity: number;
  assignedWorkerId: string;
  inspectorId: string;
  // Per-department assignment: which person works each stage. Keyed by
  // departmentId. QC's entry is the QC supervisor (the quality inspector).
  assignments?: Array<{ departmentId: string; userId: string }>;
  materialId?: string;
  designId?: string;
  colorId?: string;
  productTypeId?: string;
  seatType?: string;
  hasArmrest?: boolean;
  headrestCount?: number;
  remarks?: string;
  photoReference?: string;
  batchLines?: Array<{
    quantity: number;
    vehicleBrandId?: string;
    vehicleModelId?: string;
    vehicleYear?: string;
    productVariantId: string;
    notes?: string;
  }>;
  dynamicFields?: Record<string, string>;
  onOrdered?: boolean;
  orderType?: "RETAIL" | "DEALER" | "OEM" | "INTERNAL";
  expectedDeliveryDate?: string;
  // Partial-stock resolution. Unset on the first attempt: if stock covers only
  // part of the order the call returns a flag and does nothing, so the owner can
  // decide. SPLIT allocates what's in stock and produces the shortfall (batchable,
  // one order id). PRODUCE_ALL ignores stock and produces the full quantity.
  stockDecision?: "SPLIT" | "PRODUCE_ALL";
}) {
  const dbUser = await getOwnerUser();
  if (!dbUser) throw new Error("Unauthorized");
  await guardModuleWrite("sales");
  // Store managers may only book on-ordered (customer) productions.
  if (dbUser.role === "STORE_MANAGER" && !data.onOrdered) {
    return { error: "Store managers can only create on-ordered (customer) productions." };
  }
  const factoryId = dbUser.factoryId;

  // On-Ordered: check for finished stock with the exact same spec first.
  if (data.onOrdered && data.stockDecision !== "PRODUCE_ALL") {
    // A single verified production that covers the whole order: reuse its goods
    // and passport, order goes straight to dispatch.
    const matched = await fulfillFromMatchingStock(factoryId, dbUser.id, data);
    if (matched) return matched;

    // Otherwise see how much matching stock exists. If some (but not enough) is
    // available and the owner hasn't decided yet, flag it rather than guessing.
    const available = await assessOnOrderStock(factoryId, data);
    if (available > 0 && available < data.quantity && !data.stockDecision) {
      return { partialStock: true as const, availableQty: available, requestedQty: data.quantity };
    }
    if (available > 0 && data.stockDecision === "SPLIT") {
      // Allocate what's in stock; the chain below then produces only the shortfall.
      await allocateFinishedStock(factoryId, data, available);
      data = { ...data, quantity: Math.max(1, data.quantity - available), _fulfilledFromStockQty: available } as any;
    }
  }

  // QC checklists are optional: a factory with no template still books orders
  // and generates job cards. The template, if any, is resolved by the ordered
  // item's group inside the transaction. No pre-check blocks creation.

  const orderNumber = `ORD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const result = await prisma.$transaction(async (tx) => {
    // Every production is keyed on the finished-good item. Resolve which item
    // this order produces; Product / ProductVariant are no longer minted. A
    // pre-existing sales variant is honoured on legacy orders but never created.
    let orderedItemId: string | null = null;
    const productVariantId: string | null = data.productVariantId || null;

    if (data.itemId) {
      const chosen = await tx.itemMaster.findFirst({
        where: { id: data.itemId, factoryId },
        select: { id: true },
      });
      if (chosen) orderedItemId = chosen.id;
    }

    // Brands and models were resolved-or-created against bespoke tables here.
    // They are ordinary items in categories the owner builds, so an id given by
    // the caller is used as-is and a name that matches nothing is simply not a
    // vehicle the factory has.
    const brandId = data.vehicleBrandId || null;
    const modelId = data.vehicleModelId || null;

    // A chosen customer is looked up by id and scoped to this factory. findFirst
    // with factoryId rather than findUnique plus a check: an id belonging to
    // another tenant must read as "not found" here, not as a row to reject after
    // it has already been loaded.
    let customer = data.customerId
      ? await tx.customer.findFirst({ where: { id: data.customerId, factoryId } })
      : null;

    // Falls back to the name path when nothing was chosen — a walk-in whose
    // name is not yet on the list must not be a dead end. An id that resolves to
    // nothing falls back too: the alternative is failing an order because a
    // customer was deleted in another tab.
    if (!customer) {
      customer = await tx.customer.findFirst({
        where: { factoryId, name: { equals: data.customerName, mode: 'insensitive' } }
      });
    }

    if (!customer) {
      customer = await tx.customer.create({
        data: { factoryId, name: data.customerName, phone: data.customerPhone }
      });
    } else if (data.customerPhone && !customer.phone) {
      customer = await tx.customer.update({
        where: { id: customer.id },
        data: { phone: data.customerPhone }
      });
    }

    // Sales order — starts in DRAFT; the owner releases drafts to the floor
    // (individually or clubbed into a production batch) from the Drafts tab.
    // Every order resolves to a finished-good item. The studio already collects
    // the full spec, so the item is derived from it rather than asked for again;
    // the same combination sold twice converges on one item.
    if (!orderedItemId) {
      orderedItemId = await resolveOrderItem(factoryId, {
        productTypeId: data.productTypeId ?? null,
        vehicleBrandId: brandId,
        vehicleModelId: modelId,
        materialId: data.materialId ?? null,
        designId: data.designId ?? null,
        colorId: data.colorId ?? null,
        seatType: data.seatType ?? null,
        hasArmrest: data.hasArmrest ?? null,
        headrestCount: data.headrestCount ?? null,
      });
    }

    // Last resort: a bare production with nothing resolvable still needs an item
    // for the blueprint to key on, so mint a backing finished good. No Product
    // or ProductVariant is created.
    if (!orderedItemId) {
      // Prefer a category the owner actually marked producible; fall back to the
      // finished-goods root for factories that have not flagged one.
      const fgGroup =
        (await tx.itemGroup.findFirst({
          where: { factoryId, isProducible: true, parentId: { not: null } },
          select: { id: true },
          orderBy: { sortOrder: "asc" },
        })) ??
        (await tx.itemGroup.findFirst({
          where: { factoryId, itemType: "FINISHED_PRODUCT", parentId: null },
          select: { id: true },
        }));
      const sku = `PROD-STD-${Date.now().toString(36).toUpperCase()}`;
      const backing = await tx.itemMaster.create({
        data: {
          factoryId,
          groupId: fgGroup?.id ?? null,
          itemType: "FINISHED_PRODUCT",
          manufacturingType: "MAKE",
          name: "General Production Standard",
          sku,
          itemCode: sku,
          defaultUOM: "PCS",
        },
      });
      orderedItemId = backing.id;
    }

    // QC checklist resolution, now that the ordered item is known. Optional:
    // prefer the item's category default checklist, then a product-tagged or
    // factory-wide active template. A null template means no QC checkpoints —
    // the QC-stage card is completed manually.
    const orderedGroupId = orderedItemId
      ? (await tx.itemMaster.findUnique({ where: { id: orderedItemId }, select: { groupId: true } }))?.groupId ?? null
      : null;
    // Template resolves off the item's category default now; the legacy
    // product-tagged tier is no longer consulted.
    const template = await resolveOrderTemplate(tx, factoryId, null, orderedGroupId);

    const salesOrder = await tx.salesOrder.create({
      data: {
        factoryId,
        soNumber: orderNumber,
        customerId: customer.id,
        status: 'DRAFT',
        createdById: dbUser.id,
        orderType: data.orderType ?? 'RETAIL',
        expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
        // Production label is minted with the production itself: it is the
        // identity of the physical bag from CAD through to dispatch.
        labelCode: `LBL-${orderNumber.replace(/^SO-?/i, '')}`,
        fulfilledFromStockQty: (data as any)._fulfilledFromStockQty ?? 0,
        itemId: orderedItemId,
        materialId: data.materialId || null,
        designId: data.designId || null,
        colorId: data.colorId || null,
        productTypeId: data.productTypeId || null,
        inspectorId: data.inspectorId || null,
        // Per-order vehicle identity (resolved above). The fitment on the shared
        // variant is kept for compatibility but is no longer the source of truth.
        vehicleBrandId: brandId,
        vehicleModelId: modelId,
        vehicleYear: data.vehicleYear || null,
        seatType: data.seatType || null,
        hasArmrest: data.hasArmrest || false,
        headrestCount: data.headrestCount ?? null,
        remarks: data.remarks || null,
        photoReference: data.photoReference || null,
        dynamicData: data.dynamicFields ?? undefined,
        items: {
          create: (data.batchLines && data.batchLines.length > 0 ? data.batchLines : [{ quantity: data.quantity }]).map((line) => {
            const variantId = (line as any).productVariantId || productVariantId;
            return {
              itemId: orderedItemId,
              // Only carried when a legacy variant already exists; never minted.
              ...(variantId ? { productVariantId: variantId } : {}),
              quantity: line.quantity,
              unitPrice: 0,
            };
          })
        }
      }
    });

    // Self-heal a blueprint + active version for the ordered item if none
    // exists. Blueprints are keyed directly on the finished-good item now.
    const producedItemId = orderedItemId!;
    let blueprint = await tx.blueprint.findUnique({
      where: { itemId: producedItemId },
      include: { versions: true }
    });
    if (!blueprint) {
      blueprint = await tx.blueprint.create({
        data: { factoryId, itemId: producedItemId },
        include: { versions: true }
      });
    }
    let blueprintVersion = blueprint.versions.find((v) => v.isActive) ?? blueprint.versions[0];
    if (!blueprintVersion) {
      blueprintVersion = await tx.blueprintVersion.create({
        data: {
          blueprintId: blueprint.id,
          versionNumber: 1,
          name: "V1 - Standard",
          qcTemplateId: template?.id ?? null,
          isActive: true,
        }
      });
      await tx.blueprint.update({
        where: { id: blueprint.id },
        data: { activeVersionId: blueprintVersion.id }
      });
    }

    // Production chain
    const productionPlan = await tx.productionPlan.create({
      data: {
        factoryId,
        salesOrderId: salesOrder.id,
        blueprintVersionId: blueprintVersion.id,
        quantity: data.quantity,
        status: 'RELEASED',
      }
    });

    const workOrder = await tx.workOrder.create({
      data: {
        factoryId,
        woNumber: orderNumber,
        productionPlanId: productionPlan.id,
        status: 'DRAFT',
        targetQty: data.quantity,
      }
    });

    // One job card per department (CAD → Cutting → Stitching → QC → Packing by
    // default). Departments ARE the production chain, ordered by sortOrder. All
    // cards stay BLOCKED while the order sits in Draft; releasing the draft
    // unblocks the first stage.
    const stages = await ensureFactoryDepartments(tx, factoryId);
    // Store managers only take orders — they never staff them. Any assignment
    // in the payload is ignored; the order lands unstaffed in the owner's Pending
    // queue for the owner to assign before release.
    const canStaff = dbUser.role !== "STORE_MANAGER";
    // Person assigned to each department for this order (QC → its supervisor).
    const assignmentByDept = canStaff
      ? new Map((data.assignments ?? []).map((a) => [a.departmentId, a.userId]))
      : new Map<string, string>();
    const stageCards = [];
    for (let i = 0; i < stages.length; i++) {
      const dept = stages[i] as any;
      const assignedToId = canStaff ? (assignmentByDept.get(dept.id) ?? data.assignedWorkerId ?? null) : null;
      // The checklist this card runs, resolved the same way the worker screen
      // resolves it: the template owned by this department that covers the
      // ordered item's category, else that department's universal one. The old
      // department-level pin is gone, so there is nothing to fall back to.
      const cardTemplateId = dept.isQcStage
        ? template?.id ?? null
        : (
            await tx.checklistTemplate.findFirst({
              where: {
                factoryId,
                status: "active",
                ownerDepartmentId: dept.id,
                ...(orderedGroupId
                  ? { defaultForItemGroups: { some: { id: orderedGroupId } } }
                  : { defaultForItemGroups: { none: {} } }),
              },
              orderBy: { updatedAt: "desc" },
              select: { id: true },
            })
          )?.id ??
          (
            await tx.checklistTemplate.findFirst({
              where: {
                factoryId,
                status: "active",
                ownerDepartmentId: dept.id,
                defaultForItemGroups: { none: {} },
              },
              orderBy: { updatedAt: "desc" },
              select: { id: true },
            })
          )?.id ??
          null;
      stageCards.push(await tx.jobCard.create({
        data: {
          factoryId,
          workOrderId: workOrder.id,
          departmentId: dept.id,
          sequence: i + 1,
          status: 'BLOCKED',
          assignedToId,
          targetQty: data.quantity,
          templateId: cardTemplateId,
        }
      }));
    }
    const jobCard = stageCards[0];
    const qcIndex = stages.findIndex((s) => s.isQcStage);
    const qcCard = qcIndex >= 0 ? stageCards[qcIndex] : jobCard;

    // The inspection (QC checklist) lives on the QC-stage card.
    const inspection = await tx.inspection.create({
      data: {
        factoryId,
        jobCardId: qcCard.id,
        status: 'PENDING'
      }
    });

    await recordTimeline(tx, {
      factoryId,
      workOrderId: workOrder.id,
      eventType: 'CREATED',
      title: `Production order ${orderNumber} created (Draft)`,
      description: `Route: ${stages.map((s) => s.name).join(' → ')}`,
      actorId: dbUser.id,
      metadata: { orderNumber, quantity: data.quantity },
    });

    // Generate checklist submissions
    const submissions = [];
    for (const section of (template?.sections || [])) {
      for (const checkpoint of section.checkpoints) {
        submissions.push({
          factoryId,
          inspectionId: inspection.id,
          checkpointId: checkpoint.id,
        });
      }
    }

    if (submissions.length > 0) {
      await tx.checkpointSubmission.createMany({ data: submissions });
    }

    // Audit log
    const roleLabel = dbUser.role === 'OWNER' ? 'Owner' : dbUser.role === 'CO_OWNER' ? 'Co-Owner' : 'Manager';
    await tx.auditLog.create({
      data: {
        factoryId,
        actorUserId: dbUser.id,
        action: `${roleLabel} ${dbUser.name} created order ${orderNumber}`,
        entityType: 'SalesOrder',
        entityId: salesOrder.id,
        metadata: { orderNumber }
      }
    });

    // Worker notification and material issuance happen at RELEASE time
    // (releaseDrafts), not while the order sits in Draft.

    return { salesOrder, workOrderId: workOrder.id, blueprintVersionId: blueprintVersion.id };
  }, { timeout: 30000, maxWait: 10000 });

  publishChange(factoryId, "ORDER_CREATED", dbUser.id);
  return { success: true, orderId: result.salesOrder.id, draft: true };
}

// Releases draft productions to the floor. Multiple drafts released together
// are grouped under one ProductionBatch (batch id over many order ids), so the
// owner can accumulate identical orders in Draft and club them into one run.
// Edits a DRAFT production in place — the Pending tab's Edit button feeds the
// same studio, then saves back here. Only drafts are editable (nothing is on
// the floor yet), and the order id / number is kept intact. The vehicle is
// resolved by id and never created, so editing can't spawn a duplicate model.
export async function updateOrder(orderId: string, data: {
  customerName?: string;
  customerPhone?: string;
  vehicleBrandId?: string;
  vehicleModelId?: string;
  vehicleYear?: string;
  materialId?: string;
  designId?: string;
  colorId?: string;
  productTypeId?: string;
  seatType?: string;
  hasArmrest?: boolean;
  headrestCount?: number;
  quantity?: number;
  remarks?: string;
  orderType?: "RETAIL" | "DEALER" | "OEM" | "INTERNAL";
  // Per-department worker assignment (owner staffing a pending order before
  // release). Keyed by departmentId.
  assignments?: Array<{ departmentId: string; userId: string }>;
}) {
  const dbUser = await getOwnerUser();
  if (!dbUser) return { error: "Unauthorized" };
  await guardModuleWrite("sales");
  const factoryId = dbUser.factoryId;

  const order = await prisma.salesOrder.findFirst({
    where: { id: orderId, factoryId },
    include: {
      items: true,
      plans: { include: { workOrders: { include: { jobCards: true } } } },
    },
  });
  if (!order) return { error: "Production not found" };
  if (order.status !== "DRAFT") return { error: "Only pending productions can be edited. This one is already on the floor." };

  // Only take a valid brand/model id — never create one from a typed name here.
  const brandId = order && data.vehicleBrandId && data.vehicleBrandId.startsWith("c") ? data.vehicleBrandId : undefined;
  const modelId = data.vehicleModelId && data.vehicleModelId.startsWith("c") ? data.vehicleModelId : undefined;

  const qty = data.quantity != null && data.quantity > 0 ? data.quantity : undefined;

  try {
    await prisma.$transaction(async (tx) => {
      // Resolve or create the customer only when a real (non-stock) name is given.
      let customerId = order.customerId;
      const name = (data.customerName ?? "").trim();
      if (name && name.toLowerCase() !== "stock production") {
        let customer = await tx.customer.findFirst({ where: { factoryId, name: { equals: name, mode: "insensitive" } } });
        if (!customer) customer = await tx.customer.create({ data: { factoryId, name, phone: data.customerPhone || null } });
        customerId = customer.id;
      }

      await tx.salesOrder.update({
        where: { id: order.id },
        data: {
          customerId,
          materialId: data.materialId || null,
          designId: data.designId || null,
          colorId: data.colorId || null,
          productTypeId: data.productTypeId || null,
          ...(data.orderType ? { orderType: data.orderType } : {}),
          // Per-order vehicle identity — only overwrite when a real id is given
          // so clearing the search box doesn't wipe the saved vehicle.
          ...(brandId ? { vehicleBrandId: brandId } : {}),
          ...(modelId ? { vehicleModelId: modelId } : {}),
          vehicleYear: data.vehicleYear || null,
          seatType: data.seatType || null,
          hasArmrest: data.hasArmrest ?? false,
          headrestCount: data.headrestCount ?? null,
          remarks: data.remarks || null,
        },
      });

      // Vehicle shown on the passport is also mirrored as a fitment on the
      // variant (legacy compatibility); repoint it.
      // Quantity flows down the whole draft chain so the plan, work order and
      // job cards agree with the order.
      if (qty != null) {
        for (const item of order.items) {
          await tx.salesOrderItem.update({ where: { id: item.id }, data: { quantity: qty } });
        }
        for (const plan of order.plans) {
          await tx.productionPlan.update({ where: { id: plan.id }, data: { quantity: qty } });
          for (const wo of plan.workOrders) {
            await tx.workOrder.update({ where: { id: wo.id }, data: { targetQty: qty } });
            for (const jc of wo.jobCards) {
              await tx.jobCard.update({ where: { id: jc.id }, data: { targetQty: qty } });
            }
          }
        }
      }

      // Owner staffs the pending order: assign each department's job cards to the
      // chosen worker. This is how an order taken by a store manager (with no
      // workers) gets staffed before it's released to the floor.
      if (data.assignments && data.assignments.length > 0) {
        const byDept = new Map(data.assignments.filter((a) => a.userId).map((a) => [a.departmentId, a.userId]));
        for (const plan of order.plans) {
          for (const wo of plan.workOrders) {
            for (const jc of wo.jobCards) {
              const userId = jc.departmentId ? byDept.get(jc.departmentId) : undefined;
              if (userId) await tx.jobCard.update({ where: { id: jc.id }, data: { assignedToId: userId } });
            }
          }
        }
      }
    }, { timeout: 30000, maxWait: 10000 });

    revalidatePath("/owner/production");
    return { success: true, orderId: order.id };
  } catch (error) {
    console.error("updateOrder failed:", error);
    return { error: "Failed to save changes" };
  }
}

export async function releaseDrafts(orderIds: string[], scheduledFor?: string | null) {
  await guardModuleWrite("sales");
  const dbUser = await getOwnerUser();
  if (!dbUser) throw new Error("Unauthorized");
  // Only manager/owner move drafts into production; a store manager can create
  // them but not release them.
  if (!["OWNER", "CO_OWNER", "MANAGER"].includes(dbUser.role)) {
    return { error: "Only a manager or owner can move productions into production." };
  }
  const factoryId = dbUser.factoryId;

  const ids = [...new Set(orderIds)].filter(Boolean);
  if (ids.length === 0) return { error: "Select at least one draft to release" };

  const orders = await prisma.salesOrder.findMany({
    where: { id: { in: ids }, factoryId, status: 'DRAFT' },
    include: {
      plans: {
        include: {
          workOrders: { include: { jobCards: { include: { stage: true }, orderBy: { sequence: 'asc' } } } },
        },
      },
    },
  });
  if (orders.length === 0) return { error: "No matching draft orders found" };

  const batchCount = await prisma.productionBatch.count({ where: { factoryId } });
  const batchNumber = `B-${new Date().getFullYear()}-${String(batchCount + 1).padStart(4, '0')}`;

  // Scheduled release: workers don't see the job until this date. Stored at the
  // start of the day so a same-day schedule is visible immediately.
  let schedule: Date | null = null;
  if (scheduledFor) { const d = new Date(scheduledFor); if (!isNaN(d.getTime())) { d.setHours(0,0,0,0); schedule = d; } }

  await prisma.$transaction(async (tx) => {
    const batch = await tx.productionBatch.create({
      data: { factoryId, batchNumber },
    });

    for (const order of orders) {
      await tx.salesOrder.update({
        where: { id: order.id },
        data: { status: 'IN_PRODUCTION', productionBatchId: batch.id, scheduledFor: schedule },
      });

      for (const plan of order.plans) {
        for (const wo of plan.workOrders) {
          await tx.workOrder.update({
            where: { id: wo.id },
            data: { status: 'IN_PROGRESS', startDate: new Date() },
          });

          const firstCard = wo.jobCards[0];
          if (firstCard && firstCard.status === 'BLOCKED') {
            await tx.jobCard.update({ where: { id: firstCard.id }, data: { status: 'WAITING' } });
            if (firstCard.assignedToId) {
              await tx.notification.create({
                data: {
                  factoryId,
                  userId: firstCard.assignedToId,
                  title: 'New Production Job Assigned',
                  message: `Order ${order.soNumber} (${batchNumber}) is released. First step: ${firstCard.stage?.name ?? 'Production'}.`,
                  type: 'INFO',
                  linkUrl: firstCard.stage?.isQcStage ? `/worker/inspection/${firstCard.id}` : `/worker/stage/${firstCard.id}`,
                },
              });
            }
          }

          await recordTimeline(tx, {
            factoryId,
            workOrderId: wo.id,
            eventType: 'STATUS_CHANGED',
            title: `Released to production (${batchNumber})`,
            description: orders.length > 1 ? `Clubbed with ${orders.length - 1} other order${orders.length > 2 ? 's' : ''}` : undefined,
            actorId: dbUser.id,
            metadata: { batchNumber, orderIds: ids },
          });
        }
      }
    }

    await tx.auditLog.create({
      data: {
        factoryId,
        actorUserId: dbUser.id,
        action: `Released ${orders.length} draft production${orders.length === 1 ? '' : 's'} as ${batchNumber}`,
        entityType: 'ProductionBatch',
        entityId: batch.id,
        metadata: { orderIds: ids },
      },
    });
  }, { timeout: 30000, maxWait: 10000 });

  // Material issuance per released work order (BOM + spec BOMs from Master Data).
  for (const order of orders) {
    for (const plan of order.plans) {
      for (const wo of plan.workOrders) {
        try {
          await issueMaterialsForWorkOrder({
            factoryId,
            workOrderId: wo.id,
            blueprintVersionId: plan.blueprintVersionId,
            quantity: plan.quantity,
            designId: order.designId || null,
            fabricItemId: order.materialId || null,
          });
        } catch (error) {
          console.error(`Material issuance failed for ${wo.woNumber}:`, error);
        }
      }
    }
  }

  try {
    const { notifyLowStock } = await import("@/server/actions/purchase");
    await notifyLowStock();
  } catch (error) {
    console.error("Low-stock check failed:", error);
  }

  publishChange(factoryId, "DRAFTS_RELEASED", dbUser.id);
  revalidatePath("/owner/production");
  revalidatePath("/owner/floor");
  revalidatePath("/owner/dashboard");
  revalidatePath("/worker");
  return { success: true, batchNumber, released: orders.length };
}

// Batch production: each line becomes its OWN independent production chain
// (own SalesOrder, WorkOrder, JobCards, passport, inventory issuance). Lines
// can freely mix Stock Production and Customer-Order Production — the per-line
// `onOrdered` flag + customer fields are honoured individually, so a single
// batch run may contain both kinds without separate submissions.
export async function createBatchOrders(
  lines: Array<Parameters<typeof createOrder>[0]>
) {
  await guardModuleWrite("sales");
  const dbUser = await getOwnerUser();
  if (!dbUser) throw new Error("Unauthorized");
  if (!lines || lines.length === 0) return { error: "Batch has no lines." };

  const results: Array<{ ok: boolean; orderId?: string; error?: string }> = [];
  for (const line of lines) {
    try {
      // Each line is a standalone production — never nest batchLines.
      const r = await createOrder({ ...line, batchLines: undefined });
      if ((r as any)?.error) results.push({ ok: false, error: (r as any).error });
      else results.push({ ok: true, orderId: (r as any).orderId });
    } catch (err: any) {
      results.push({ ok: false, error: err?.message || "Line failed" });
    }
  }

  const created = results.filter((r) => r.ok).length;
  const failed = results.length - created;
  return { success: created > 0, created, failed, results };
}

export async function getRunningOrders() {
  await guardModuleAction("sales");
  const dbUser = await getOwnerUser();
  if (!dbUser) throw new Error("Unauthorized");

  const orders = await prisma.salesOrder.findMany({
    where: {
      factoryId: dbUser.factoryId,
      // A store manager only sees the orders they booked — never owner-generated
      // production.
      ...(dbUser.role === "STORE_MANAGER" ? { createdById: dbUser.id } : {}),
    },
    include: salesOrderInclude,
    orderBy: { orderDate: 'desc' }
  });
  return orders.map((order) => toLegacyOrder(order));
}

export async function updateOrderAssignments(orderId: string, assignedWorkerId: string, inspectorId: string) {
  await guardModuleWrite("sales");
  const dbUser = await getOwnerUser();
  if (!dbUser) throw new Error("Unauthorized");

  const order = await prisma.salesOrder.findFirst({
    where: { id: orderId, factoryId: dbUser.factoryId },
    include: { plans: { include: { workOrders: { include: { jobCards: true } } } } }
  });

  if (!order) {
    return { error: "Order not found" };
  }

  const jobCardIds = order.plans.flatMap((p) => p.workOrders.flatMap((wo) => wo.jobCards.map((jc) => jc.id)));
  await prisma.jobCard.updateMany({
    where: { id: { in: jobCardIds } },
    data: { assignedToId: assignedWorkerId }
  });

  await prisma.salesOrder.update({
    where: { id: orderId },
    data: { inspectorId: inspectorId || null }
  });

  if (assignedWorkerId) {
    await prisma.notification.create({
      data: {
        factoryId: dbUser.factoryId,
        userId: assignedWorkerId,
        title: "Order Reassigned To You",
        message: `Order ${order.soNumber} has been assigned to you.`,
        type: "INFO",
        linkUrl: "/worker",
      }
    });
  }

  revalidatePath("/owner/production");
  return { success: true };
}


// Exact-spec stock matcher for On-Ordered production. A prior production
// qualifies when: same spec fingerprint, passport verified, still
// undispatched, unclaimed, and quantity covers the request.
// How many units of matching, verified, undispatched finished stock exist for
// this spec — the pool a partial order could draw from.
async function assessOnOrderStock(factoryId: string, data: any): Promise<number> {
  const specWhere = {
    factoryId,
    designId: data.designId || null,
    colorId: data.colorId || null,
    materialId: data.materialId || null,
    productTypeId: data.productTypeId || null,
    seatType: data.seatType || null,
    hasArmrest: data.hasArmrest || false,
    headrestCount: data.headrestCount ?? null,
  };
  const candidates = await prisma.salesOrder.findMany({
    where: {
      ...specWhere,
      dispatches: { none: {} },
      fulfilledFromOrderId: null,
      plans: { some: { workOrders: { some: { jobCards: { some: { inspection: { report: { isNot: null } } } } } } } },
    },
    include: { items: true, plans: true },
  });
  const claimed = new Set(
    (await prisma.salesOrder.findMany({ where: { factoryId, fulfilledFromOrderId: { not: null } }, select: { fulfilledFromOrderId: true } }))
      .map((o) => o.fulfilledFromOrderId)
  );
  return candidates
    .filter((c) => !claimed.has(c.id))
    .reduce((sum, c) => sum + (c.items[0]?.quantity ?? c.plans[0]?.quantity ?? 0), 0);
}

// Issue `qty` of matching finished goods out of stock for a split order — the
// order keeps its id and only the shortfall goes to the floor.
async function allocateFinishedStock(factoryId: string, data: any, qty: number): Promise<void> {
  const itemId = data.itemId ?? null;
  if (!itemId) return;
  let remaining = qty;
  const bins = await prisma.binBalance.findMany({ where: { itemId, factoryId, stockAvailable: { gt: 0 } }, orderBy: { stockAvailable: "desc" } });
  for (const bin of bins) {
    if (remaining <= 0) break;
    const take = Math.min(bin.stockAvailable, remaining);
    remaining -= take;
    await prisma.binBalance.update({ where: { id: bin.id }, data: { stockAvailable: { decrement: take } } });
    await prisma.stockLedgerEntry.create({
      data: { factoryId, transactionType: "ISSUE", itemId, binId: bin.binId, quantityChange: -take, valuationRate: 0, totalValue: 0, referenceDocType: "PARTIAL_STOCK_ALLOCATION", referenceDocId: null },
    });
  }
}

async function fulfillFromMatchingStock(
  factoryId: string,
  actorId: string,
  data: any,
): Promise<{ success: true; orderId: string; fulfilledFromStock: true; sourceOrderNumber: string } | null> {
  const specWhere = {
    factoryId,
    designId: data.designId || null,
    colorId: data.colorId || null,
    materialId: data.materialId || null,
    productTypeId: data.productTypeId || null,
    seatType: data.seatType || null,
    hasArmrest: data.hasArmrest || false,
    headrestCount: data.headrestCount ?? null,
  };

  const candidates = await prisma.salesOrder.findMany({
    where: {
      ...specWhere,
      dispatches: { none: {} },
      fulfilledFromOrderId: null,
      plans: {
        some: {
          workOrders: {
            some: { jobCards: { some: { inspection: { report: { isNot: null } } } } },
          },
        },
      },
    },
    include: {
      items: true,
      plans: { include: { workOrders: { include: { jobCards: true } } } },
    },
    orderBy: { orderDate: "asc" },
  });

  // Exclude productions already claimed by another stock-matched order
  const claimedIds = new Set(
    (await prisma.salesOrder.findMany({
      where: { factoryId, fulfilledFromOrderId: { not: null } },
      select: { fulfilledFromOrderId: true },
    })).map((o) => o.fulfilledFromOrderId)
  );

  const source = candidates.find((c) => {
    if (claimedIds.has(c.id)) return false;
    const qty = c.items[0]?.quantity ?? c.plans[0]?.quantity ?? 0;
    return qty >= data.quantity;
  });
  if (!source) return null;

  const sourceItem = source.items[0];
  const itemId = sourceItem?.itemId ?? source.itemId ?? null;

  let customer = await prisma.customer.findFirst({
    where: { factoryId, name: { equals: data.customerName, mode: "insensitive" } },
  });
  if (!customer) {
    customer = await prisma.customer.create({
      data: { factoryId, name: data.customerName, phone: data.customerPhone },
    });
  }

  const orderNumber = `ORD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const newOrder = await prisma.salesOrder.create({
    data: {
      factoryId,
      soNumber: orderNumber,
      customerId: customer.id,
      status: "READY",
      fulfilledFromOrderId: source.id,
      itemId,
      designId: data.designId || null,
      colorId: data.colorId || null,
      materialId: data.materialId || null,
      productTypeId: data.productTypeId || null,
      inspectorId: data.inspectorId || null,
      vehicleYear: data.vehicleYear || null,
      seatType: data.seatType || null,
      hasArmrest: data.hasArmrest || false,
      headrestCount: data.headrestCount ?? null,
      remarks: data.remarks || null,
      dynamicData: data.dynamicFields ?? undefined,
      items: sourceItem
        ? {
            create: [
              {
                itemId: sourceItem.itemId ?? itemId,
                ...(sourceItem.productVariantId ? { productVariantId: sourceItem.productVariantId } : {}),
                quantity: data.quantity,
                unitPrice: 0,
              },
            ],
          }
        : undefined,
    },
  });

  // Deduct the assigned quantity from finished-goods stock
  if (itemId) {
    let remaining = data.quantity;
    const bins = await prisma.binBalance.findMany({
      where: { itemId, factoryId, stockAvailable: { gt: 0 } },
      orderBy: { stockAvailable: "desc" },
    });
    for (const bin of bins) {
      if (remaining <= 0) break;
      const take = Math.min(bin.stockAvailable, remaining);
      remaining -= take;
      await prisma.binBalance.update({ where: { id: bin.id }, data: { stockAvailable: { decrement: take } } });
      await prisma.stockLedgerEntry.create({
        data: {
          factoryId,
          transactionType: "ISSUE",
          itemId,
          binId: bin.binId,
          quantityChange: -take,
          valuationRate: 0,
          totalValue: 0,
          referenceDocType: "STOCK_MATCH",
          referenceDocId: newOrder.id,
        },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      factoryId,
      actorUserId: actorId,
      action: `Order ${orderNumber} matched to in-stock production ${source.soNumber}`,
      entityType: "SalesOrder",
      entityId: newOrder.id,
      metadata: { orderNumber, sourceOrderNumber: source.soNumber },
    },
  });

  revalidatePath("/owner/production");
  revalidatePath("/owner/inventory");
  return { success: true, orderId: newOrder.id, fulfilledFromStock: true, sourceOrderNumber: source.soNumber };
}
