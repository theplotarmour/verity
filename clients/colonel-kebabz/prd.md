# VERITY — COLONEL KEBABZ

## Multi-Outlet Restaurant ERP, CRM & Franchise Operations Platform

**Document Type:** Product Requirements & Functional Specification
**Client:** Colonel Kebabz
**Platform:** Verity by PlotArmour
**Version:** 1.0
**Status:** Product Definition
**Business Model:** Multi-outlet restaurant / franchise
**Primary Outlets:**

1. **Defence Colony** — Parent / legacy outlet near Defence Colony Main Market
2. **R.K. Puram / Som Vihar** — K-11, Som Vihar Apartments, near Tamil Sangam
3. **Gurugram** — Ireo City Central, Sector 59

---

# 1. PRODUCT OVERVIEW

Verity for Colonel Kebabz is a centralized restaurant business operating system designed to manage all Colonel Kebabz outlets from a single platform.

The system must provide:

* Centralized HQ control
* Outlet-level operations
* Franchise management
* POS/order synchronization
* Inventory management
* Recipe and food-cost management
* Procurement
* Vendor management
* Kitchen operations
* Staff management
* Attendance and payroll inputs
* Customer CRM
* Loyalty and retention
* Marketing campaigns
* Reviews and reputation
* Finance and outlet accounting
* Sales analytics
* Multi-channel order management
* Delivery-platform reconciliation
* Expense management
* Compliance and audit trails
* Dashboards and business intelligence

The platform should answer three fundamental questions at all times:

> **What is happening across Colonel Kebabz?**

> **Why is it happening?**

> **What action should the business take?**

---

# 2. BUSINESS STRUCTURE

Verity must support a hierarchical structure.

```text
Colonel Kebabz
│
├── HQ / Corporate
│
├── Defence Colony
│   ├── POS
│   ├── Kitchen
│   ├── Inventory
│   ├── Staff
│   └── Customers
│
├── R.K. Puram / Som Vihar
│   ├── POS
│   ├── Kitchen
│   ├── Inventory
│   ├── Staff
│   └── Customers
│
└── Gurugram
    ├── POS
    ├── Kitchen
    ├── Inventory
    ├── Staff
    └── Customers
```

The architecture must support adding future outlets without changing the core system.

---

# 3. CORE DESIGN PRINCIPLES

## 3.1 HQ-first visibility

HQ should be able to see all outlets from a single dashboard.

## 3.2 Outlet autonomy

Outlet managers should only see and manage information relevant to their outlet unless granted additional permissions.

## 3.3 Centralized master data

Menu, recipes, ingredients, vendors, pricing policies, tax configurations and brand standards should be centrally controlled.

## 3.4 Local operational control

Stock receiving, wastage, staff attendance, cash closing and day-to-day operations should be managed at outlet level.

## 3.5 Everything should be auditable

Important actions must create an audit trail.

Example:

```text
Who:
Outlet Manager

Action:
Adjusted chicken stock

Previous:
18.5 kg

New:
16.5 kg

Reason:
Spoilage

Time:
10 Sep 2026, 11:32 AM
```

---

# 4. USER ROLES

Verity should use Role-Based Access Control.

## 4.1 Super Admin

Full platform access.

Can:

* Create organizations
* Create outlets
* Manage users
* Configure permissions
* Manage integrations
* Access all financial data
* Access audit logs
* Configure system settings

---

## 4.2 Business Owner / Promoter

High-level access.

Can view:

* Revenue
* Profitability
* Outlet performance
* Customer growth
* Food cost
* Wastage
* Franchise performance
* Marketing performance
* Reviews
* Operational alerts

---

## 4.3 Corporate / HQ Admin

Can manage:

* Outlets
* Menu
* Recipes
* Vendors
* Procurement
* Marketing
* CRM
* Reports
* Staff policies
* Franchise operations

---

## 4.4 Outlet Manager

Access restricted to assigned outlet.

Can manage:

* Daily sales
* Orders
* Inventory
* Purchasing
* Wastage
* Staff
* Attendance
* Expenses
* Cash closing
* Reviews
* Operational tasks

---

## 4.5 Kitchen Manager

Can manage:

* Kitchen orders
* KDS
* Preparation
* Recipes
* Kitchen inventory
* Wastage
* Production
* Prep lists

---

## 4.6 Inventory Manager

Can manage:

* Stock
* GRNs
* Transfers
* Adjustments
* Wastage
* Purchase requests
* Stock counts

---

## 4.7 Procurement Manager

Can manage:

* Vendors
* Purchase orders
* Quotations
* Procurement
* Vendor pricing
* Purchase history

---

## 4.8 Accountant / Finance

Can manage:

* Expenses
* Revenue reconciliation
* Payment reconciliation
* Taxes
* Settlements
* Outlet P&L
* Vendor payments
* Financial reports

---

## 4.9 HR / People Manager

Can manage:

* Employees
* Attendance
* Shifts
* Leave
* Payroll inputs
* Documents
* Performance

---

## 4.10 Marketing Manager

Can manage:

* Customers
* Segments
* Campaigns
* Coupons
* Loyalty
* Offers
* Retention

---

## 4.11 Franchise Partner

Should only access their assigned franchise outlet(s).

Can view:

* Sales
* Inventory
* Expenses
* Staff
* Operations
* Reports
* Franchise KPIs

Cannot modify centralized brand settings without approval.

---

## 4.12 Staff

Restricted operational access.

Examples:

* Cashier
* Kitchen staff
* Steward
* Delivery staff
* Inventory staff

---

# 5. HQ DASHBOARD

The main dashboard should provide a real-time overview.

## KPI cards

* Today's revenue
* Orders
* Average order value
* Covers / guests
* Gross sales
* Net sales
* Discounts
* Refunds
* Food cost %
* Labour cost %
* Wastage
* Outstanding purchases
* Customer count
* Repeat customer %
* Reviews
* Average rating

---

## Outlet comparison

```text
Outlet                Sales       Orders      AOV       Food Cost
------------------------------------------------------------------
Defence Colony        ₹XXX        XXX         ₹XXX      XX%
R.K. Puram             ₹XXX        XXX         ₹XXX      XX%
Gurugram               ₹XXX        XXX         ₹XXX      XX%
```

Allow comparison by:

* Today
* Yesterday
* This week
* Last week
* This month
* Last month
* Custom date range

---

# 6. OUTLET DASHBOARD

Every outlet should have its own operational dashboard.

Display:

