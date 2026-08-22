# SuiteCRM — Behavior Inventory

Source: SuiteCRM Modules metadata (GitHub: salesagility/SuiteCRM master branch)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Lead Conversion to Customer/Opportunity

Source: Leads Module Conversion Logic
Trigger: User triggers "Convert Lead".
Preconditions: Lead status is not `Converted`.
Steps:
1. Verify lead contains required name and contact details.
2. Create `Account` record (using lead's company info).
3. Create `Contact` record (using lead's personal info) linked to the new Account.
4. Optionally, create `Opportunity` record (copying lead's opportunity amount).
5. Mark Lead status as `Converted`.
State changes: Lead status becomes `Converted`; Account, Contact, and Opportunity records created in DB.
Failure handling: Abort if mandatory Account fields are missing.

---

### Opportunity Pipeline Value Aggregation

Source: Opportunities Pipeline Reports
Trigger: Opportunity updates its stage or amount.
Steps:
1. Calculate expected value: `amount * (probability / 100)`.
2. Group opportunities by `sales_stage`.
3. Sum actual amounts and expected values to populate pipeline dashboard widgets.
Notes for Verity: Essential calculation for sales forecasting.
