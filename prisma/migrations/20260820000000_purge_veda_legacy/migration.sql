-- Purge the Veda MES layer.
--
-- Drops the manufacturing vertical end to end: blueprints and routing,
-- production plans, work orders, job cards, stage capture, the BOM engine and
-- the spec authoring tables. Inspection, CheckpointSubmission, ImageEvidence,
-- QualityApproval, QualityReport and ReworkRecord follow, because each holds a
-- required foreign key into JobCard and cannot outlive it.
--
-- ItemMaster is renamed to Product rather than dropped. An item catalogue is
-- not MES; a bill of materials is. Inventory, purchasing and sales keep their
-- rows and their foreign keys.
--
-- IRREVERSIBLE. Everything below is a drop, and there is no down migration.
-- Back the database up before applying this anywhere the data matters.

-- DropForeignKey
ALTER TABLE "BOM" DROP CONSTRAINT "BOM_blueprintVersionId_fkey";

-- DropForeignKey
ALTER TABLE "BOMItem" DROP CONSTRAINT "BOMItem_bomId_fkey";

-- DropForeignKey
ALTER TABLE "BOMItem" DROP CONSTRAINT "BOMItem_itemId_fkey";

-- DropForeignKey
ALTER TABLE "BinBalance" DROP CONSTRAINT "BinBalance_itemId_fkey";

-- DropForeignKey
ALTER TABLE "Blueprint" DROP CONSTRAINT "Blueprint_itemId_fkey";

-- DropForeignKey
ALTER TABLE "BlueprintRouteStep" DROP CONSTRAINT "BlueprintRouteStep_blueprintVersionId_fkey";

-- DropForeignKey
ALTER TABLE "BlueprintRouteStep" DROP CONSTRAINT "BlueprintRouteStep_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "BlueprintVersion" DROP CONSTRAINT "BlueprintVersion_blueprintId_fkey";

-- DropForeignKey
ALTER TABLE "BlueprintVersion" DROP CONSTRAINT "BlueprintVersion_qcTemplateId_fkey";

-- DropForeignKey
ALTER TABLE "BomContribution" DROP CONSTRAINT "BomContribution_componentItemId_fkey";

-- DropForeignKey
ALTER TABLE "BomContribution" DROP CONSTRAINT "BomContribution_optionId_fkey";

-- DropForeignKey
ALTER TABLE "BomContribution" DROP CONSTRAINT "BomContribution_ownerItemId_fkey";

-- DropForeignKey
ALTER TABLE "BomContribution" DROP CONSTRAINT "BomContribution_quantityFromFieldId_fkey";

-- DropForeignKey
ALTER TABLE "BomContribution" DROP CONSTRAINT "BomContribution_sourceFieldId_fkey";

-- DropForeignKey
ALTER TABLE "BomTemplateLine" DROP CONSTRAINT "BomTemplateLine_groupId_fkey";

-- DropForeignKey
ALTER TABLE "BomTemplateLine" DROP CONSTRAINT "BomTemplateLine_itemId_fkey";

-- DropForeignKey
ALTER TABLE "BomTemplateLine" DROP CONSTRAINT "BomTemplateLine_quantityFromFieldId_fkey";

-- DropForeignKey
ALTER TABLE "BomTemplateLine" DROP CONSTRAINT "BomTemplateLine_quantityViaFieldId_fkey";

-- DropForeignKey
ALTER TABLE "BomTemplateLine" DROP CONSTRAINT "BomTemplateLine_sourceFieldId_fkey";

-- DropForeignKey
ALTER TABLE "CheckpointSubmission" DROP CONSTRAINT "CheckpointSubmission_checkpointId_fkey";

-- DropForeignKey
ALTER TABLE "CheckpointSubmission" DROP CONSTRAINT "CheckpointSubmission_inspectionId_fkey";

-- DropForeignKey
ALTER TABLE "FactoryDocument" DROP CONSTRAINT "FactoryDocument_blueprintVersionId_fkey";

-- DropForeignKey
ALTER TABLE "ImageEvidence" DROP CONSTRAINT "ImageEvidence_submissionId_fkey";

-- DropForeignKey
ALTER TABLE "Inspection" DROP CONSTRAINT "Inspection_jobCardId_fkey";

-- DropForeignKey
ALTER TABLE "ItemBomOverride" DROP CONSTRAINT "ItemBomOverride_componentItemId_fkey";

-- DropForeignKey
ALTER TABLE "ItemBomOverride" DROP CONSTRAINT "ItemBomOverride_itemId_fkey";