* Today's sales
* Orders
* Dine-in sales
* Takeaway sales
* Delivery sales
* Online sales
* Discounts
* Refunds
* Current stock alerts
* Low-stock ingredients
* Pending purchase orders
* Pending GRNs
* Wastage today
* Staff present
* Open shifts
* Cash status
* Kitchen status
* Customer complaints
* Reviews

---

# 7. OUTLET MANAGEMENT

HQ can create and manage outlets.

Each outlet should have:

### Basic information

* Outlet name
* Outlet code
* Address
* Phone
* Email
* Location
* Opening date
* Outlet type
* Franchise / company-owned
* Franchise partner
* Manager
* Operating hours

### Commercial information

* Rent
* Revenue share
* Franchise fee
* Royalty
* Marketing contribution
* Payment terms

### Operational information

* Seating capacity
* Kitchen capacity
* POS configuration
* Delivery radius
* Delivery partners
* Staff capacity

---

# 8. POS & ORDER MANAGEMENT

Verity should either provide native POS functionality or integrate with the existing POS system.

Every order should have:

* Order ID
* Outlet
* Date/time
* Order channel
* Customer
* Table
* Items
* Modifiers
* Quantity
* Discounts
* Taxes
* Payment method
* Order status
* Staff member
* Delivery partner
* Notes

---

# 9. ORDER CHANNELS

Support:

* Dine-in
* Takeaway
* Phone orders
* Website
* QR ordering
* Delivery platforms
* Walk-in
* Corporate orders
* Catering orders

Order source must be stored.

Example:

```text
Order #CKZ-10293

Outlet: Defence Colony
Channel: Delivery
Platform: Zomato
Customer: Existing
Subtotal: ₹1,240
Discount: ₹100
Tax: ₹57
Total: ₹1,197
```

---

# 10. TABLE MANAGEMENT

For dine-in outlets.

Features:

* Floor plan
* Tables
* Table numbers
* Capacity
* Available
* Occupied
* Reserved
* Cleaning
* Billing
* Merged tables

Track:

* Table occupancy
* Turnaround time
* Covers
* Revenue per table

---

# 11. KITCHEN DISPLAY SYSTEM

Orders should flow from POS to kitchen.

Kitchen statuses:

```text
NEW
↓
ACCEPTED
↓
PREPARING
↓
READY
↓
PICKED UP / SERVED
```

KDS should display:

* Order number
* Order type
* Items
* Quantity
* Modifiers
* Special instructions
* Order age
* Priority

Highlight delayed orders.

---

# 12. MENU MANAGEMENT

Central menu management should be controlled by HQ.

Each menu item should contain:

* Name
* SKU
* Category
* Description
* Image
* Selling price
* Tax
* Recipe
* Food cost
* Gross margin
* Preparation time
* Availability
* Outlet availability
* Channel availability

Example:

```text
Chicken Seekh Kebab

Selling Price: ₹XXX
Recipe Cost: ₹XXX
Food Cost: XX%
Gross Margin: XX%

Available:
✓ Defence Colony
✓ R.K. Puram
✓ Gurugram
```

---

# 13. MENU VERSIONING

Any menu change should be tracked.

Example:

```text
Chicken Seekh Kebab
₹480 → ₹520

Changed by:
HQ Admin

Effective:
1 October 2026

Reason:
Ingredient cost increase
```

Previous versions must remain accessible.

---

# 14. RECIPE MANAGEMENT

Recipe management is a critical module.

Each menu item should have a recipe.

Example:

```text
Chicken Seekh Kebab
────────────────────
Chicken mince       180g
Spices                8g
Ginger               10g
Garlic                8g
Oil                   12ml
Garnish               20g
```

Recipe system must calculate:

* Ingredient quantity
* Ingredient cost
* Recipe cost
* Food cost %
* Theoretical consumption

---

# 15. RECIPE BOM

Each dish should have a Bill of Materials.

Example:

```text
1 portion Chicken Seekh Kebab
↓
Chicken: 180g
Spices: 8g
Oil: 12ml
Onion: 25g
Mint: 5g
```

Sales automatically generate theoretical ingredient consumption.

---

# 16. FOOD COST MANAGEMENT

Verity should compare:

**Theoretical food cost vs Actual food cost**

Formula:

```text
Opening Stock
+ Purchases
- Closing Stock
= Actual Consumption
```

Compare with:

```text
Expected Consumption
based on recipes + sales
```

Variance should be highlighted.

Example:

```text
Chicken

Theoretical:
82.5 kg

Actual:
91.2 kg

Variance:
+8.7 kg

Variance %:
+10.5%

Status:
Critical
```

---

# 17. INVENTORY MANAGEMENT

Inventory must be outlet-specific.

Categories:

* Meat
* Poultry
* Seafood
* Vegetables
* Dairy
* Spices
* Dry goods
* Sauces
* Packaging
* Beverages
* Cleaning supplies
* Consumables

Track:

* Opening stock
* Purchases
* Transfers
* Consumption
* Wastage
* Adjustments
* Closing stock

---

# 18. STOCK LEDGER

Every inventory item should have a ledger.

Example:

```text
Chicken Breast

Opening       25kg
Purchase      +40kg
Transfer      +5kg
Consumption   -52kg
Wastage       -2kg
Adjustment    -1kg
Closing       15kg
```

No stock movement should happen without a transaction record.

---

# 19. STOCK COUNT

Managers can perform:

* Daily counts
* Weekly counts
* Monthly counts
* Spot checks

Support:

* Full inventory count
* Category count
* Selected items

System calculates variance automatically.

---

# 20. WASTAGE MANAGEMENT

Wastage must be recorded with reasons.

Reasons:

* Spoilage
* Expired
* Overproduction
* Burnt
* Damaged
* Preparation waste
* Customer return
* Quality issue
* Storage issue
* Other

Each wastage record:

* Item
* Quantity
* Value
* Reason
* Outlet
* Staff
* Date/time
* Approval if required
* Notes
* Photo attachment

---

# 21. PROCUREMENT

Central procurement module.

Workflow:

```text
Low Stock
↓
Purchase Request
↓
Approval
↓
Purchase Order
↓
Vendor
↓
Delivery
↓
GRN
↓
Inventory Updated
↓
Invoice
↓
Payment
```

---

# 22. PURCHASE REQUESTS

Outlet manager can request stock.

Example:

```text
Chicken Breast
Required: 50kg
Current: 12kg
Par Level: 30kg

Reason:
High weekend demand
```

---

# 23. PURCHASE ORDERS

PO should contain:

* Vendor
* Outlet
* Items
* Quantity
* Unit price
* Tax
* Total
* Expected delivery
* Payment terms
* Created by
* Approved by
* Status

