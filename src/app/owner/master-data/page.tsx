import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { canUser } from "@/lib/server/permissions";
import { getResolvedFields, getGroupRows } from "@/server/queries/spec";
import { SpecStudioClient } from "../settings/master-data/studio/SpecStudioClient";
import { EmptyStudio } from "./EmptyStudio";

export default async function MasterDataWorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; mode?: string; add?: string; tab?: string }>;
}) {
  const dbUser = await getOwnerUser();
  if (!(await canUser(dbUser, "ACCESS_MASTER_DATA"))) redirect("/unauthorized");

  const { group: groupParam, mode, add, tab } = await searchParams;

  const groups = await prisma.itemGroup.findMany({
    where: { factoryId: dbUser.factoryId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  // A brand-new factory gets a way in, not an instruction to run a script.
  if (groups.length === 0) return <EmptyStudio />;

  const activeGroup = groups.find((g) => g.id === groupParam) ?? groups[0];
  const [fields, rows] = await Promise.all([
    getResolvedFields(activeGroup.id),
    getGroupRows(activeGroup.id),
  ]);

  return (
    <SpecStudioClient
      basePath="/owner/master-data"
      initialAddOpen={add === "1"}
      activeTab={tab === "templates" ? "templates" : "groups"}
      groups={groups.map((g) => ({
        id: g.id,
        name: g.name,
        parentId: g.parentId,
        itemType: g.itemType,
        isSheet: g.isSheet,
        nameTemplate: g.nameTemplate,
        codeTemplate: g.codeTemplate,
        codeLabel: g.codeLabel,
        nameLabel: g.nameLabel,
        aliasLabel: g.aliasLabel,
        aliasHidden: g.aliasHidden,
        hasInventoryUnits: g.hasInventoryUnits,
        isSalable: g.isSalable,
        // Whitelisted like the rest. Left out, the studio read undefined and
        // showed every category as OFF — the click saved, the buttons never
        // moved, and the setting looked broken.
        bomMode: g.bomMode,
        isSystem: g.isSystem,
      }))}
      activeGroupId={activeGroup.id}
      mode={mode === "configure" ? "configure" : "data"}
      fields={fields.map((f) => ({
        id: f.id,
        groupId: f.groupId,
        key: f.key,
        name: f.name,
        kind: f.kind,
        valueType: f.valueType,
        unitSuffix: f.unitSuffix,
        refTarget: f.refTarget,
        targetGroupId: f.targetGroupId,
        targetFieldId: f.targetFieldId,
        isRequired: f.isRequired,
        dependsOnFieldId: f.dependsOnFieldId,
        options: f.options.map((o) => ({ id: o.id, label: o.label, shortCode: o.shortCode })),
      }))}
      rows={rows}
    />
  );
}