-- DropForeignKey
ALTER TABLE "ItemFieldValue" DROP CONSTRAINT "ItemFieldValue_fieldId_fkey";

-- DropForeignKey
ALTER TABLE "ItemFieldValue" DROP CONSTRAINT "ItemFieldValue_itemId_fkey";

-- DropForeignKey
ALTER TABLE "ItemFieldValue" DROP CONSTRAINT "ItemFieldValue_optionId_fkey";

-- DropForeignKey
ALTER TABLE "ItemFieldValue" DROP CONSTRAINT "ItemFieldValue_valueItemId_fkey";

-- DropForeignKey
ALTER TABLE "ItemGroup" DROP CONSTRAINT "ItemGroup_parentId_fkey";

-- DropForeignKey
ALTER TABLE "ItemMaster" DROP CONSTRAINT "ItemMaster_groupId_fkey";

-- DropForeignKey
ALTER TABLE "JobCard" DROP CONSTRAINT "JobCard_assignedToId_fkey";

-- DropForeignKey
ALTER TABLE "JobCard" DROP CONSTRAINT "JobCard_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "JobCard" DROP CONSTRAINT "JobCard_stageId_fkey";

-- DropForeignKey
ALTER TABLE "JobCard" DROP CONSTRAINT "JobCard_templateId_fkey";

-- DropForeignKey
ALTER TABLE "JobCard" DROP CONSTRAINT "JobCard_workOrderId_fkey";

-- DropForeignKey
ALTER TABLE "MaterialReservation" DROP CONSTRAINT "MaterialReservation_itemId_fkey";

-- DropForeignKey
ALTER TABLE "MaterialReservation" DROP CONSTRAINT "MaterialReservation_workOrderId_fkey";

-- DropForeignKey
ALTER TABLE "ProductionPlan" DROP CONSTRAINT "ProductionPlan_blueprintVersionId_fkey";

-- DropForeignKey
ALTER TABLE "ProductionPlan" DROP CONSTRAINT "ProductionPlan_salesOrderId_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseOrderItem" DROP CONSTRAINT "PurchaseOrderItem_materialId_fkey";

-- DropForeignKey
ALTER TABLE "QualityApproval" DROP CONSTRAINT "QualityApproval_inspectionId_fkey";

-- DropForeignKey
ALTER TABLE "QualityReport" DROP CONSTRAINT "QualityReport_inspectionId_fkey";

-- DropForeignKey
ALTER TABLE "ReworkRecord" DROP CONSTRAINT "ReworkRecord_inspectionId_fkey";

-- DropForeignKey
ALTER TABLE "SalesOrder" DROP CONSTRAINT "SalesOrder_colorId_fkey";

-- DropForeignKey
ALTER TABLE "SalesOrder" DROP CONSTRAINT "SalesOrder_designId_fkey";

-- DropForeignKey
ALTER TABLE "SalesOrder" DROP CONSTRAINT "SalesOrder_itemId_fkey";

-- DropForeignKey
ALTER TABLE "SalesOrder" DROP CONSTRAINT "SalesOrder_materialId_fkey";

-- DropForeignKey
ALTER TABLE "SalesOrder" DROP CONSTRAINT "SalesOrder_vehicleBrandId_fkey";

-- DropForeignKey
ALTER TABLE "SalesOrder" DROP CONSTRAINT "SalesOrder_vehicleModelId_fkey";

-- DropForeignKey
ALTER TABLE "SalesOrderItem" DROP CONSTRAINT "SalesOrderItem_blueprintVersionId_fkey";

-- DropForeignKey
ALTER TABLE "SalesOrderItem" DROP CONSTRAINT "SalesOrderItem_itemId_fkey";

-- DropForeignKey
ALTER TABLE "SpecField" DROP CONSTRAINT "SpecField_dependsOnFieldId_fkey";

-- DropForeignKey
ALTER TABLE "SpecField" DROP CONSTRAINT "SpecField_groupId_fkey";

-- DropForeignKey
ALTER TABLE "SpecField" DROP CONSTRAINT "SpecField_targetFieldId_fkey";

-- DropForeignKey
ALTER TABLE "SpecField" DROP CONSTRAINT "SpecField_targetGroupId_fkey";

-- DropForeignKey
ALTER TABLE "SpecFieldOption" DROP CONSTRAINT "SpecFieldOption_fieldId_fkey";

-- DropForeignKey
ALTER TABLE "StageEntry" DROP CONSTRAINT "StageEntry_jobCardId_fkey";