Statuses:

* Draft
* Pending approval
* Approved
* Sent
* Partially received
* Received
* Cancelled

---

# 24. GOODS RECEIPT NOTE

When goods arrive:

* Verify quantity
* Verify quality
* Record batch
* Record expiry
* Record actual price
* Accept/reject items
* Upload invoice
* Update stock

Support partial deliveries.

---

# 25. VENDOR MANAGEMENT

Vendor profile:

* Name
* Company
* Contact person
* Phone
* Email
* Address
* GST information
* Categories supplied
* Payment terms
* Rating
* Active status

Vendor performance:

* Price
* Quality
* Delivery time
* Rejection rate
* Reliability
* Outstanding payments

---

# 26. VENDOR PRICE HISTORY

Verity should track ingredient price changes.

Example:

```text
Chicken
Vendor A

Jan: ₹240/kg
Feb: ₹245/kg
Mar: ₹255/kg
Apr: ₹268/kg
```

This should feed into food-cost analysis.

---

# 27. INVENTORY TRANSFERS

Support transfers between:

* HQ → Outlet
* Outlet → Outlet
* Main kitchen → Outlet
* Warehouse → Outlet

Workflow:

```text
Transfer Request
↓
Approval
↓
Dispatch
↓
Transit
↓
Receive
```

---

# 28. CUSTOMER CRM

Every customer should have a unified profile.

Customer fields:

* Name
* Phone
* Email
* Birthday
* Anniversary
* Preferred outlet
* Preferred channel
* Order history
* Total spend
* Average order value
* Visit frequency
* Last order
* Favourite items
* Discounts used
* Loyalty points
* Complaints
* Reviews
* Marketing consent

---

# 29. CUSTOMER 360

The customer profile should show:

```text
Customer
│
├── Orders
├── Visits
├── Spend
├── Favourite Items
├── Favourite Outlet
├── Offers
├── Loyalty
├── Reviews
├── Complaints
└── Communication History
```

---

# 30. CUSTOMER SEGMENTATION

Create dynamic segments.

Examples:

### VIP

Spend > ₹25,000

### Frequent Customers

5+ orders/month

### At Risk

No order for 45 days

### Lapsed

No order for 90 days

### New

First order within 30 days

### High AOV

AOV > ₹1,500

### Defence Colony Customers

Primary outlet = Defence Colony

Segments should update automatically.

---

# 31. LOYALTY PROGRAM

Support:

* Points
* Tiers
* Rewards
* Coupons
* Birthday benefits
* Anniversary benefits
* Visit rewards

Example:

```text
₹100 spent = 5 points

500 points = ₹100 reward
```

HQ should be able to configure rules.

---

# 32. OFFERS & COUPONS

Support:

* Percentage discount
* Flat discount
* Buy X Get Y
* Item discount
* Category discount
* First-order offer
* Returning customer offer
* Outlet-specific offer
* Time-specific offer

Conditions:

* Minimum order value
* Customer segment
* Outlet
* Channel
* Date
* Time
* Usage limit

---

# 33. MARKETING CAMPAIGNS

Campaign channels:

* WhatsApp
* SMS
* Email
* Push notifications

Campaign structure:

```text
Campaign
↓
Audience
↓
Message
↓
Offer
↓
Delivery
↓
Conversion
↓
Revenue
```

Track:

* Sent
* Delivered
* Opened
* Clicked
* Redeemed
* Revenue generated

---

# 34. MARKETING CALENDAR

Central calendar for:

* Festivals
* Birthdays
* Anniversaries
* Offers
* Events
* Campaigns
* Outlet launches
* Promotions

---

# 35. REVIEW & REPUTATION MANAGEMENT

Aggregate customer reviews where integrations permit.

Track:

* Google reviews
* Delivery-platform ratings
* Internal feedback

Dashboard:

```text
Overall Rating: 4.X

Positive
Neutral
Negative

Common Complaints:
• Delay
• Packaging
• Food temperature
• Service
```

---

# 36. COMPLAINT MANAGEMENT

Every complaint becomes a ticket.

Fields:

* Customer
* Outlet
* Order
* Category
* Severity
* Description
* Assigned employee
* Status
* Resolution
* Compensation
* Date closed

Statuses:

```text
New
Assigned
In Progress
Awaiting Customer
Resolved
Closed
```

---

# 37. SERVICE RECOVERY

Authorized managers can issue:

* Coupon
* Refund
* Replacement
* Complimentary item
* Loyalty points

All compensation should be tracked.

---

# 38. STAFF MANAGEMENT

Employee profile:

* Name
* Employee ID
* Photo
* Phone
* Role
* Outlet
* Joining date
* Employment type
* Salary information
* Emergency contact
* Documents
* Status

---

# 39. ATTENDANCE

Support:

* Check-in
* Check-out
* Late
* Early departure
* Absent
* Overtime
* Leave

Dashboard:

```text
Present: 18
Absent: 2
Late: 3
On Leave: 1
```

---

# 40. SHIFT MANAGEMENT

Managers should create shifts.

Example:

```text
Morning
10 AM – 6 PM

Evening
4 PM – 12 AM

Night / Closing
6 PM – Close
```

Show staffing gaps.

---

# 41. LEAVE MANAGEMENT

Employees can request:

* Casual leave
* Sick leave
* Emergency leave
* Other leave

Managers approve/reject.

---

# 42. PAYROLL INPUTS

Verity does not necessarily need to replace a payroll engine.

It should provide payroll-ready data:

* Days worked
* Hours
* Overtime
* Late deductions
* Leave
* Incentives
* Advances
* Attendance exceptions

---

# 43. STAFF PERFORMANCE

Track operational metrics where appropriate:

* Orders handled
* Average service time
* Attendance
* Customer complaints
* Sales contribution
* Upselling
* Manager ratings

Avoid using raw metrics without context for employee evaluation.

---

# 44. EXPENSE MANAGEMENT

Outlet managers can record expenses.

Categories:

* Rent
* Electricity
* Gas
* Water
* Maintenance
* Cleaning
* Packaging
* Transport
* Marketing
* Repairs
* Salaries
* Miscellaneous

Each expense:

* Amount
* Category
* Outlet
* Vendor
* Date
* Payment method
* Receipt
* Approval status

---

# 45. CASH MANAGEMENT

Daily cash reconciliation.

Track:

```text
Opening Cash
+ Cash Sales
- Cash Expenses
- Cash Withdrawals
= Expected Cash
```

