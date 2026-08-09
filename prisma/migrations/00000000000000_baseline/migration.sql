-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'CO_OWNER', 'MANAGER', 'SUPERVISOR', 'WORKER', 'STORE_MANAGER');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('RAW_MATERIAL', 'SEMI_FINISHED', 'FINISHED_PRODUCT', 'CONSUMABLE', 'PACKAGING', 'SPARE_PART', 'MACHINERY', 'TOOL', 'ASSET', 'SERVICE');

-- CreateEnum
CREATE TYPE "SpecFieldKind" AS ENUM ('VALUE', 'OPTION', 'REFERENCE');

-- CreateEnum
CREATE TYPE "SpecRefTarget" AS ENUM ('ITEM_GROUP', 'VEHICLE_BRAND', 'VEHICLE_MODEL', 'VEHICLE_GENERATION', 'DESIGN', 'COLOR', 'SUPPLIER', 'CUSTOMER', 'WAREHOUSE', 'WAREHOUSE_BIN', 'EMPLOYEE', 'DEPARTMENT', 'MACHINE');

-- CreateEnum
CREATE TYPE "QCStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'WAITING_QC', 'APPROVED', 'REJECTED', 'REWORK_REQUIRED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'WARNING', 'SUCCESS', 'ERROR', 'ACTION_REQUIRED');

-- CreateEnum
CREATE TYPE "TimelineEventType" AS ENUM ('CREATED', 'UPDATED', 'APPROVED', 'REJECTED', 'STATUS_CHANGED', 'COMMENT_ADDED', 'FILE_ATTACHED');

-- CreateEnum
CREATE TYPE "ManufacturingType" AS ENUM ('MAKE', 'BUY', 'BOTH');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('RETAIL', 'DEALER', 'OEM', 'INTERNAL');

-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'SELECT', 'NUMBER', 'MEASUREMENT', 'TOGGLE', 'BUTTONS', 'CHECKBOX');

