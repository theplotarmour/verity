-- AlterTable
ALTER TABLE "plywood_product" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'PHYSICAL',
ALTER COLUMN "thickness_tenth_mm" DROP NOT NULL,
ALTER COLUMN "width_mm" DROP NOT NULL,
ALTER COLUMN "height_mm" DROP NOT NULL;

-- RenameForeignKey
ALTER TABLE "plywood_customer_price" RENAME CONSTRAINT "plywood_customer_price_customer_fkey" TO "plywood_customer_price_tenant_id_customer_id_fkey";

-- RenameForeignKey
ALTER TABLE "plywood_customer_price" RENAME CONSTRAINT "plywood_customer_price_product_fkey" TO "plywood_customer_price_tenant_id_product_id_fkey";

-- RenameForeignKey
ALTER TABLE "plywood_invoice" RENAME CONSTRAINT "plywood_invoice_customer_fkey" TO "plywood_invoice_tenant_id_customer_id_fkey";

-- RenameForeignKey
ALTER TABLE "plywood_invoice" RENAME CONSTRAINT "plywood_invoice_purchase_order_fkey" TO "plywood_invoice_tenant_id_purchase_order_id_fkey";

-- RenameForeignKey
ALTER TABLE "plywood_invoice" RENAME CONSTRAINT "plywood_invoice_sales_order_fkey" TO "plywood_invoice_tenant_id_sales_order_id_fkey";

-- RenameForeignKey
ALTER TABLE "plywood_invoice" RENAME CONSTRAINT "plywood_invoice_series_fkey" TO "plywood_invoice_tenant_id_series_id_fkey";

-- RenameForeignKey
ALTER TABLE "plywood_invoice" RENAME CONSTRAINT "plywood_invoice_supplier_fkey" TO "plywood_invoice_tenant_id_supplier_id_fkey";

-- RenameForeignKey
ALTER TABLE "plywood_invoice_line" RENAME CONSTRAINT "plywood_invoice_line_invoice_fkey" TO "plywood_invoice_line_tenant_id_invoice_id_fkey";

-- RenameForeignKey
ALTER TABLE "plywood_invoice_line" RENAME CONSTRAINT "plywood_invoice_line_product_fkey" TO "plywood_invoice_line_tenant_id_product_id_fkey";

-- RenameForeignKey
ALTER TABLE "plywood_ledger_entry" RENAME CONSTRAINT "plywood_ledger_entry_customer_fkey" TO "plywood_ledger_entry_tenant_id_customer_id_fkey";

-- RenameForeignKey
ALTER TABLE "plywood_ledger_entry" RENAME CONSTRAINT "plywood_ledger_entry_invoice_fkey" TO "plywood_ledger_entry_tenant_id_invoice_id_fkey";

-- RenameForeignKey
ALTER TABLE "plywood_ledger_entry" RENAME CONSTRAINT "plywood_ledger_entry_payment_fkey" TO "plywood_ledger_entry_tenant_id_payment_id_fkey";

-- RenameForeignKey
ALTER TABLE "plywood_ledger_entry" RENAME CONSTRAINT "plywood_ledger_entry_supplier_fkey" TO "plywood_ledger_entry_tenant_id_supplier_id_fkey";

-- RenameForeignKey
ALTER TABLE "plywood_payment" RENAME CONSTRAINT "plywood_payment_invoice_fkey" TO "plywood_payment_tenant_id_invoice_id_fkey";

-- RenameForeignKey
ALTER TABLE "plywood_purchase_order" RENAME CONSTRAINT "plywood_purchase_order_location_fkey" TO "plywood_purchase_order_tenant_id_location_id_fkey";

-- RenameForeignKey
ALTER TABLE "plywood_purchase_order" RENAME CONSTRAINT "plywood_purchase_order_supplier_fkey" TO "plywood_purchase_order_tenant_id_supplier_id_fkey";

-- RenameForeignKey
ALTER TABLE "plywood_purchase_order_line" RENAME CONSTRAINT "plywood_purchase_order_line_order_fkey" TO "plywood_purchase_order_line_tenant_id_purchase_order_id_fkey";

-- RenameForeignKey
ALTER TABLE "plywood_purchase_order_line" RENAME CONSTRAINT "plywood_purchase_order_line_product_fkey" TO "plywood_purchase_order_line_tenant_id_product_id_fkey";

-- RenameForeignKey
ALTER TABLE "plywood_sales_order" RENAME CONSTRAINT "plywood_sales_order_customer_fkey" TO "plywood_sales_order_tenant_id_customer_id_fkey";

-- RenameForeignKey
ALTER TABLE "plywood_sales_order" RENAME CONSTRAINT "plywood_sales_order_location_fkey" TO "plywood_sales_order_tenant_id_location_id_fkey";

-- RenameForeignKey
ALTER TABLE "plywood_sales_order_line" RENAME CONSTRAINT "plywood_sales_order_line_order_fkey" TO "plywood_sales_order_line_tenant_id_sales_order_id_fkey";

-- RenameForeignKey
ALTER TABLE "plywood_sales_order_line" RENAME CONSTRAINT "plywood_sales_order_line_product_fkey" TO "plywood_sales_order_line_tenant_id_product_id_fkey";

-- RenameForeignKey
ALTER TABLE "plywood_shipment" RENAME CONSTRAINT "plywood_shipment_dest_customer_fkey" TO "plywood_shipment_tenant_id_dest_customer_id_fkey";