Compare with actual cash.

Variance requires explanation.

---

# 46. PAYMENT MANAGEMENT

Payment methods:

* Cash
* UPI
* Card
* Wallet
* Bank transfer
* Delivery platform
* Other

Track settlement status.

---

# 47. DELIVERY PLATFORM RECONCILIATION

Where APIs/integrations are available, import platform transactions.

Track:

* Gross order value
* Discounts
* Platform commission
* Taxes
* Packaging charges
* Other deductions
* Net settlement
* Settlement date

Compare:

```text
POS Revenue
vs
Platform Settlement
```

---

# 48. FINANCE DASHBOARD

HQ finance dashboard should include:

* Revenue
* COGS
* Gross profit
* Food cost
* Labour cost
* Operating expenses
* Outlet contribution
* EBITDA proxy
* Receivables
* Payables
* Cash
* Platform settlements

---

# 49. OUTLET P&L

Each outlet should have an estimated operational P&L.

```text
Revenue
- Food Cost
- Labour
- Rent
- Utilities
- Marketing
- Delivery commissions
- Other OPEX
----------------
Operating Contribution
```

Allow actual accounting integration later.

---

# 50. FRANCHISE MANAGEMENT

This is essential if Colonel Kebabz expands further.

Each franchise should have:

* Franchise partner
* Agreement
* Start date
* Renewal date
* Territory
* Outlet
* Fees
* Royalty
* Revenue share
* Marketing contribution
* Compliance status

---

# 51. FRANCHISE ROYALTY CALCULATION

System should calculate:

```text
Gross Sales
↓
Eligible Revenue
↓
Royalty %
↓
Royalty Payable
```

Support configurable rules.

Example:

```text
Monthly Net Sales:
₹15,00,000

Royalty:
5%

Royalty:
₹75,000
```

---

# 52. FRANCHISE COMPLIANCE

HQ can create compliance checklists.

Examples:

* Brand standards
* Hygiene
* Uniform
* Menu compliance
* Pricing compliance
* Kitchen cleanliness
* Storage
* Customer service
* Equipment
* Fire safety
* Documentation

---

# 53. OUTLET AUDITS

HQ can conduct scheduled audits.

Audit:

```text
Outlet
↓
Checklist
↓
Score
↓
Issues
↓
Corrective Actions
↓
Verification
```

Example:

```text
Defence Colony

Food Safety       92%
Service            88%
Brand Standards    96%
Inventory          84%

Overall            90%
```

---

# 54. TASK MANAGEMENT

Tasks can be assigned to:

* HQ
* Outlet managers
* Kitchen managers
* Staff
* Franchise partners

Each task:

* Title
* Description
* Assignee
* Priority
* Due date
* Outlet
* Attachments
* Status

---

# 55. SOP MANAGEMENT

Verity should act as a centralized SOP library.

Categories:

* Opening checklist
* Closing checklist
* Kitchen SOP
* Food safety
* Cleaning
* Inventory
* Cash handling
* Customer service
* Emergency procedures
* Delivery
* Staff onboarding

HQ controls versions.

---

# 56. DAILY OPENING CHECKLIST

Example:

```text
☐ Kitchen clean
☐ Equipment operational
☐ Gas checked
☐ Refrigeration checked
☐ Inventory checked
☐ Cash float verified
☐ Staff present
☐ POS operational
☐ Dining area ready
```

---

# 57. DAILY CLOSING CHECKLIST

```text
☐ Cash closed
☐ POS closed
☐ Inventory counted
☐ Wastage recorded
☐ Kitchen cleaned
☐ Equipment switched off
☐ Fridges checked
☐ Waste disposed
☐ Doors/security checked
```

---

# 58. ALERT & NOTIFICATION ENGINE

Verity should proactively surface exceptions.

Examples:

### Inventory

> Chicken stock below par level at Gurugram.

### Food Cost

> Defence Colony food cost increased 4.2% this week.

### Sales

> Gurugram revenue is 18% below the previous 4-week average.

### Wastage

> R.K. Puram wastage exceeded threshold.

### Franchise

> Franchise compliance audit overdue.

### Customer

> VIP customer complaint unresolved for 24 hours.

---

# 59. NOTIFICATION CHANNELS

Support:

* In-app
* Email
* WhatsApp where integration exists
* SMS where integration exists

Notification preferences should be configurable.

---

# 60. ANALYTICS ENGINE

Verity should allow analysis across dimensions.

### Sales

* Outlet
* Day
* Hour
* Item
* Category
* Channel
* Customer
* Payment method

### Inventory

* Ingredient
* Outlet
* Vendor
* Category
* Time

### Customers

* Segment
* Outlet
* Frequency
* Spend
* Cohort

---

# 61. SALES ANALYTICS

Reports:

* Daily sales
* Weekly sales
* Monthly sales
* Outlet comparison
* Hourly sales
* Day-of-week sales
* Channel mix
* Category sales
* Item sales
* AOV
* Order count

---

# 62. MENU ANALYTICS

Every menu item should be classified:

```text
STAR
High sales + High margin

PLOW HORSE
High sales + Low margin

PUZZLE
Low sales + High margin

DOG
Low sales + Low margin
```

Use this for menu optimization.

---

# 63. CUSTOMER ANALYTICS

Track:

* New customers
* Returning customers
* Retention
* Repeat rate
* Churn
* AOV
* Lifetime value
* Outlet preference
* Order frequency

---

# 64. COHORT ANALYSIS

Example:

```text
January Customers

Month 1: 100%
Month 2: 42%
Month 3: 31%
Month 4: 26%
```

Use this to measure retention.

---

# 65. OUTLET BENCHMARKING

Compare outlets fairly.

Metrics:

* Revenue per seat
* Revenue per sq ft where data exists
* AOV
* Orders
* Food cost
* Labour cost
* Wastage
* Review score
* Repeat customers
* Contribution margin

---

# 66. DEMAND FORECASTING

Future-ready module.

Use historical data to forecast:

* Expected orders
* Expected sales
* Ingredient requirements
* Staffing requirements

Example:

```text
Expected Saturday Demand

Chicken:
+18%

Paneer:
+7%

Breads:
+14%
```

---

# 67. PROCUREMENT FORECASTING

Combine:

```text
Historical sales
+
Recipes
+
Current stock
+
Open POs
+
Forecast demand
=
Recommended purchase quantity
```

---

# 68. MASTER DATA MANAGEMENT

HQ-controlled master entities:

* Menu items
* Categories
* Recipes
* Ingredients
* Units
* Vendors
* Tax rules
* Outlets
* Employees
* Roles
* Expense categories
* Order channels
* Payment methods