-- DropForeignKey
ALTER TABLE "StockLedgerEntry" DROP CONSTRAINT "StockLedgerEntry_itemId_fkey";

-- DropForeignKey
ALTER TABLE "UOMConversion" DROP CONSTRAINT "UOMConversion_itemId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_productionPlanId_fkey";

-- DropForeignKey
ALTER TABLE "_ItemGroupDefaultChecklist" DROP CONSTRAINT "_ItemGroupDefaultChecklist_A_fkey";

-- DropForeignKey
ALTER TABLE "_ItemGroupDefaultChecklist" DROP CONSTRAINT "_ItemGroupDefaultChecklist_B_fkey";

-- DropIndex
DROP INDEX "MaterialReservation_workOrderId_idx";

-- AlterTable
ALTER TABLE "MaterialReservation" DROP COLUMN "workOrderId";

-- AlterTable
ALTER TABLE "SalesOrderItem" DROP COLUMN "blueprintVersionId";

-- DropTable
DROP TABLE "BOM";

-- DropTable
DROP TABLE "BOMItem";

-- DropTable
DROP TABLE "Blueprint";

-- DropTable
DROP TABLE "BlueprintRouteStep";

-- DropTable
DROP TABLE "BlueprintVersion";

-- DropTable
DROP TABLE "BomContribution";

-- DropTable
DROP TABLE "BomTemplateLine";

-- DropTable
DROP TABLE "CheckpointSubmission";

-- DropTable
DROP TABLE "FactoryDocument";

-- DropTable
DROP TABLE "ImageEvidence";

-- DropTable
DROP TABLE "Inspection";

-- DropTable
DROP TABLE "ItemBomOverride";

-- DropTable
DROP TABLE "ItemFieldValue";

-- DropTable
DROP TABLE "ItemGroup";

-- DropTable
DROP TABLE "JobCard";

-- DropTable
DROP TABLE "ProductionPlan";

-- DropTable
DROP TABLE "QualityApproval";

-- DropTable
DROP TABLE "QualityReport";

-- DropTable
DROP TABLE "ReworkRecord";

-- DropTable
DROP TABLE "SpecField";

-- DropTable
DROP TABLE "SpecFieldOption";

-- DropTable
DROP TABLE "StageEntry";

-- DropTable
DROP TABLE "WorkOrder";

-- DropTable
DROP TABLE "_ItemGroupDefaultChecklist";

-- DropEnum
DROP TYPE "ManufacturingType";

-- RenameTable: ItemMaster becomes Product.
--
-- A rename rather than the drop-and-create `prisma migrate diff` generates: the
-- rows ARE the tenant's item catalogue, and inventory, purchasing and sales all
-- still point at them. Only the spec and BOM attachments are dropped.
ALTER TABLE "ItemMaster" RENAME TO "Product";

ALTER TABLE "Product" RENAME CONSTRAINT "ItemMaster_pkey" TO "Product_pkey";
ALTER TABLE "Product" RENAME CONSTRAINT "ItemMaster_categoryId_fkey" TO "Product_categoryId_fkey";
ALTER TABLE "Product" RENAME CONSTRAINT "ItemMaster_subcategoryId_fkey" TO "Product_subcategoryId_fkey";

ALTER INDEX "ItemMaster_sku_key" RENAME TO "Product_sku_key";
ALTER INDEX "ItemMaster_factoryId_idx" RENAME TO "Product_factoryId_idx";
ALTER INDEX "ItemMaster_factoryId_itemCode_key" RENAME TO "Product_factoryId_itemCode_key";

-- The spec-engine attachments. `groupId` pointed at the ItemGroup tree,
-- `specHash` was the hash of an item's spec answers, and `manufacturingType`
-- decided whether it had a BOM.
DROP INDEX IF EXISTS "ItemMaster_groupId_idx";
DROP INDEX IF EXISTS "ItemMaster_factoryId_specHash_key";
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "ItemMaster_groupId_fkey";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "groupId";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "specHash";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "manufacturingType";

-- AddForeignKey
ALTER TABLE "UOMConversion" ADD CONSTRAINT "UOMConversion_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLedgerEntry" ADD CONSTRAINT "StockLedgerEntry_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BinBalance" ADD CONSTRAINT "BinBalance_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReservation" ADD CONSTRAINT "MaterialReservation_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_vehicleBrandId_fkey" FOREIGN KEY ("vehicleBrandId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_vehicleModelId_fkey" FOREIGN KEY ("vehicleModelId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

