# Carxen ERP – Inventory Module
> Manufacturing Inventory Management for Car Accessories

---

# Overview

The Inventory Module is the backbone of Carxen ERP. Every material movement—from purchasing raw materials to dispatching finished products—passes through this module.

Inventory should never be managed as just "stock". Instead, it should represent the complete lifecycle of every item in the factory.

```
Purchase
    ↓
Raw Material Inventory
    ↓
Material Issue
    ↓
Cutting
    ↓
Stitching
    ↓
QC
    ↓
Packing
    ↓
Finished Goods Inventory
    ↓
Dispatch
```

---

# Inventory Dashboard

Display live inventory KPIs.

## Stock Summary

- Total Inventory Value
- Raw Material Value
- WIP Value
- Finished Goods Value
- Reserved Inventory
- QC Hold Stock
- Rejected Stock

---

## Today's Activity

- Purchase Received
- Material Issued
- Production Consumed
- Finished Goods Added
- Dispatches
- Stock Adjustments

---

## Alerts

- Low Stock
- Out of Stock
- Negative Stock
- Reorder Suggestions
- Pending Purchase Orders
- Pending Material Requests

---

# Inventory Masters

These are created once and used throughout the ERP.

## Warehouse Master

Example

```
Raw Material Warehouse

Production Floor

Finished Goods Warehouse

QC Hold Area

Reject Area

Dispatch Warehouse
```

---

## Rack / Bin Master

Warehouse

↓

Zone

↓

Rack

↓

Shelf

↓

Bin

Example

```
Warehouse

└── Leather

      └── Rack A

            └── Shelf 2

                  └── Bin 5
```

---

## Unit of Measurement

Examples

- Meter
- Square Feet
- Kg
- Gram
- Piece
- Roll
- Set
- Box
- Packet

---

## Categories

### Raw Materials

- Leather
- Fabric
- Foam
- Thread
- PVC
- Velcro
- Elastic
- Zipper
- Labels
- Packaging

---

### Semi Finished Goods

- Driver Seat Panel
- Passenger Seat Panel
- Rear Seat Kit
- Headrest
- Armrest
- Door Pad
- Foam Kit
- Embroidery Panel

---

### Finished Goods

- Seat Covers
- Floor Mats
- Steering Covers
- Cushions
- Door Pads
- Boot Mats

---

### Consumables

- Needle
- Blade
- Oil
- Adhesive
- Marker
- Tape

---

# Item Master

Every inventory item should contain complete information.

## Basic Information

- Item Code
- Item Name
- Category
- Brand
- Description

---

## Product Information

- Material
- Color
- Vehicle
- Variant
- Model Year
- Unit

---

## Purchase Information

- Default Supplier
- Purchase Price
- Lead Time
- MOQ

---

## Inventory Information

- Warehouse
- Rack
- Minimum Stock
- Maximum Stock
- Reorder Level
- Safety Stock

---

## Production Information

- BOM Linked
- Routing Linked
- QC Template
- Production Stage

---

## Tax Information

- HSN Code
- GST Rate

---

## Identification

- Barcode
- QR Code
- Batch Enabled
- Serial Enabled (Optional)

---

# Inventory Classification

Carxen inventory should only exist in these four stages.

---

## Level 1

# Raw Materials

Examples

- Leather Roll
- Foam Roll
- Fabric Roll
- PVC Roll
- Thread
- Velcro
- Elastic
- Packing Box

---

## Level 2

# Semi Finished Goods

Created after Cutting.

Examples

- Driver Back Panel
- Driver Base Panel
- Passenger Back Panel
- Passenger Base Panel
- Rear Seat Panel
- Headrest
- Armrest
- Door Panel

---

## Level 3

# Work In Progress

Material currently inside production.

Example Status

- Cutting
- Stitching
- Embroidery
- QC
- Packing

---

## Level 4

# Finished Goods

Ready for dispatch.

Examples

Honda City 2024 Leather Beige

Creta Premium Black

Baleno Sport Tan

---

# Stock Movement Types

Every movement should automatically generate a stock transaction.

## Inward

- Purchase Receipt
- Customer Return
- Production Output
- Stock Transfer In
- Stock Adjustment +

---

## Outward

- Material Issue
- Sales Dispatch
- Production Consumption
- Vendor Return
- Stock Transfer Out
- Stock Adjustment -

---

# Inventory Status

Every stock quantity must always have one status.

```
Available

Reserved

Allocated

In Production

QC Hold

Rejected

Packed

Ready For Dispatch

Dispatched
```

---

# Batch Management

