// Product-based QC template resolution.
//
// A template can be tagged with the product(s) it applies to (QCTemplate.products).
// Mats and seat covers therefore run different checklists. Resolution order for a
// given product:
//   1. an active template explicitly tagged with this product
//   2. an active template with NO product tags (the factory-wide default)
//   3. any active template (last resort)
// Accepts a Prisma client or an interactive transaction client.
export async function resolveOrderTemplate(
  db: any,
  factoryId: string,
  productId: string | null | undefined
) {
  if (productId) {
    const tagged = await db.qCTemplate.findFirst({
      where: { factoryId, status: "active", products: { some: { id: productId } } },
      orderBy: { createdAt: "desc" },
      include: { sections: { include: { checkpoints: true } } },
    });
    if (tagged) return tagged;
  }
  const generic = await db.qCTemplate.findFirst({
    where: { factoryId, status: "active", products: { none: {} } },
    orderBy: { createdAt: "desc" },
    include: { sections: { include: { checkpoints: true } } },
  });
  if (generic) return generic;

  return db.qCTemplate.findFirst({
    where: { factoryId, status: "active" },
    orderBy: { createdAt: "desc" },
    include: { sections: { include: { checkpoints: true } } },
  });
}
