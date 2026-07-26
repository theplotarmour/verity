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
    return <SearchClient query="" results={{ orders: [], batches: [], customers: [], workers: [], designs: [], materials: [], dispatches: [] }} />;
  }

  const factoryId = dbUser.factoryId;

  const [orders, batches, customers, workers, designs, materials, dispatches] = await Promise.all([
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
    prisma.design.findMany({
      where: { factoryId, OR: [
        { name: { contains: query, mode: "insensitive" } },
        { category: { contains: query, mode: "insensitive" } },
      ] },
      take: 20,
    }),
    prisma.itemMaster.findMany({
      where: { factoryId, itemType: "RAW_MATERIAL", OR: [
        { name: { contains: query, mode: "insensitive" } },
        { sku: { contains: query, mode: "insensitive" } },
      ] },
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
      results={{ orders, batches: batches.map((jobCard: any) => ({ ...toWorkerJob(jobCard), inspection: jobCard.inspection })), customers, workers, designs, materials, dispatches }}
    />
  );
}