Maintain inventory batch-wise.

Each batch should contain

- Batch Number
- Supplier
- Purchase Date
- Manufacturing Date
- Quantity
- Remaining Quantity
- QC Status

---

# Material Reservation

When Sales creates an order

↓

Inventory automatically reserves stock

↓

Production can consume only reserved stock

↓

Dispatch removes reserved stock

---

# Stock Ledger

Every item should have a complete movement history.

Example

| Date | Transaction | Qty | Balance |
|-------|------------|------|---------|
| 12 Jul | Purchase | +50 | 50 |
| 13 Jul | Production Issue | -10 | 40 |
| 13 Jul | Production Return | +2 | 42 |
| 14 Jul | Dispatch | -15 | 27 |

---

# Reorder System

Each item should maintain

- Minimum Stock
- Maximum Stock
- Reorder Point
- Safety Stock
- Preferred Supplier
- Lead Time

ERP automatically generates Purchase Suggestions.

---

# Inventory Reports

## Stock Reports

- Stock Summary
- Stock Ledger
- Stock Valuation
- Inventory Aging

---

## Movement Reports

- Daily Inward
- Daily Outward
- Item Movement
- Warehouse Movement

---

## Analysis Reports

- Fast Moving Items
- Slow Moving Items
- Dead Stock
- Negative Stock
- Reorder Report

---

## Production Reports

- Material Consumption
- Material Variance
- BOM Usage
- WIP Report

---

# Carxen Recommended Inventory Flow

```
Supplier

↓

Purchase Order

↓

Purchase Receipt

↓

Raw Material Inventory

↓

Material Issue

↓

Cutting

↓

Semi Finished Inventory

↓

Stitching

↓

QC Hold

↓

Packing

↓

Finished Goods Inventory

↓

Sales Order

↓

Dispatch

↓

Customer
```

---

# Best Practices

- Never create separate inventory items for every seat cover variation unless they are sellable finished products.
- Manage inventory in **4 levels**: Raw Material → Semi-Finished → Work in Progress → Finished Goods.
- Use **Batch Numbers** for traceability instead of individual stock entries.
- Every inventory movement should be generated automatically by a Purchase, Production, QC, Transfer, or Sales transaction—avoid manual stock edits.
- Link every Finished Product to a **BOM (Bill of Materials)** so raw material consumption is automatic.
- Enable **Warehouse, Rack, and Bin tracking** for faster material retrieval.
- Maintain a complete **Stock Ledger** with audit history for every item.
- Use **Reorder Levels** and **Safety Stock** to generate purchase recommendations automatically.
- Keep inventory tightly integrated with **Purchase**, **Production**, **Quality Control**, and **Sales** modules to ensure real-time stock accuracy.

---

# Final Inventory Architecture

```
Inventory
│
├── Dashboard
│
├── Inventory Masters
│   ├── Warehouses
│   ├── Racks & Bins
│   ├── Units
│   ├── Categories
│   └── Item Master
│
├── Stock Transactions
│   ├── Inward
│   ├── Outward
│   ├── Transfers
│   └── Adjustments
│
├── Batch Management
│
├── Reservations
│
├── Warehouse Management
│
├── Stock Ledger
│
├── Stock Valuation
│
├── Reorder Planning
│
└── Reports
```# CARXEN ERP
## Manufacturing ERP + CRM + Product Lifecycle Management (PLM)

> Version: V1.0
> Company: Carxen Car Accessories
> Objective: Build a single source of truth for all products, inventory, manufacturing, purchasing, sales, CRM, and catalogue management.

---

# Vision

Carxen ERP is not just an ERP.

It is the complete operating system for the business.

Every department should work from one centralized Product Master.

Instead of maintaining products in multiple places, every module references the same Product ID.

```
                  Product Master
                        │
 ┌───────────────┬──────┼──────────────┬──────────────┐
 │               │      │              │              │
BOM         Inventory  Production     CRM       Customer Catalogue
 │               │      │              │              │
QC          Purchase    Planning     Sales      Dealer Portal
```

---

# Core Modules

1. Product Master
2. Product Variants
3. Vehicle Compatibility
4. Bill of Materials
5. Raw Material Management
6. Inventory
7. Warehouse
8. Vendors
9. Purchase
10. Production
11. Quality Control
12. Packing
13. Dispatch
14. CRM
15. Trading Products
16. Customer Catalogue
17. Documents
18. Reports
19. Dashboard

---

# PRODUCT MASTER

The Product Master is the heart of the ERP.

Every physical item sold by Carxen must exist here.

