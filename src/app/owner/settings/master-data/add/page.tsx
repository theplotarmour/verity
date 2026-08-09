import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { canUser } from "@/lib/server/permissions";
import { AddMasterDataClient } from "./AddMasterDataClient";

export default async function AddMasterDataPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const dbUser = await getOwnerUser();
  if (!(await canUser(dbUser, "ACCESS_SETTINGS"))) redirect("/unauthorized");

  const { group } = await searchParams;
  const groups = await prisma.itemGroup.findMany({
    where: { factoryId: dbUser.factoryId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, parentId: true, aliasLabel: true, aliasHidden: true, hasInventoryUnits: true, bomMode: true },
  });

  return <AddMasterDataClient groups={groups} initialGroupId={group} />;
}