-- CreateTable
CREATE TABLE "ItemGroup" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "shortCode" TEXT,
    "itemType" "ItemType" NOT NULL,
    "nameTemplate" TEXT,
    "codeTemplate" TEXT,
    "isProducible" BOOLEAN NOT NULL DEFAULT false,
    "isPurchasable" BOOLEAN NOT NULL DEFAULT false,
    "isSalable" BOOLEAN NOT NULL DEFAULT false,
    "hasBOM" BOOLEAN NOT NULL DEFAULT false,
    "hasQC" BOOLEAN NOT NULL DEFAULT false,
    "hasRouting" BOOLEAN NOT NULL DEFAULT false,
    "hasCAD" BOOLEAN NOT NULL DEFAULT false,
    "defaultQcTemplateId" TEXT,
    "defaultRouteJson" JSONB,
    "isSheet" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecField" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "kind" "SpecFieldKind" NOT NULL,
    "valueType" "FieldType",
    "unitSuffix" TEXT,
    "refTarget" "SpecRefTarget",
    "targetGroupId" TEXT,
    "includeDescendants" BOOLEAN NOT NULL DEFAULT true,
    "dependsOnFieldId" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpecField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecFieldOption" (
    "id" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "shortCode" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SpecFieldOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Factory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "address" TEXT,
    "industry" TEXT,
    "settings" JSONB DEFAULT '{}',
    "onboardingStatus" TEXT NOT NULL DEFAULT 'SETUP',
    "setupFee" INTEGER NOT NULL DEFAULT 0,
    "monthlyFee" INTEGER NOT NULL DEFAULT 0,
    "modulesEnabled" TEXT DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Factory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agreement" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT,
    "factoryName" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "modules" JSONB NOT NULL DEFAULT '[]',
    "setupFee" INTEGER NOT NULL DEFAULT 0,
    "monthlyFee" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "acceptedAt" TIMESTAMP(3),
    "signature" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportSession" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "internalUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStage" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "requirePhoto" BOOLEAN NOT NULL DEFAULT false,
    "requireRemarks" BOOLEAN NOT NULL DEFAULT false,
    "isQcStage" BOOLEAN NOT NULL DEFAULT false,
    "assignedRole" "Role",
    "qcTemplateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "authId" TEXT,
    "name" TEXT NOT NULL,
    "employeeId" SERIAL NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "pinHash" TEXT,
    "email" TEXT,
    "notificationPrefs" JSONB,
    "language" TEXT NOT NULL DEFAULT 'en',
    "themePreference" TEXT NOT NULL DEFAULT 'system',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdById" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "departmentId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isQcStage" BOOLEAN NOT NULL DEFAULT false,
    "requirePhoto" BOOLEAN NOT NULL DEFAULT false,
    "requireRemarks" BOOLEAN NOT NULL DEFAULT false,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "templateId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "capacity" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineEvent" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "eventType" "TimelineEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "actorId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'INFO',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "linkUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "approverId" TEXT,
    "approverRole" "Role",
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemMaster" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "itemCode" TEXT,
    "itemType" "ItemType" NOT NULL,
    "defaultUOM" TEXT NOT NULL,
    "secondaryUOM" TEXT,
    "brand" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "aliasName" TEXT,
    "searchKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "valuationMethod" TEXT NOT NULL DEFAULT 'FIFO',
    "isBatchTracked" BOOLEAN NOT NULL DEFAULT false,
    "minStockLevel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "safetyStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hsnCode" TEXT,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "categoryId" TEXT,
    "subcategoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "customFields" JSONB DEFAULT '{}',
    "groupId" TEXT,
    "manufacturingType" "ManufacturingType" NOT NULL DEFAULT 'BUY',
    "specHash" TEXT,

    CONSTRAINT "ItemMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemFieldValue" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "valueText" TEXT,
    "valueNumber" DOUBLE PRECISION,
    "valueBool" BOOLEAN,
    "optionId" TEXT,
    "valueItemId" TEXT,
    "valueRefId" TEXT,

    CONSTRAINT "ItemFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BomTemplateLine" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "itemId" TEXT,
    "sourceFieldId" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "quantityFrom" TEXT,
    "wastePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BomTemplateLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemFieldDefinition" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemFieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialCategory" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "MaterialCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialSubcategory" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "MaterialSubcategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UOMConversion" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "fromUOM" TEXT NOT NULL,
    "toUOM" TEXT NOT NULL,
    "conversionFactor" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "UOMConversion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'WAREHOUSE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseZone" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT,
    "warehouseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "WarehouseZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseRack" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT,
    "zoneId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "WarehouseRack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseShelf" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT,
    "rackId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "WarehouseShelf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseBin" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT,
    "shelfId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "WarehouseBin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLedgerEntry" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "binId" TEXT NOT NULL,
    "quantityChange" DOUBLE PRECISION NOT NULL,
    "valuationRate" DOUBLE PRECISION NOT NULL,
    "totalValue" DOUBLE PRECISION NOT NULL,
    "batchNumber" TEXT,
    "referenceDocType" TEXT,
    "referenceDocId" TEXT,
    "adjustmentType" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "stockStatus" TEXT,
    "supplierId" TEXT,
    "manufacturedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BinBalance" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "binId" TEXT NOT NULL,
    "stockAvailable" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stockQcHold" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stockRejected" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BinBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialReservation" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "productionPlanId" TEXT,
    "workOrderId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecBOM" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "refType" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "items" JSONB NOT NULL,

    CONSTRAINT "SpecBOM_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispatch" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "destinationType" TEXT NOT NULL,
    "destinationWarehouseId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "address" TEXT,
    "transporter" TEXT,
    "vehicleNo" TEXT,
    "trackingId" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_TRANSIT',
    "dispatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "Dispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "skuPrefix" TEXT,
    "description" TEXT,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Blueprint" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "activeVersionId" TEXT,

    CONSTRAINT "Blueprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlueprintVersion" (
    "id" TEXT NOT NULL,
    "blueprintId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "estimatedTimeMins" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qcTemplateId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlueprintVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlueprintRouteStep" (
    "id" TEXT NOT NULL,
    "blueprintVersionId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "estimatedTimeMins" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "requiredSkills" TEXT[],
    "instructions" TEXT,

    CONSTRAINT "BlueprintRouteStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactoryDocument" (
    "id" TEXT NOT NULL,
    "blueprintVersionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FactoryDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleBrand" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "VehicleBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleModel" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT,
    "year" TEXT,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "VehicleModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleGeneration" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT,
    "modelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "allowedSeatTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowedHeadrests" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "allowedArmrests" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "VehicleGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleYear" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT,
    "generationId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,

    CONSTRAINT "VehicleYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleVariant" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT,
    "yearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "VehicleVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVehicleFitment" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "vehicleVariantId" TEXT,
    "vehicleYearId" TEXT,
    "vehicleGenerationId" TEXT,
    "vehicleModelId" TEXT,
    "fitmentNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductVehicleFitment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "gst" TEXT,
    "pan" TEXT,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "paymentTerms" TEXT,
    "leadTimeDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRequest" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "prNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "requiredByDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDate" TIMESTAMP(3),

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "receivedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseReceipt" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "receiptDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedById" TEXT,

    CONSTRAINT "PurchaseReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseReceiptItem" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "batchNumber" TEXT,

    CONSTRAINT "PurchaseReceiptItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseInvoice" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BOM" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "blueprintVersionId" TEXT NOT NULL,

    CONSTRAINT "BOM_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BOMItem" (
    "id" TEXT NOT NULL,
    "bomId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "wastePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "BOMItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionPlan" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "salesOrderId" TEXT,
    "blueprintVersionId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "targetStartDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "woNumber" TEXT NOT NULL,
    "productionPlanId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "targetQty" DOUBLE PRECISION NOT NULL,
    "producedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobCard" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "stageId" TEXT,
    "reworkReason" TEXT,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetQty" DOUBLE PRECISION NOT NULL,
    "completedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "timeSpentMins" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "templateId" TEXT,

    CONSTRAINT "JobCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageEntry" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "jobCardId" TEXT NOT NULL,
    "submittedById" TEXT,
    "beforeImages" JSONB,
    "afterImages" JSONB,
    "measurements" TEXT,
    "materialNotes" TEXT,
    "remarks" TEXT,
    "checklist" JSONB,
    "outcome" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StageEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "customerCode" TEXT,
    "name" TEXT NOT NULL,
    "companyName" TEXT,
    "phone" TEXT,
    "altPhone" TEXT,
    "email" TEXT,
    "gstNumber" TEXT,
    "billingAddress" TEXT,
    "shippingAddress" TEXT,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "assignedSalesperson" TEXT,
    "creditLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentTerms" TEXT,
    "customFields" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "customerId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "stage" TEXT NOT NULL,
    "probability" INTEGER NOT NULL DEFAULT 50,
    "expectedClose" TIMESTAMP(3),
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrder" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "soNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdById" TEXT,
    "orderType" "OrderType" NOT NULL DEFAULT 'RETAIL',
    "labelCode" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expectedDeliveryDate" TIMESTAMP(3),
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "itemId" TEXT,
    "materialId" TEXT,
    "designId" TEXT,
    "colorId" TEXT,
    "productTypeId" TEXT,
    "inspectorId" TEXT,
    "fulfilledFromOrderId" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "fulfilledFromStockQty" DOUBLE PRECISION DEFAULT 0,
    "productionBatchId" TEXT,
    "vehicleBrandId" TEXT,
    "vehicleModelId" TEXT,
    "vehicleYear" TEXT,
    "seatType" TEXT,
    "hasArmrest" BOOLEAN NOT NULL DEFAULT false,
    "headrestCount" INTEGER,
    "remarks" TEXT,
    "photoReference" TEXT,
    "dynamicData" JSONB,

    CONSTRAINT "SalesOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Design" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "category" TEXT,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fabricConsumption" DOUBLE PRECISION,
    "cadFileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Design_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Color" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Color_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCombination" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "generation" TEXT,
    "category" TEXT,
    "product" TEXT,
    "seatType" TEXT NOT NULL DEFAULT 'DB',
    "headrests" INTEGER NOT NULL DEFAULT 4,
    "armrest" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCombination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductType" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductField" (
    "id" TEXT NOT NULL,
    "productTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FieldType" NOT NULL,
    "options" JSONB,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionBatch" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrderItem" (
    "id" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "blueprintVersionId" TEXT,
    "unitPrice" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SalesOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "dateOfJoining" TIMESTAMP(3) NOT NULL,
    "employmentType" TEXT NOT NULL,
    "hourlyRate" DOUBLE PRECISION,
    "skills" TEXT[],
    "defaultShiftId" TEXT,

    CONSTRAINT "EmployeeProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "gracePeriodMins" INTEGER NOT NULL DEFAULT 15,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceLog" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shiftId" TEXT,
    "clockIn" TIMESTAMP(3) NOT NULL,
    "clockOut" TIMESTAMP(3),
    "isLate" BOOLEAN NOT NULL DEFAULT false,
    "overtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,

    CONSTRAINT "AttendanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveApplication" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leaveType" TEXT NOT NULL,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "approvedById" TEXT,

    CONSTRAINT "LeaveApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QCTemplate" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "isLatest" BOOLEAN NOT NULL DEFAULT true,
    "parentTemplateId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "requiresVideo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QCTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateSection" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleHi" TEXT,
    "titleHinglish" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Checkpoint" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameHi" TEXT,
    "nameHinglish" TEXT,
    "instructions" TEXT NOT NULL,
    "instructionsHi" TEXT,
    "instructionsHinglish" TEXT,
    "requireImage" BOOLEAN NOT NULL DEFAULT false,
    "requireRemarks" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Checkpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "jobCardId" TEXT NOT NULL,
    "status" "QCStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "videoUrl" TEXT,
    "videoPath" TEXT,
    "videoDurationSec" DOUBLE PRECISION,
    "videoUploadedAt" TIMESTAMP(3),
    "videoUploadedById" TEXT,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckpointSubmission" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "checkpointId" TEXT NOT NULL,
    "passFail" TEXT,
    "remarks" TEXT,
    "completedAt" TIMESTAMP(3),
    "verificationStatus" TEXT,
    "inspectorComment" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckpointSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageEvidence" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImageEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityApproval" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "inspectorId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualityApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityReport" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "verificationCode" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QualityReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReworkRecord" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "defectCode" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "comments" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReworkRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ProductToQCTemplate" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProductToQCTemplate_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "ItemGroup_factoryId_idx" ON "ItemGroup"("factoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemGroup_factoryId_parentId_name_key" ON "ItemGroup"("factoryId", "parentId", "name");

-- CreateIndex
CREATE INDEX "SpecField_factoryId_idx" ON "SpecField"("factoryId");

-- CreateIndex
CREATE UNIQUE INDEX "SpecField_groupId_key_key" ON "SpecField"("groupId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "SpecFieldOption_fieldId_value_key" ON "SpecFieldOption"("fieldId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "Factory_slug_key" ON "Factory"("slug");

-- CreateIndex
CREATE INDEX "Agreement_factoryId_idx" ON "Agreement"("factoryId");

-- CreateIndex
CREATE INDEX "SupportSession_factoryId_idx" ON "SupportSession"("factoryId");

-- CreateIndex
CREATE INDEX "SupportSession_internalUserId_idx" ON "SupportSession"("internalUserId");

-- CreateIndex
CREATE INDEX "WorkflowStage_factoryId_idx" ON "WorkflowStage"("factoryId");

-- CreateIndex
CREATE UNIQUE INDEX "User_authId_key" ON "User"("authId");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "Department_factoryId_idx" ON "Department"("factoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_factoryId_name_key" ON "Department"("factoryId", "name");

-- CreateIndex
CREATE INDEX "TimelineEvent_factoryId_idx" ON "TimelineEvent"("factoryId");

-- CreateIndex
CREATE INDEX "TimelineEvent_entityType_entityId_idx" ON "TimelineEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Comment_factoryId_idx" ON "Comment"("factoryId");

-- CreateIndex
CREATE INDEX "Comment_entityType_entityId_idx" ON "Comment"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Attachment_factoryId_idx" ON "Attachment"("factoryId");

-- CreateIndex
CREATE INDEX "Attachment_entityType_entityId_idx" ON "Attachment"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Notification_factoryId_idx" ON "Notification"("factoryId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "AuditLog_factoryId_idx" ON "AuditLog"("factoryId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Approval_factoryId_idx" ON "Approval"("factoryId");

-- CreateIndex
CREATE INDEX "Approval_entityType_entityId_idx" ON "Approval"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemMaster_sku_key" ON "ItemMaster"("sku");

-- CreateIndex
CREATE INDEX "ItemMaster_factoryId_idx" ON "ItemMaster"("factoryId");

-- CreateIndex
CREATE INDEX "ItemMaster_groupId_idx" ON "ItemMaster"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemMaster_factoryId_itemCode_key" ON "ItemMaster"("factoryId", "itemCode");

-- CreateIndex
CREATE UNIQUE INDEX "ItemMaster_factoryId_specHash_key" ON "ItemMaster"("factoryId", "specHash");

-- CreateIndex
CREATE INDEX "ItemFieldValue_valueItemId_idx" ON "ItemFieldValue"("valueItemId");

-- CreateIndex
CREATE INDEX "ItemFieldValue_factoryId_fieldId_idx" ON "ItemFieldValue"("factoryId", "fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemFieldValue_itemId_fieldId_key" ON "ItemFieldValue"("itemId", "fieldId");

-- CreateIndex
CREATE INDEX "BomTemplateLine_factoryId_idx" ON "BomTemplateLine"("factoryId");

-- CreateIndex
CREATE INDEX "BomTemplateLine_groupId_idx" ON "BomTemplateLine"("groupId");

-- CreateIndex
CREATE INDEX "ItemFieldDefinition_factoryId_idx" ON "ItemFieldDefinition"("factoryId");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialCategory_factoryId_name_key" ON "MaterialCategory"("factoryId", "name");

-- CreateIndex
CREATE INDEX "MaterialSubcategory_factoryId_idx" ON "MaterialSubcategory"("factoryId");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialSubcategory_factoryId_categoryId_name_key" ON "MaterialSubcategory"("factoryId", "categoryId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_factoryId_name_key" ON "Warehouse"("factoryId", "name");

-- CreateIndex
CREATE INDEX "StockLedgerEntry_factoryId_idx" ON "StockLedgerEntry"("factoryId");

-- CreateIndex
CREATE INDEX "StockLedgerEntry_itemId_idx" ON "StockLedgerEntry"("itemId");

-- CreateIndex
CREATE INDEX "StockLedgerEntry_binId_idx" ON "StockLedgerEntry"("binId");

-- CreateIndex
CREATE UNIQUE INDEX "BinBalance_itemId_binId_key" ON "BinBalance"("itemId", "binId");

-- CreateIndex
CREATE INDEX "MaterialReservation_factoryId_idx" ON "MaterialReservation"("factoryId");

-- CreateIndex
CREATE INDEX "MaterialReservation_workOrderId_idx" ON "MaterialReservation"("workOrderId");

-- CreateIndex
CREATE INDEX "SpecBOM_factoryId_idx" ON "SpecBOM"("factoryId");

-- CreateIndex
CREATE UNIQUE INDEX "SpecBOM_refType_refId_key" ON "SpecBOM"("refType", "refId");

-- CreateIndex
CREATE INDEX "Dispatch_factoryId_idx" ON "Dispatch"("factoryId");

-- CreateIndex
CREATE INDEX "Dispatch_salesOrderId_idx" ON "Dispatch"("salesOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_factoryId_name_key" ON "ProductCategory"("factoryId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_itemId_key" ON "ProductVariant"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Blueprint_itemId_key" ON "Blueprint"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "BlueprintVersion_blueprintId_versionNumber_key" ON "BlueprintVersion"("blueprintId", "versionNumber");

-- CreateIndex
CREATE INDEX "ProductVehicleFitment_productVariantId_idx" ON "ProductVehicleFitment"("productVariantId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseRequest_prNumber_key" ON "PurchaseRequest"("prNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseReceipt_receiptNumber_key" ON "PurchaseReceipt"("receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseInvoice_invoiceNumber_key" ON "PurchaseInvoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "BOM_blueprintVersionId_key" ON "BOM"("blueprintVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_woNumber_key" ON "WorkOrder"("woNumber");

-- CreateIndex
CREATE INDEX "JobCard_factoryId_idx" ON "JobCard"("factoryId");

-- CreateIndex
CREATE INDEX "JobCard_workOrderId_idx" ON "JobCard"("workOrderId");

-- CreateIndex
CREATE INDEX "StageEntry_jobCardId_idx" ON "StageEntry"("jobCardId");

-- CreateIndex
CREATE INDEX "StageEntry_factoryId_idx" ON "StageEntry"("factoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_factoryId_customerCode_key" ON "Customer"("factoryId", "customerCode");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_soNumber_key" ON "SalesOrder"("soNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_labelCode_key" ON "SalesOrder"("labelCode");

-- CreateIndex
CREATE INDEX "Design_factoryId_idx" ON "Design"("factoryId");

-- CreateIndex
CREATE INDEX "Color_factoryId_idx" ON "Color"("factoryId");

-- CreateIndex
CREATE INDEX "ProductCombination_factoryId_idx" ON "ProductCombination"("factoryId");

-- CreateIndex
CREATE INDEX "ProductType_factoryId_idx" ON "ProductType"("factoryId");

-- CreateIndex
CREATE INDEX "ProductField_productTypeId_idx" ON "ProductField"("productTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionBatch_batchNumber_key" ON "ProductionBatch"("batchNumber");

-- CreateIndex
CREATE INDEX "ProductionBatch_factoryId_idx" ON "ProductionBatch"("factoryId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeProfile_userId_key" ON "EmployeeProfile"("userId");

-- CreateIndex
CREATE INDEX "QCTemplate_factoryId_idx" ON "QCTemplate"("factoryId");

-- CreateIndex
CREATE INDEX "QCTemplate_parentTemplateId_idx" ON "QCTemplate"("parentTemplateId");

-- CreateIndex
CREATE INDEX "TemplateSection_factoryId_idx" ON "TemplateSection"("factoryId");

-- CreateIndex
CREATE INDEX "TemplateSection_templateId_idx" ON "TemplateSection"("templateId");

-- CreateIndex
CREATE INDEX "Checkpoint_factoryId_idx" ON "Checkpoint"("factoryId");

-- CreateIndex
CREATE INDEX "Checkpoint_sectionId_idx" ON "Checkpoint"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "Inspection_jobCardId_key" ON "Inspection"("jobCardId");

-- CreateIndex
CREATE INDEX "Inspection_factoryId_idx" ON "Inspection"("factoryId");

-- CreateIndex
CREATE INDEX "Inspection_factoryId_status_idx" ON "Inspection"("factoryId", "status");

-- CreateIndex
CREATE INDEX "CheckpointSubmission_factoryId_idx" ON "CheckpointSubmission"("factoryId");

-- CreateIndex
CREATE INDEX "CheckpointSubmission_inspectionId_idx" ON "CheckpointSubmission"("inspectionId");

-- CreateIndex
CREATE UNIQUE INDEX "QualityApproval_inspectionId_key" ON "QualityApproval"("inspectionId");

-- CreateIndex
CREATE UNIQUE INDEX "QualityReport_inspectionId_key" ON "QualityReport"("inspectionId");

-- CreateIndex
CREATE UNIQUE INDEX "QualityReport_verificationCode_key" ON "QualityReport"("verificationCode");

-- CreateIndex
CREATE INDEX "QualityReport_factoryId_idx" ON "QualityReport"("factoryId");

-- CreateIndex
CREATE INDEX "QualityReport_verificationCode_idx" ON "QualityReport"("verificationCode");

-- CreateIndex
CREATE INDEX "_ProductToQCTemplate_B_index" ON "_ProductToQCTemplate"("B");

-- AddForeignKey
ALTER TABLE "ItemGroup" ADD CONSTRAINT "ItemGroup_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ItemGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemGroup" ADD CONSTRAINT "ItemGroup_defaultQcTemplateId_fkey" FOREIGN KEY ("defaultQcTemplateId") REFERENCES "QCTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecField" ADD CONSTRAINT "SpecField_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ItemGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecField" ADD CONSTRAINT "SpecField_targetGroupId_fkey" FOREIGN KEY ("targetGroupId") REFERENCES "ItemGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecField" ADD CONSTRAINT "SpecField_dependsOnFieldId_fkey" FOREIGN KEY ("dependsOnFieldId") REFERENCES "SpecField"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecFieldOption" ADD CONSTRAINT "SpecFieldOption_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "SpecField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "Factory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportSession" ADD CONSTRAINT "SupportSession_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "Factory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStage" ADD CONSTRAINT "WorkflowStage_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "Factory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "Factory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "Factory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "QCTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemMaster" ADD CONSTRAINT "ItemMaster_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MaterialCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemMaster" ADD CONSTRAINT "ItemMaster_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "MaterialSubcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemMaster" ADD CONSTRAINT "ItemMaster_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ItemGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemFieldValue" ADD CONSTRAINT "ItemFieldValue_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemFieldValue" ADD CONSTRAINT "ItemFieldValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "SpecField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemFieldValue" ADD CONSTRAINT "ItemFieldValue_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "SpecFieldOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemFieldValue" ADD CONSTRAINT "ItemFieldValue_valueItemId_fkey" FOREIGN KEY ("valueItemId") REFERENCES "ItemMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomTemplateLine" ADD CONSTRAINT "BomTemplateLine_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ItemGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomTemplateLine" ADD CONSTRAINT "BomTemplateLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomTemplateLine" ADD CONSTRAINT "BomTemplateLine_sourceFieldId_fkey" FOREIGN KEY ("sourceFieldId") REFERENCES "SpecField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialSubcategory" ADD CONSTRAINT "MaterialSubcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MaterialCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UOMConversion" ADD CONSTRAINT "UOMConversion_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseZone" ADD CONSTRAINT "WarehouseZone_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseRack" ADD CONSTRAINT "WarehouseRack_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "WarehouseZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseShelf" ADD CONSTRAINT "WarehouseShelf_rackId_fkey" FOREIGN KEY ("rackId") REFERENCES "WarehouseRack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseBin" ADD CONSTRAINT "WarehouseBin_shelfId_fkey" FOREIGN KEY ("shelfId") REFERENCES "WarehouseShelf"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLedgerEntry" ADD CONSTRAINT "StockLedgerEntry_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLedgerEntry" ADD CONSTRAINT "StockLedgerEntry_binId_fkey" FOREIGN KEY ("binId") REFERENCES "WarehouseBin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BinBalance" ADD CONSTRAINT "BinBalance_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BinBalance" ADD CONSTRAINT "BinBalance_binId_fkey" FOREIGN KEY ("binId") REFERENCES "WarehouseBin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReservation" ADD CONSTRAINT "MaterialReservation_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReservation" ADD CONSTRAINT "MaterialReservation_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispatch" ADD CONSTRAINT "Dispatch_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispatch" ADD CONSTRAINT "Dispatch_destinationWarehouseId_fkey" FOREIGN KEY ("destinationWarehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blueprint" ADD CONSTRAINT "Blueprint_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintVersion" ADD CONSTRAINT "BlueprintVersion_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "Blueprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintVersion" ADD CONSTRAINT "BlueprintVersion_qcTemplateId_fkey" FOREIGN KEY ("qcTemplateId") REFERENCES "QCTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintRouteStep" ADD CONSTRAINT "BlueprintRouteStep_blueprintVersionId_fkey" FOREIGN KEY ("blueprintVersionId") REFERENCES "BlueprintVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintRouteStep" ADD CONSTRAINT "BlueprintRouteStep_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactoryDocument" ADD CONSTRAINT "FactoryDocument_blueprintVersionId_fkey" FOREIGN KEY ("blueprintVersionId") REFERENCES "BlueprintVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleModel" ADD CONSTRAINT "VehicleModel_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "VehicleBrand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleGeneration" ADD CONSTRAINT "VehicleGeneration_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "VehicleModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleYear" ADD CONSTRAINT "VehicleYear_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "VehicleGeneration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleVariant" ADD CONSTRAINT "VehicleVariant_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "VehicleYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVehicleFitment" ADD CONSTRAINT "ProductVehicleFitment_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVehicleFitment" ADD CONSTRAINT "ProductVehicleFitment_vehicleVariantId_fkey" FOREIGN KEY ("vehicleVariantId") REFERENCES "VehicleVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVehicleFitment" ADD CONSTRAINT "ProductVehicleFitment_vehicleYearId_fkey" FOREIGN KEY ("vehicleYearId") REFERENCES "VehicleYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVehicleFitment" ADD CONSTRAINT "ProductVehicleFitment_vehicleGenerationId_fkey" FOREIGN KEY ("vehicleGenerationId") REFERENCES "VehicleGeneration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVehicleFitment" ADD CONSTRAINT "ProductVehicleFitment_vehicleModelId_fkey" FOREIGN KEY ("vehicleModelId") REFERENCES "VehicleModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "ItemMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceiptItem" ADD CONSTRAINT "PurchaseReceiptItem_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "PurchaseReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOM" ADD CONSTRAINT "BOM_blueprintVersionId_fkey" FOREIGN KEY ("blueprintVersionId") REFERENCES "BlueprintVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOMItem" ADD CONSTRAINT "BOMItem_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "BOM"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOMItem" ADD CONSTRAINT "BOMItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionPlan" ADD CONSTRAINT "ProductionPlan_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionPlan" ADD CONSTRAINT "ProductionPlan_blueprintVersionId_fkey" FOREIGN KEY ("blueprintVersionId") REFERENCES "BlueprintVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_productionPlanId_fkey" FOREIGN KEY ("productionPlanId") REFERENCES "ProductionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCard" ADD CONSTRAINT "JobCard_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCard" ADD CONSTRAINT "JobCard_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCard" ADD CONSTRAINT "JobCard_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "WorkflowStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCard" ADD CONSTRAINT "JobCard_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCard" ADD CONSTRAINT "JobCard_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "QCTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageEntry" ADD CONSTRAINT "StageEntry_jobCardId_fkey" FOREIGN KEY ("jobCardId") REFERENCES "JobCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "ItemMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "Color"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_productionBatchId_fkey" FOREIGN KEY ("productionBatchId") REFERENCES "ProductionBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_vehicleBrandId_fkey" FOREIGN KEY ("vehicleBrandId") REFERENCES "VehicleBrand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_vehicleModelId_fkey" FOREIGN KEY ("vehicleModelId") REFERENCES "VehicleModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Design" ADD CONSTRAINT "Design_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductField" ADD CONSTRAINT "ProductField_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_blueprintVersionId_fkey" FOREIGN KEY ("blueprintVersionId") REFERENCES "BlueprintVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QCTemplate" ADD CONSTRAINT "QCTemplate_parentTemplateId_fkey" FOREIGN KEY ("parentTemplateId") REFERENCES "QCTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateSection" ADD CONSTRAINT "TemplateSection_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "QCTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checkpoint" ADD CONSTRAINT "Checkpoint_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "TemplateSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_jobCardId_fkey" FOREIGN KEY ("jobCardId") REFERENCES "JobCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckpointSubmission" ADD CONSTRAINT "CheckpointSubmission_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckpointSubmission" ADD CONSTRAINT "CheckpointSubmission_checkpointId_fkey" FOREIGN KEY ("checkpointId") REFERENCES "Checkpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageEvidence" ADD CONSTRAINT "ImageEvidence_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "CheckpointSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityApproval" ADD CONSTRAINT "QualityApproval_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityReport" ADD CONSTRAINT "QualityReport_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReworkRecord" ADD CONSTRAINT "ReworkRecord_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductToQCTemplate" ADD CONSTRAINT "_ProductToQCTemplate_A_fkey" FOREIGN KEY ("A") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductToQCTemplate" ADD CONSTRAINT "_ProductToQCTemplate_B_fkey" FOREIGN KEY ("B") REFERENCES "QCTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