Types include:

- Manufactured Product
- Trading Product
- Raw Material
- Semi Finished Product
- Consumable
- Packaging Material
- Kit

Each Product receives one unique Product Code.

Example

```
CX-SC-SCORPIONN-ORTHO-BLK-001
```

---

# Product Information

## Basic Details

- Product Code
- Product Name
- Short Name
- Internal Name
- Description
- Status
- Launch Date

---

## Classification

- Category
- Sub Category
- Collection
- Product Family
- Product Type
- Manufacturing Type

Examples

Seat Covers

↓

Orthodrive

↓

Luxury Series

↓

Manufactured

---

## Vehicle Compatibility

Every product must know exactly which vehicle it supports.

Fields

- Manufacturer
- Model
- Variant
- Fuel Type
- Transmission
- Year From
- Year To
- Seat Layout
- Airbag Compatible
- Rear Split
- Armrest Type
- Headrest Type

Example

```
Mahindra

Scorpio N

Z8L

2024

Automatic

Airbag Compatible

60:40 Split
```

---

# Variant System

Never create duplicate products.

Instead use Variant Attributes.

Example

Vehicle

↓

Design

↓

Color

↓

Material

↓

Transmission

↓

Airbag

↓

Embroidery

↓

Foam Thickness

ERP automatically creates SKUs.

Example

```
Orthodrive

Black

Leatherette

Automatic

Airbag

Grey Stitch

10mm Foam
```

---

# Product Specifications

Every manufactured product stores

- Material
- Foam Thickness
- Stitch Type
- Embroidery
- Thread Color
- Edge Finish
- Weight
- Volume
- Packaging Type
- Warranty
- Installation Time

---

# Pricing

Multiple pricing supported.

MRP

Distributor Price

Dealer Price

Online Price

Wholesale Price

Offer Price

Cost Price

Current Manufacturing Cost

Profit %

---

# Product Media

Images

Front

Back

Installed

Close-up

Packaging

Videos

360°

Marketing Posters

Catalog PDF

Installation Guide

---

# PRODUCT DOCUMENTS

Each product stores every engineering document.

- Specification Sheet
- BOM
- QC Checklist
- Stitching SOP
- Packing SOP
- Pattern Files
- CAD Files
- DXF Files
- Embroidery Files

Version controlled.

---

# PRODUCT LIFECYCLE

```
Idea

↓

Vehicle Study

↓

CAD Design

↓

Pattern

↓

Sample

↓

Testing

↓

Approval

↓

Production

↓

QC

↓

Packing

↓

Sales

↓

Warranty
```

---

# BILL OF MATERIALS (BOM)

Every manufactured product contains one or more BOM Versions.

Example

Front Seat Cover

↓

Leather

Foam

Fabric

Thread

Zip

Velcro

Brand Label

Barcode

Packing Bag

Carton

Instruction Card

---

Each BOM Line stores

- Material
- Quantity
- Unit
- Scrap %
- Supplier
- Current Cost
- Last Cost
- Alternate Material

---

# RAW MATERIAL MASTER

Every material gets its own profile.

Examples

Leather

Fabric

Foam

PVC

Thread

Velcro

Zip

Label

Packaging

Each stores

- SKU
- Category
- Supplier
- Color
- GSM
- Thickness
- Width
- Roll Length
- MOQ
- Lead Time
- Cost
- Current Stock

---

# INVENTORY

Inventory is maintained using locations.

Warehouse

↓

Rack

↓

Shelf

↓

Bin

↓

Batch

↓

Roll

Example

```
Warehouse A

↓

Rack 3

↓

Shelf B

↓

Bin 4

↓

Roll 21
```

Inventory movements

Purchase

↓

GRN

↓

Warehouse

↓

Production Issue

↓

Work Order

↓

Finished Goods

↓

Dispatch

---

# PURCHASE MODULE

Vendor Database

↓

Quotation

↓

Purchase Order

↓

Approval

↓

Goods Receipt

↓

Inspection

↓

Stock

↓

Vendor Payment

Stores

- Vendor Rating
- Price History
- MOQ
- Lead Time
- GST
- Payment Terms

---

# VENDOR MASTER

Stores

Company

Contact Person

Phone

GST

PAN

Bank

Materials Supplied

Performance

Quality Score

Delivery Score

Purchase History

Outstanding Payments

---

# PRODUCTION PLANNING

Sales Order

↓

Material Availability

↓

Production Plan

↓

Work Orders

↓

Cutting

↓

Embroidery

↓

Stitching

↓

QC

↓

