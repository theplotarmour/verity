// QC template resolution for an order.
//
// Resolution order:
//   0. the checklist set as the ordered item's category default (generic path)
//   1. an active template explicitly tagged with this product (legacy)
//   2. an active template with NO product tags (the factory-wide default)
//   3. any active template (last resort)
//
// Returns null when the factory has no active template at all — checklists are
// optional, so the caller must handle a null.
// Accepts a Prisma client or an interactive transaction client.
export async function resolveOrderTemplate(
  db: any,
  factoryId: string,
  productId: string | null | undefined,
  groupId?: string | null
) {
  // Generic path: the item's category can name its own default checklist.
  if (groupId) {
    // A category now carries one checklist per department, so pick the one that
    // belongs to a QC department — this resolver answers "what does QC run for
    // this product", not "what does the category run everywhere".
    const group = await db.itemGroup.findFirst({
      where: { id: groupId, factoryId },
      select: {
        defaultChecklists: {
          where: { status: "active" },
          include: {
            ownerDepartment: { select: { isQcStage: true } },
            sections: { include: { checkpoints: true } },
          },
        },
      },
    });
    const candidates = group?.defaultChecklists ?? [];
    const qcOne = candidates.find((t: any) => t.ownerDepartment?.isQcStage);
    if (qcOne) return qcOne;
    // No QC-owned checklist on the category: fall through rather than handing
    // back Cutting's list as if it were the inspection.

  }

  return db.checklistTemplate.findFirst({
    where: { factoryId, status: "active" },
    orderBy: { createdAt: "desc" },
    include: { sections: { include: { checkpoints: true } } },
  });
}