---

# 69. UNITS & CONVERSIONS

Must support:

* kg
* g
* litre
* ml
* pieces
* packets
* boxes
* bottles
* trays

Example:

```text
1 kg = 1000 g
1 litre = 1000 ml
```

Recipes may use grams while procurement uses kilograms.

---

# 70. DOCUMENT MANAGEMENT

Store:

* Franchise agreements
* Vendor contracts
* Invoices
* Employee documents
* Licenses
* Certifications
* Audit reports
* SOPs
* Outlet documents

Documents should be attached to entities.

---

# 71. LICENSE & COMPLIANCE TRACKING

Track expiry dates for relevant outlet documentation.

Examples:

* FSSAI
* GST
* Fire safety
* Trade licenses
* Shop & establishment
* Insurance
* Vendor certifications

System should alert before expiry.

---

# 72. AUDIT LOG

Track sensitive actions:

* Price changes
* Recipe changes
* Stock adjustments
* Discounts
* Refunds
* Expenses
* Purchase orders
* User permissions
* Customer data changes
* Franchise configuration

Audit record:

```text
User
Action
Entity
Previous value
New value
Timestamp
IP/device where available
Reason
```

---

# 73. APPROVAL ENGINE

Configurable approval workflows.

Examples:

### Stock adjustment

Manager → HQ approval above threshold

### Expense

Manager → Finance

### Purchase order

Outlet → Procurement → Finance

### Menu price

HQ → Owner

### Refund

Cashier → Manager

---

# 74. SEARCH

Global search should search:

* Customers
* Orders
* Products
* Ingredients
* Vendors
* Employees
* Outlets
* Purchase orders
* Invoices
* Tasks
* Complaints

Example:

```text
Search: 10293

→ Order CKZ-10293
→ Customer
→ Outlet
→ Payment
→ Kitchen record
```

---

# 75. IMPORT / EXPORT

Support:

* CSV
* Excel
* PDF reports

Import:

* Customers
* Menu
* Ingredients
* Vendors
* Employees
* Historical orders
* Inventory opening balances

---

# 76. API & INTEGRATION LAYER

Verity should be integration-first.

Potential integrations:

* POS
* Zomato
* Swiggy
* Google Business Profile
* WhatsApp
* SMS provider
* Payment gateway
* Accounting software
* Payroll software
* Email
* BI tools

Each integration should have:

* Connection status
* Last sync
* Error log
* Sync history
* Manual sync
* Retry

---

# 77. DATA MODEL

Core entities:

```text
Organization
Outlet
Franchise
User
Role
Permission

Customer
CustomerSegment
LoyaltyAccount
Campaign
Coupon

Menu
MenuCategory
MenuItem
Recipe
RecipeIngredient
Ingredient

Inventory
InventoryItem
StockLedger
StockCount
Wastage
StockTransfer

Vendor
PurchaseRequest
PurchaseOrder
GRN
VendorInvoice

Order
OrderItem
Payment
Refund
Settlement

Employee
Shift
Attendance
Leave
PayrollInput

Expense
ExpenseCategory

Complaint
Review
Task
SOP
Audit
Document

Report
Notification
Integration
```

---

# 78. DATA RELATIONSHIPS

```text
Organization
    │
    ├── Outlets
    │     │
    │     ├── Orders
    │     ├── Inventory
    │     ├── Employees
    │     ├── Expenses
    │     └── Customers
    │
    ├── Menu
    │     └── Recipes
    │           └── Ingredients
    │
    ├── Vendors
    │
    ├── Customers
    │
    └── Franchise Agreements
```

---

# 79. PERMISSION SYSTEM

Permissions should be granular.

Example:

```text
inventory.view
inventory.create
inventory.edit
inventory.adjust
inventory.approve

orders.view
orders.refund
orders.cancel

customers.view
customers.edit
customers.export

finance.view
finance.create_expense
finance.approve_expense
```

Permissions should be assignable by role and outlet.

---

# 80. MULTI-TENANCY

The platform must be designed so that Colonel Kebabz is an organization/tenant.

Future organizations should be able to exist independently.

```text
Verity
│
├── Colonel Kebabz
│   ├── Defence Colony
│   ├── R.K. Puram
│   └── Gurugram
│
├── Future Restaurant Group
│   └── ...
```

Data must never leak across organizations.

---

# 81. SECURITY

Requirements:

* Secure authentication
* Password hashing
* Session management
* Role-based access
* Organization isolation
* Outlet isolation
* Audit logs
* Encryption in transit
* Encryption at rest where supported
* Secure API authentication
* Rate limiting
* Backup strategy
* Recovery strategy

---

# 82. PRIVACY

Customer information must be treated as sensitive business data.

The system should support:

* Consent tracking
* Marketing opt-in/out
* Data access controls
* Controlled exports
* Audit logging
* Data retention policies

---

# 83. MOBILE EXPERIENCE

Outlet operations should be mobile-friendly.

Managers should be able to:

* View sales
* Approve POs
* Check inventory
* Record wastage
* Approve expenses
* Review tasks
* View staff attendance
* Respond to complaints
* Complete checklists

---

# 84. HQ WEB APPLICATION

Primary navigation:

```text
Dashboard
Outlets
Orders
Customers
Menu
Inventory
Procurement
Vendors
Kitchen
Staff
Finance
Marketing
Reviews
Franchise
Audits
Tasks
Reports
Integrations
Settings
```

---

# 85. OUTLET APPLICATION

Outlet-focused navigation:

```text
Dashboard
Orders
Kitchen
Tables
Inventory
Purchasing
Wastage
Staff
Attendance
Expenses
Customers
Reviews
Tasks
Closing
```

---

# 86. DASHBOARD WIDGET SYSTEM

Dashboards should be configurable.

Widgets:

* Sales
* Orders
* AOV
* Food cost
* Wastage
* Inventory alerts
* Top products
* Bottom products
* Customer growth
* Reviews
* Complaints
* Staff attendance
* Expense
* Outlet comparison

Users can choose which widgets appear.

---

# 87. DAILY BUSINESS SUMMARY

Every outlet should generate an automated daily summary.

Example:

```text
COLONEL KEBABZ
DEFENCE COLONY

Sales: ₹1,82,450
Orders: 148
AOV: ₹1,233

Dine-in: ₹78,000
Takeaway: ₹32,000
Delivery: ₹72,450

Food Cost: 29.4%
Wastage: ₹3,250

New Customers: 31
Returning Customers: 74

Reviews: 12
Average Rating: 4.6

Alerts:
• Chicken stock low
• 2 unresolved complaints
```