Packing

↓

Finished Goods

---

# CUTTING MODULE

Stores

Work Order

Operator

Machine

Material Used

Material Wastage

Expected Time

Actual Time

Output Pieces

Rejected Pieces

---

# STITCHING MODULE

Each bundle tracks

Bundle Number

Operator

Machine

Operation

Target Quantity

Completed

Rejected

Rework

Efficiency

Photos

---

# QUALITY CONTROL

Every product passes digital QC.

Workflow

Scan QR

↓

Load QC Sheet

↓

Perform Inspection

↓

Take Photos

↓

Approve

↓

Reject

↓

Rework

↓

Generate QC Sticker

Stores

Inspector

Date

Photos

Checklist

Remarks

Pass/Fail

---

# PACKING

Scan Product

↓

Verify Quantity

↓

Accessories

↓

Warranty Card

↓

Barcode

↓

Seal

↓

Packing Photos

↓

Ready for Dispatch

---

# DISPATCH

Order

↓

Invoice

↓

Courier

↓

Tracking

↓

Delivery

↓

Customer Confirmation

---

# TRADING PRODUCTS

Trading products do not go through manufacturing.

Stores

Brand

Vendor

Purchase Price

Selling Price

Stock

Warranty

Images

Compatibility

Supplier

Purchase History

---

# CRM

Complete customer management.

Lead

↓

Inquiry

↓

Quotation

↓

Negotiation

↓

Sales Order

↓

Production

↓

Dispatch

↓

After Sales

Customer stores

Name

Company

GST

Address

Dealer Type

Credit Limit

Outstanding

Sales History

Visit Notes

Documents

---

# CUSTOMER CATALOGUE

Every product automatically becomes part of the digital catalogue.

Customers can

Search by

Vehicle

↓

Brand

↓

Year

↓

Color

↓

Material

↓

Price

↓

Stock

↓

Compatible Accessories

↓

Download PDF

↓

Request Quote

Perfect for

- Dealers
- Retail Customers
- Distributors
- B2B
- B2C

---

# REPORTS

Inventory Valuation

Material Consumption

Vendor Performance

Purchase Analysis

Production Efficiency

QC Rejection

Operator Productivity

Sales

Profitability

Fast Moving Products

Slow Moving Products

Dealer Performance

---

# DASHBOARD

Owner Dashboard

Today's Sales

Production Status

Pending Orders

Inventory Alerts

Purchase Alerts

Low Stock

QC Status

Dispatch Status

Revenue

Expenses

Profit

Machine Utilization

Top Selling Products

---

# USER ROLES

## Admin

Complete ERP access

---

## Production Manager

Production Planning

Work Orders

Material Allocation

Machine Scheduling

---

## Store Manager

Inventory

Warehouses

Material Issues

GRN

Stock Transfer

---

## Purchase Executive

Vendor Management

Purchase Orders

Material Follow-up

Price Comparison

---

## Quality Inspector

QC

Rework

Inspection Reports

Photo Verification

---

## Sales Team

CRM

Quotations

Sales Orders

Customer Catalogue

Dealer Management

---

## Accounts

Invoices

Payments

Outstanding

Vendor Bills

Profit Reports

---

## Dealer

Product Catalogue

Order Placement

Order Tracking

Invoice Download

Warranty

---

# FUTURE MODULES

- AI Demand Forecasting
- AI Material Requirement Planning
- Barcode & QR Tracking
- RFID Inventory
- AI QC Defect Detection
- Dealer Mobile App
- Worker Mobile App
- Production TV Dashboard
- Customer Self-Service Portal
- Warranty Portal
- Service Centre Module
- Fleet & Logistics Module
- Multi Branch Support
- Multi Company Support
- Franchise Management
- API Integrations
- WhatsApp Integration
- Shopify Integration
- Tally Integration
- E-Invoice & E-Way Bill

---

# DESIGN PRINCIPLES

- Product-first architecture
- Mobile-first for shop floor
- Desktop-first for management
- Single source of truth
- Version controlled documents
- Complete audit trail
- QR-driven workflows
- Offline-capable PWA
- Modular architecture
- Scalable to multi-factory operations

---

# Final Principle

Everything in the ERP revolves around a single Product Master.

Every BOM, Specification Sheet, CAD File, Pattern, Inventory Record, Purchase Order, Work Order, QC Report, Sales Order, Dealer Catalogue, and Customer View references the same Product ID.

This ensures consistency, eliminates duplicate data, simplifies maintenance, and creates a unified digital backbone for Carxen's manufacturing and business operations.