import { redirect } from "next/navigation";
import { getOwnerUser } from "@/lib/server/owner";
import prisma from "@/lib/prisma";
import { jobCardInclude, salesOrderInclude, toLegacyOrder, toWorkerJob } from "@/lib/server/jobCardAdapter";
import { SearchClient } from "./client";

export default async function SearchPage({
  searchParams,
}: {
  // Next 16 hands route props in as promises.
  searchParams: Promise<{ q?: string }>;
}) {
  const dbUser = await getOwnerUser();
  if (!dbUser) redirect("/onboarding");

  const query = (await searchParams).q || "";

  if (!query) {
    return <SearchClient query="" results={{ orders: [], batches: [], customers: [], workers: [], designs: [], materials: [], items: [], dispatches: [] }} />;
  }

  const factoryId = dbUser.factoryId;

  // Designs are ordinary items now, so the item search below already finds them.
  const [orders, batches, customers, workers, materials, items, dispatches] = await Promise.all([
    prisma.salesOrder.findMany({
      where: {
        factoryId,
        soNumber: { contains: query, mode: "insensitive" },
      },
      include: salesOrderInclude,
      take: 20,
    }).then((rows) => rows.map((row) => toLegacyOrder(row))),
    prisma.jobCard.findMany({
      where: {
        factoryId,
        workOrder: { woNumber: { contains: query, mode: "insensitive" } },
      },
      include: {
        ...jobCardInclude,
        inspection: true,
      },
      take: 20,
    }),
    prisma.customer.findMany({
      where: {
        factoryId,
        name: { contains: query, mode: "insensitive" },
      },
      take: 20,
    }),
    prisma.user.findMany({
      where: {
        factoryId,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { phone: { contains: query } },
        ],
      },
      take: 20,
    }),
    prisma.product.findMany({
      where: { factoryId, itemType: "RAW_MATERIAL", OR: [
        { name: { contains: query, mode: "insensitive" } },
        { sku: { contains: query, mode: "insensitive" } },
      ] },
      take: 20,
    }),
    // Finished goods were missing from global search entirely, so the largest
    // thing in the factory — the sellable catalogue — was the one thing the
    // search bar could not find. Every word must match, in any order, so
    // "swift beige" narrows the way it does in the production studio.
    prisma.product.findMany({
      where: {
        factoryId,
        itemType: "FINISHED_PRODUCT",
        AND: query
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .map((word) => ({
            OR: [
              { name: { contains: word, mode: "insensitive" as const } },
              { itemCode: { contains: word, mode: "insensitive" as const } },
              { aliasName: { contains: word, mode: "insensitive" as const } },
            ],
          })),
      },
      select: { id: true, name: true, itemCode: true, status: true },
      orderBy: { name: "asc" },
      take: 20,
    }),
    prisma.dispatch.findMany({
      where: { factoryId, OR: [
        { trackingId: { contains: query, mode: "insensitive" } },
        { transporter: { contains: query, mode: "insensitive" } },
        { salesOrder: { soNumber: { contains: query, mode: "insensitive" } } },
      ] },
      include: { salesOrder: true, destinationWarehouse: true },
      take: 20,
    }),
  ]);

  return (
    <SearchClient
      query={query}
      results={{ orders, batches: batches.map((jobCard: any) => ({ ...toWorkerJob(jobCard), inspection: jobCard.inspection })), customers, workers, designs: [], materials, items, dispatches }}
    />
  );
}