-- RenameForeignKey
ALTER TABLE "plywood_shipment" RENAME CONSTRAINT "plywood_shipment_dest_location_fkey" TO "plywood_shipment_tenant_id_dest_location_id_fkey";

-- RenameForeignKey
ALTER TABLE "plywood_shipment" RENAME CONSTRAINT "plywood_shipment_purchase_order_fkey" TO "plywood_shipment_tenant_id_purchase_order_id_fkey";

-- RenameForeignKey
ALTER TABLE "plywood_shipment" RENAME CONSTRAINT "plywood_shipment_sales_order_fkey" TO "plywood_shipment_tenant_id_sales_order_id_fkey";

-- RenameForeignKey
ALTER TABLE "plywood_shipment" RENAME CONSTRAINT "plywood_shipment_source_fkey" TO "plywood_shipment_tenant_id_source_location_id_fkey";

-- RenameForeignKey
ALTER TABLE "plywood_shipment" RENAME CONSTRAINT "plywood_shipment_transporter_fkey" TO "plywood_shipment_tenant_id_transporter_id_fkey";

-- RenameForeignKey
ALTER TABLE "plywood_shipment" RENAME CONSTRAINT "plywood_shipment_vehicle_fkey" TO "plywood_shipment_tenant_id_vehicle_asset_id_fkey";

-- RenameForeignKey
ALTER TABLE "plywood_stock_reservation" RENAME CONSTRAINT "plywood_stock_reservation_location_fkey" TO "plywood_stock_reservation_tenant_id_location_id_fkey";

-- RenameForeignKey
ALTER TABLE "plywood_stock_reservation" RENAME CONSTRAINT "plywood_stock_reservation_order_fkey" TO "plywood_stock_reservation_tenant_id_sales_order_id_fkey";

-- RenameForeignKey
ALTER TABLE "plywood_stock_reservation" RENAME CONSTRAINT "plywood_stock_reservation_product_fkey" TO "plywood_stock_reservation_tenant_id_product_id_fkey";

-- RenameForeignKey
ALTER TABLE "plywood_supplier_price" RENAME CONSTRAINT "plywood_supplier_price_product_fkey" TO "plywood_supplier_price_tenant_id_product_id_fkey";

-- RenameForeignKey
ALTER TABLE "plywood_supplier_price" RENAME CONSTRAINT "plywood_supplier_price_supplier_fkey" TO "plywood_supplier_price_tenant_id_supplier_id_fkey";

-- RenameForeignKey
ALTER TABLE "stock_balance" RENAME CONSTRAINT "stock_balance_location_fkey" TO "stock_balance_tenant_id_location_id_fkey";

-- RenameForeignKey
ALTER TABLE "stock_balance" RENAME CONSTRAINT "stock_balance_product_fkey" TO "stock_balance_tenant_id_product_id_fkey";

-- RenameForeignKey
ALTER TABLE "stock_ledger_entry" RENAME CONSTRAINT "stock_ledger_entry_location_fkey" TO "stock_ledger_entry_tenant_id_location_id_fkey";

-- RenameForeignKey
ALTER TABLE "stock_ledger_entry" RENAME CONSTRAINT "stock_ledger_entry_product_fkey" TO "stock_ledger_entry_tenant_id_product_id_fkey";

-- RenameForeignKey
ALTER TABLE "stock_ledger_entry" RENAME CONSTRAINT "stock_ledger_entry_rack_fkey" TO "stock_ledger_entry_tenant_id_rack_id_fkey";

-- RenameIndex
ALTER INDEX "plywood_customer_price_tenant_customer_product_key" RENAME TO "plywood_customer_price_tenant_id_customer_id_product_id_key";

-- RenameIndex
ALTER INDEX "plywood_invoice_series_tenant_key_year_key" RENAME TO "plywood_invoice_series_tenant_id_series_key_financial_year_key";

-- RenameIndex
ALTER INDEX "plywood_ledger_entry_tenant_customer_time_idx" RENAME TO "plywood_ledger_entry_tenant_id_customer_id_occurred_at_idx";

-- RenameIndex
ALTER INDEX "plywood_ledger_entry_tenant_supplier_time_idx" RENAME TO "plywood_ledger_entry_tenant_id_supplier_id_occurred_at_idx";

-- RenameIndex
ALTER INDEX "plywood_purchase_order_line_tenant_order_product_key" RENAME TO "plywood_purchase_order_line_tenant_id_purchase_order_id_pro_key";

-- RenameIndex
ALTER INDEX "plywood_sales_order_line_tenant_order_product_key" RENAME TO "plywood_sales_order_line_tenant_id_sales_order_id_product_i_key";

-- RenameIndex
ALTER INDEX "plywood_stock_reservation_tenant_product_location_released_idx" RENAME TO "plywood_stock_reservation_tenant_id_product_id_location_id__idx";

-- RenameIndex
ALTER INDEX "plywood_supplier_price_tenant_supplier_product_key" RENAME TO "plywood_supplier_price_tenant_id_supplier_id_product_id_key";

-- RenameIndex
ALTER INDEX "stock_ledger_entry_tenant_product_location_time_idx" RENAME TO "stock_ledger_entry_tenant_id_product_id_location_id_occurre_idx";