---

# 88. OWNER EXECUTIVE DASHBOARD

The owner should not need to inspect operational screens.

The executive dashboard should answer:

### Revenue

How much are we making?

### Profitability

Where are we making/losing money?

### Operations

Which outlet is performing well?

### Customers

Are customers returning?

### Inventory

Where are we losing stock?

### People

Are outlets properly staffed?

### Quality

Are reviews and complaints improving?

### Franchise

Are franchise outlets complying?

---

# 89. BUSINESS HEALTH SCORE

Create an optional composite score.

```text
Sales              25%
Profitability      20%
Inventory          15%
Customer           15%
Operations         10%
People             10%
Reviews             5%
```

Result:

```text
Defence Colony
92 / 100

R.K. Puram
84 / 100

Gurugram
79 / 100
```

The score must be explainable and never hide underlying metrics.

---

# 90. RED-FLAG ENGINE

Verity should identify anomalies.

Examples:

```text
⚠ Sales down 21%
⚠ Food cost up 5%
⚠ Wastage unusually high
⚠ Stock variance detected
⚠ Vendor price increased
⚠ Customer complaints increased
⚠ Reviews declining
⚠ Staff shortage
```

---

# 91. REPORTING

Required reports:

### Sales

* Daily sales
* Monthly sales
* Outlet sales
* Product sales
* Category sales
* Channel sales

### Inventory

* Stock report
* Stock ledger
* Stock variance
* Wastage
* Consumption
* Slow-moving inventory

### Procurement

* Purchase report
* Vendor report
* Price variance
* Outstanding POs
* GRNs

### Customer

* Customer growth
* Repeat rate
* LTV
* Segments
* Campaign performance

### Staff

* Attendance
* Leave
* Staffing
* Payroll inputs

### Finance

* Expenses
* P&L
* Cash reconciliation
* Settlements
* Payables

### Franchise

* Royalty
* Compliance
* Outlet performance
* Audit scores

---

# 92. REPORT BUILDER

HQ users should eventually be able to build custom reports.

Select:

```text
Dimension
+
Metric
+
Filter
+
Date Range
+
Group By
```

Example:

```text
Revenue
WHERE
Outlet = Gurugram
AND
Channel = Delivery
GROUP BY
Menu Category
```

---

# 93. EXPORT CONTROL

Export permissions must be role-controlled.

Particularly restrict:

* Customer databases
* Financial reports
* Payroll
* Franchise agreements
* Vendor pricing

---

# 94. ACTIVITY FEED

Every user should have an activity stream.

Example:

```text
10:32 AM
Manager approved PO #PO-1293

10:18 AM
2.5kg chicken wastage recorded

9:45 AM
New complaint received

9:20 AM
Opening checklist completed
```

---

# 95. SYSTEM SETTINGS

HQ configuration:

* Business profile
* Outlet settings
* Taxes
* Currency
* Units
* Roles
* Permissions
* Notification rules
* Approval thresholds
* Loyalty rules
* Discount rules
* Franchise rules
* Integrations
* Audit settings

---

# 96. ONBOARDING FLOW

New outlet onboarding:

```text
Create Outlet
↓
Assign Franchise / Ownership
↓
Configure Operating Hours
↓
Assign Manager
↓
Assign Menu
↓
Assign Recipes
↓
Assign Vendors
↓
Set Par Levels
↓
Add Staff
↓
Configure POS
↓
Configure Delivery Channels
↓
Opening Stock
↓
Go Live
```

---

# 97. NEW FRANCHISE ONBOARDING

```text
Franchise Partner
↓
Application
↓
Approval
↓
Agreement
↓
Territory
↓
Outlet Setup
↓
Training
↓
Audit
↓
Menu & Brand Setup
↓
Opening Stock
↓
POS Setup
↓
Go Live
```

---

# 98. OFFBOARDING

When an employee, vendor or franchise exits:

* Revoke access
* Close outstanding tasks
* Settle balances
* Archive records
* Preserve audit history
* Transfer ownership where applicable

---

# 99. MVP

The first production version should prioritize operational value.

## Phase 1 — Core ERP

### Must have

* Authentication
* Organization
* Outlet management
* User roles
* Outlet dashboard
* POS/order ingestion
* Menu
* Ingredients
* Recipes
* Inventory
* Stock ledger
* Wastage
* Vendors
* Purchase orders
* GRN
* Expenses
* Daily closing
* Basic reports
* Audit logs

---

# 100. PHASE 2 — CRM

Add:

* Customer 360
* Segmentation
* Loyalty
* Coupons
* Campaigns
* Reviews
* Complaints
* Customer retention analytics

---

# 101. PHASE 3 — PEOPLE & FRANCHISE

Add:

* Employees
* Attendance
* Shifts
* Leave
* Franchise management
* Royalty
* Audits
* SOPs
* Compliance

---

# 102. PHASE 4 — INTELLIGENCE

Add:

* Demand forecasting
* Purchase recommendations
* Food-cost anomaly detection
* Sales forecasting
* Customer churn prediction
* Outlet health score
* AI business assistant

---

# 103. AI BUSINESS ASSISTANT

Eventually Verity should allow the owner to ask:

> "Why did Gurugram sales fall this week?"

The system should analyze:

* Sales
* Orders
* AOV
* Menu mix
* Reviews
* Inventory
* Staffing
* Discounts
* Delivery channels

And respond with evidence.

Example:

```text
Gurugram sales are down 14% this week.

Primary factors:

1. Delivery orders decreased 22%.
2. Average order value decreased 6%.
3. Chicken category sales decreased 18%.
4. Two high-volume menu items were unavailable
   for approximately 9 hours.

The largest immediate opportunity is restoring
availability of the affected menu items.
```

The AI must distinguish between:

* Observed facts
* Calculated metrics
* Hypotheses
* Recommendations

It must never fabricate business data.

---

# 104. AI COMMANDS

Future natural-language commands:

> "Show me the three worst-performing items this month."

> "Which outlet has the highest food-cost variance?"

> "Why is chicken consumption unusually high?"

> "Show customers who haven't ordered in 60 days."

> "How much did delivery commissions cost us last month?"

> "Which vendor increased prices the most?"

> "Create a purchase recommendation for tomorrow."

> "Show me Gurugram's operational problems."

---

# 105. HOME SCREEN PRIORITY

The product should not overwhelm users with data.

The home dashboard should prioritize:

## 1. What happened?

