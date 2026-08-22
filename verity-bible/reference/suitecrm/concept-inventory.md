# SuiteCRM — Concept Inventory

Source: SuiteCRM Modules metadata (GitHub: salesagility/SuiteCRM master branch)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Lead

Source: `modules/Leads/metadata/detailviewdefs.php`
Definition: An unqualified person or organization that has shown interest in services.
Key attributes:
- `first_name`, `last_name`
- `status` (Select: New | Assigned | In Process | Converted | Recycled | Dead)
- `opportunity_amount` (Decimal)
- `lead_source` (Select: Web, Phone, Referral, etc.)
Notes for Verity: Serves as the transient entity before full accounts are created.

---

### Opportunity

Source: `modules/Opportunities/metadata/detailviewdefs.php`
Definition: A qualified sales deal representing potential revenue.
Key attributes:
- `name` (String)
- `sales_stage` (Select: Prospecting | Qualification | Proposal | Negotiation | Closed Won | Closed Lost)
- `amount` (Decimal)
- `probability` (Percentage)
- `date_closed` (Date)
Relationships: Belongs to an Account (Customer); linked to a Contact.

---

### Account

Source: `modules/Accounts`
Definition: A business entity or client organization (the customer).
Relationships: Parent container for Contacts and Opportunities.

---

### Quote (AOS_Quotes)

Source: SuiteCRM AOS_Quotes Module
Definition: A formal commercial offer detailing services, items, quantities, and pricing terms sent to a prospect.
Key attributes: `quote_number`, `valid_until`, `grand_total`, `stage` (Draft | Confirmed | Negotiating).
Relationships: Can be converted directly to an Invoice or Order.
