/**
 * reset-demo.ts
 *
 * Wipes every transactional and demo record while leaving:
 *   - Factory row
 *   - Owner user (role: OWNER)
 *   - ItemGroup tree + SpecField definitions + SpecFieldOptions
 *   - Blueprint library + BomTemplateLine definitions
 *   - QCTemplate / TemplateSection / Checkpoint definitions
 *
 * Run with:
 *   npx tsx prisma/reset-demo.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const factory = await prisma.factory.findFirst();
  if (!factory) { console.log("No factory found — nothing to reset."); return; }
  const fid = factory.id;
  console.log(`Resetting factory: ${factory.name} (${fid})\n`);

  // ── 1. QC / inspection submissions ──────────────────────────────────────
  await prisma.imageEvidence.deleteMany({ where: { factoryId: fid } });
  await prisma.checkpointSubmission.deleteMany({ where: { factoryId: fid } });
  await prisma.qualityApproval.deleteMany({ where: { factoryId: fid } });
  await prisma.qualityReport.deleteMany({ where: { factoryId: fid } });
  await prisma.reworkRecord.deleteMany({ where: { factoryId: fid } });
  await prisma.inspection.deleteMany({ where: { factoryId: fid } });
  console.log("  ✓ QC inspections cleared");

  // ── 2. Production chain ──────────────────────────────────────────────────
  await prisma.stageEntry.deleteMany({ where: { factoryId: fid } });
  await prisma.jobCard.deleteMany({ where: { factoryId: fid } });
  await prisma.workOrder.deleteMany({ where: { factoryId: fid } });
  await prisma.productionPlan.deleteMany({ where: { factoryId: fid } });
  await prisma.productionBatch.deleteMany({ where: { factoryId: fid } });
  console.log("  ✓ Production chain cleared");

  // ── 3. Orders & dispatch ─────────────────────────────────────────────────
  await prisma.dispatch.deleteMany({ where: { factoryId: fid } });
  await prisma.salesOrderItem.deleteMany({ where: { salesOrder: { factoryId: fid } } });
  await prisma.salesOrder.deleteMany({ where: { factoryId: fid } });
  await prisma.deal.deleteMany({ where: { factoryId: fid } });
  console.log("  ✓ Sales orders & dispatch cleared");

  // ── 4. Purchase chain ────────────────────────────────────────────────────
  await prisma.purchaseReceiptItem.deleteMany({ where: { receipt: { factoryId: fid } } });
  await prisma.purchaseReceipt.deleteMany({ where: { factoryId: fid } });
  await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrder: { factoryId: fid } } });
  await prisma.purchaseOrder.deleteMany({ where: { factoryId: fid } });
  await prisma.purchaseRequest.deleteMany({ where: { factoryId: fid } });
  console.log("  ✓ Purchase orders cleared");

  // ── 5. Inventory / stock ─────────────────────────────────────────────────
  await prisma.stockLedgerEntry.deleteMany({ where: { factoryId: fid } });
  await prisma.binBalance.deleteMany({ where: { factoryId: fid } });
  await prisma.materialReservation.deleteMany({ where: { factoryId: fid } });
  console.log("  ✓ Stock ledger & bin balances cleared");

  // ── 6. Item master (catalog) ─────────────────────────────────────────────
  // BomTemplateLine has a nullable itemId FK — clear per-item lines only (item-level BOM overrides).
  // Template-level lines (blueprintVersionId set, itemId null) are kept as structure.
  await prisma.bomTemplateLine.deleteMany({ where: { itemId: { not: null }, item: { factoryId: fid } } });
  await prisma.itemBomOverride.deleteMany({ where: { item: { factoryId: fid } } });
  await prisma.bomContribution.deleteMany({ where: { factoryId: fid } });
  await prisma.itemFieldValue.deleteMany({ where: { item: { factoryId: fid } } });
  await prisma.bOMItem.deleteMany({ where: { bom: { factoryId: fid } } });
  await prisma.bOM.deleteMany({ where: { factoryId: fid } });
  await prisma.itemMaster.deleteMany({ where: { factoryId: fid } });
  console.log("  ✓ Item master (catalog) cleared");

  // ── 9. Customers & suppliers ─────────────────────────────────────────────
  await prisma.customer.deleteMany({ where: { factoryId: fid } });
  await prisma.supplier.deleteMany({ where: { factoryId: fid } });
  console.log("  ✓ Customers & suppliers cleared");

  // ── 10. Warehouses ───────────────────────────────────────────────────────
  await prisma.warehouseBin.deleteMany({ where: { factoryId: fid } });
  await prisma.warehouseShelf.deleteMany({ where: { factoryId: fid } });
  await prisma.warehouseRack.deleteMany({ where: { factoryId: fid } });
  await prisma.warehouseZone.deleteMany({ where: { factoryId: fid } });
  await prisma.warehouse.deleteMany({ where: { factoryId: fid } });
  console.log("  ✓ Warehouses cleared");

  // ── 11. Demo employees (keep OWNER only) ─────────────────────────────────
  const owner = await prisma.user.findFirst({
    where: { factoryId: fid, role: "OWNER" },
    select: { id: true, name: true, phone: true },
  });
  if (!owner) {
    console.warn("  ⚠ No OWNER user found — skipping employee deletion to be safe");
  } else {
    await prisma.attendanceLog.deleteMany({ where: { factoryId: fid, userId: { not: owner.id } } });
    await prisma.leaveApplication.deleteMany({ where: { factoryId: fid, userId: { not: owner.id } } });
    await prisma.employeeProfile.deleteMany({ where: { factoryId: fid, userId: { not: owner.id } } });
    await prisma.user.deleteMany({ where: { factoryId: fid, id: { not: owner.id } } });
    console.log(`  ✓ Demo employees removed — kept owner: ${owner.name} (${owner.phone})`);
  }

  // ── 12. Departments ──────────────────────────────────────────────────────
  await prisma.department.deleteMany({ where: { factoryId: fid } });
  console.log("  ✓ Departments cleared");

  // ── 13. Legacy material categories (pre-spec-engine) ────────────────────
  await prisma.materialSubcategory.deleteMany({ where: { factoryId: fid } });
  await prisma.materialCategory.deleteMany({ where: { factoryId: fid } });
  console.log("  ✓ Legacy material categories cleared");

  // ── 14. Audit / timeline noise ───────────────────────────────────────────
  await prisma.timelineEvent.deleteMany({ where: { factoryId: fid } });
  await prisma.comment.deleteMany({ where: { factoryId: fid } });
  await prisma.attachment.deleteMany({ where: { factoryId: fid } });
  await prisma.notification.deleteMany({ where: { factoryId: fid } });
  await prisma.auditLog.deleteMany({ where: { factoryId: fid } });
  console.log("  ✓ Audit / timeline / notifications cleared");

  console.log("\n✅ Reset complete.");
  console.log("   Kept: factory row, owner user, item groups, spec fields, blueprints, checklist templates.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