KPIs.

## 2. What is wrong?

Alerts and anomalies.

## 3. What needs action?

Tasks and approvals.

## 4. What should I investigate?

Insights.

---

# 106. UX REQUIREMENTS

The interface should feel like a modern business operating system rather than traditional restaurant software.

Principles:

* Clean
* Fast
* Dense where useful
* Minimal unnecessary decoration
* Strong hierarchy
* Clear status indicators
* Keyboard-friendly desktop workflows
* Mobile-friendly operational workflows

Avoid:

* Excessive gradients
* Decorative dashboards
* Giant unnecessary cards
* AI-looking UI
* Excessive animations
* Hidden operational actions

---

# 107. STATUS SYSTEM

Use consistent semantic statuses.

```text
Draft
Pending
Approved
Rejected
In Progress
Completed
Cancelled
Failed
Archived
```

---

# 108. ACTIVITY / AUDITABILITY

Every major object should expose:

```text
Overview
Details
Related Records
Activity
Documents
```

For example, a Purchase Order should show:

```text
PO Overview
Items
Vendor
Receiving
Invoice
Payments
Activity
```

---

# 109. PERFORMANCE REQUIREMENTS

The application should remain responsive with:

* Multiple outlets
* Thousands of customers
* Large order histories
* Large inventory ledgers
* Large audit logs

Heavy reports should use asynchronous generation where appropriate.

---

# 110. RELIABILITY

The system should handle temporary integration failures gracefully.

Example:

```text
POS sync failed
↓
Retry automatically
↓
If repeated failure
↓
Notify administrator
```

Never silently lose orders or inventory transactions.

---

# 111. OFFLINE / DEGRADED OPERATION

Outlet-critical functionality should have a graceful degraded mode where practical.

At minimum:

* Existing POS should continue operating independently if Verity is unavailable.
* Transactions should synchronize once connectivity returns.
* Duplicate transactions must be prevented.

---

# 112. INTEGRATION ARCHITECTURE

All external systems should communicate through an integration layer.

```text
External POS
     ↓
Integration Layer
     ↓
Verity Core
     ↓
Orders / Inventory / CRM / Finance
```

Avoid hard-coding individual vendors into core business logic.

---

# 113. EVENT-DRIVEN OPERATIONS

Important business events should generate internal events.

Examples:

```text
ORDER_COMPLETED
STOCK_RECEIVED
STOCK_ADJUSTED
WASTAGE_RECORDED
CUSTOMER_CREATED
CUSTOMER_ORDERED
COMPLAINT_CREATED
COMPLAINT_RESOLVED
PURCHASE_APPROVED
EXPENSE_APPROVED
AUDIT_COMPLETED
```

These events can trigger:

* Inventory calculations
* Notifications
* CRM updates
* Analytics
* Automations

---

# 114. BUSINESS RULE ENGINE

Business rules should be configurable.

Examples:

```text
IF stock < par level
THEN create low-stock alert

IF wastage > threshold
THEN notify outlet manager

IF complaint severity = critical
THEN notify HQ

IF PO amount > ₹X
THEN require HQ approval
```

---

# 115. DATA CONSISTENCY

Inventory must never be calculated solely from the current quantity.

The system should maintain an immutable-ish transaction history.

```text
Stock Quantity
=
Opening Balance
+
Receipts
+
Transfers In
-
Consumption
-
Transfers Out
-
Wastage
± Adjustments
```

Corrections should create new transactions rather than silently rewriting history.

---

# 116. FRANCHISE VS COMPANY-OWNED OUTLET

The system must distinguish:

```text
Outlet Ownership

Company Owned
Franchise
Partner Operated
```

This affects:

* Financial reporting
* Permissions
* Royalty
* Procurement
* Reporting
* Operational control

---

# 117. BRAND CONTROL

HQ should be able to enforce centralized standards.

Examples:

* Menu
* Pricing
* Recipes
* Portion sizes
* Branding
* Promotions
* SOPs

Outlet managers should not independently alter centralized data unless explicitly permitted.

---

# 118. OUTLET OVERRIDES

Certain values can optionally be overridden locally.

Example:

```text
Central Menu Price:
₹550

Gurugram Override:
₹575

Reason:
Local pricing policy

Approved by:
HQ
```

Every override must be visible to HQ.

---

# 119. CUSTOMER IDENTITY RESOLUTION

The same customer may order from different outlets.

The CRM should avoid creating:

```text
Rahul
Rahul Sharma
R. Sharma
Rahul S
```

as separate customers when the system can confidently identify them as the same person.

Primary matching signals may include:

* Phone
* Email
* Customer ID

Potential matches should be reviewable rather than blindly merged.

---

# 120. MULTI-OUTLET CUSTOMER JOURNEY

A customer may:

```text
First order:
Defence Colony

Second:
R.K. Puram

Third:
Gurugram

Fourth:
Delivery
```

Verity should treat this as one customer journey.

This enables:

* Cross-outlet loyalty
* Customer movement analysis
* Geographic demand analysis
* Better retention campaigns

---

# 121. SUCCESS METRICS

Verity implementation success should be measured by:

### Operational

* Reduced stock variance
* Reduced wastage
* Faster purchasing
* Faster closing
* Better inventory accuracy

### Financial

* Improved food cost
* Better outlet profitability
* Reduced unexplained expenses
* Better reconciliation

### Customer

* Increased repeat rate
* Increased AOV
* Reduced complaints
* Better retention

### Management

* Reduced manual reporting
* Faster decision-making
* Centralized visibility
* Better franchise control

---

# 122. CORE WORKFLOWS

The following workflows must work end-to-end before production launch.

## Workflow A — Sale

```text
Customer
↓
Order
↓
POS
↓
Payment
↓
Kitchen
↓
Order Completed
↓
Inventory Consumption
↓
Customer CRM
↓
Sales Analytics
```

---

## Workflow B — Procurement

```text
Low Stock
↓
Purchase Request
↓
Approval
↓
PO
↓
Vendor
↓
GRN
↓
Inventory
↓
Invoice
↓
Payment
```

---

## Workflow C — Wastage

```text
Ingredient
↓
Wastage
↓
Reason
↓
Stock Adjustment
↓
Manager Approval
↓
Food Cost Analysis
↓
Alert if abnormal
```

---

## Workflow D — Customer Complaint

```text
Customer
↓
Complaint
↓
Order linked
↓
Outlet assigned
↓
Resolution
↓
Compensation
↓
Customer notified
↓
Closed
↓
CRM history
```

---

## Workflow E — Franchise

```text
Franchise Partner
↓
Outlet
↓
Sales
↓
Royalty
↓
Compliance
↓
Audit
↓
Performance
```

---

# 123. MVP ACCEPTANCE CRITERIA

The system is ready for initial production use when:

* All three Colonel Kebabz outlets can be represented independently.
* HQ can see consolidated business performance.
* Outlet managers can only access authorized outlets.
* Orders can be imported/synchronized.
* Menu items are centrally managed.
* Recipes can calculate theoretical ingredient consumption.
* Inventory movements are recorded.
* Wastage is tracked.
* Purchases can move from request → PO → GRN → stock.
* Expenses can be recorded and approved.
* Daily closing can be completed.
* Customer profiles can be created from orders.
* Audit logs exist for sensitive actions.
* Reports can be filtered by outlet/date.
* No critical business transaction can silently disappear.
* Data is isolated by organization and outlet permissions.

---

# 124. FUTURE EXTENSIONS

The architecture should leave room for:

* Catering management
* Corporate orders
* Event management
* Central kitchen
* Warehouse management
* Franchise applications
* Franchise territory planning
* Employee training
* Recipe costing automation
* AI demand forecasting
* AI procurement
* Computer vision inventory
* QR ordering
* Native customer app
* Digital membership
* Gift cards
* Subscription dining programs

---

# 125. FINAL PRODUCT STRUCTURE

The complete Verity Colonel Kebabz application should ultimately be structured as:

```text
VERITY
│
├── EXECUTIVE
│   ├── Dashboard
│   ├── Insights
│   └── Alerts
│
├── OPERATIONS
│   ├── Outlets
│   ├── Orders
│   ├── Tables
│   ├── Kitchen
│   ├── Checklists
│   └── Tasks
│
├── MENU
│   ├── Menu
│   ├── Categories
│   ├── Recipes
│   ├── Ingredients
│   └── Food Cost
│
├── INVENTORY
│   ├── Stock
│   ├── Stock Ledger
│   ├── Counts
│   ├── Transfers
│   └── Wastage
│
├── PROCUREMENT
│   ├── Purchase Requests
│   ├── Purchase Orders
│   ├── GRNs
│   ├── Vendors
│   └── Price History
│
├── CRM
│   ├── Customers
│   ├── Segments
│   ├── Loyalty
│   ├── Campaigns
│   ├── Coupons
│   ├── Reviews
│   └── Complaints
│
├── PEOPLE
│   ├── Employees
│   ├── Attendance
│   ├── Shifts
│   ├── Leave
│   └── Payroll Inputs
│
├── FINANCE
│   ├── Revenue
│   ├── Expenses
│   ├── Cash
│   ├── Settlements
│   ├── P&L
│   └── Payables
│
├── FRANCHISE
│   ├── Partners
│   ├── Agreements
│   ├── Royalties
│   ├── Audits
│   └── Compliance
│
├── REPORTS
│   ├── Sales
│   ├── Inventory
│   ├── Customers
│   ├── Finance
│   ├── People
│   └── Franchise
│
├── DOCUMENTS
│   ├── Contracts
│   ├── Licenses
│   ├── Invoices
│   └── SOPs
│
├── INTEGRATIONS
│   ├── POS
│   ├── Delivery
│   ├── Payments
│   ├── Reviews
│   ├── WhatsApp
│   └── Accounting
│
└── SETTINGS
    ├── Organization
    ├── Outlets
    ├── Users
    ├── Roles
    ├── Permissions
    ├── Workflows
    ├── Notifications
    └── Audit Logs
```

# 126. PRODUCT NORTH STAR

Verity should become the **single source of operational truth for Colonel Kebabz**.

A Colonel Kebabz owner should be able to open Verity and immediately understand:

> **How much did we sell?**

> **Which outlet performed best?**

> **Where are we losing money?**

> **What inventory do we need?**

> **What is being wasted?**

> **Which customers are coming back?**

> **Which customers are at risk?**

> **What problems require attention today?**

> **What should management do next?**

The system should therefore not merely **record restaurant activity**.

It should transform restaurant activity into **visibility, accountability and actionable decisions**.

---

# 127. IMPLEMENTATION PRIORITY

### P0 — Business-critical

* Authentication
* Organizations
* Outlets
* RBAC
* Dashboard
* Orders
* Menu
* Ingredients
* Recipes
* Inventory
* Stock ledger
* Wastage
* Procurement
* Vendors
* PO
* GRN
* Expenses
* Daily closing
* Audit logs

### P1 — Management-critical

* Customer CRM
* Customer 360
* Reviews
* Complaints
* Reports
* Outlet comparison
* Food-cost analysis
* Staff
* Attendance
* Tasks
* SOPs

### P2 — Growth-critical

* Loyalty
* Campaigns
* Coupons
* Franchise
* Royalties
* Audits
* Compliance
* Advanced analytics

### P3 — Intelligence

* Forecasting
* Anomaly detection
* AI assistant
* Automated procurement
* Predictive customer churn
* Business recommendations

---

# 128. NON-NEGOTIABLE ARCHITECTURAL PRINCIPLE

Do **not** build Verity as a collection of disconnected CRUD pages.

Every important business action must flow through the underlying business model.

For example:

```text
ORDER COMPLETED
        │
        ├── Revenue
        ├── Payment
        ├── Inventory Consumption
        ├── Food Cost
        ├── Customer History
        ├── Loyalty
        ├── Sales Analytics
        └── Outlet Performance
```

Likewise:

```text
PURCHASE RECEIVED
        │
        ├── Inventory Increase
        ├── Vendor Liability
        ├── Purchase Cost
        ├── Food Cost
        └── Price History
```

And:

```text
WASTAGE RECORDED
        │
        ├── Inventory Decrease
        ├── Wastage Cost
        ├── Food Cost Variance
        ├── Outlet KPI
        └── Potential Alert
```

This interconnected event model is what makes **Verity an ERP rather than simply a dashboard or CRM**.

---

# 129. END STATE

When fully implemented, Verity should give Colonel Kebabz a single operating layer across:

**Customers + Orders + Kitchen + Menu + Recipes + Inventory + Procurement + Vendors + Staff + Finance + Marketing + Reviews + Franchise + Analytics.**

The three current outlets should be treated as the initial operating footprint, not as hard-coded locations.

The system must be designed from day one so that:

```text
3 outlets
→ 10 outlets
→ 50 outlets
→ 100+ franchise outlets
```

can be supported without rebuilding the product architecture.

**Verity should become the operational backbone of Colonel Kebabz.**
