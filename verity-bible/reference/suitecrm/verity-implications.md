# SuiteCRM — Verity Implications

Source: SuiteCRM Modules metadata (GitHub: salesagility/SuiteCRM master branch)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Separate Leads from Core Customers

Confidence: HIGH
Recommendation: ADOPT
Rationale: Field service organizations receive dozens of random inquiries daily (e.g. website contact forms). Creating a permanent Customer Account for every inquiry clutters the dispatch views. Decoupling unqualified contacts (Leads) from qualified Customers (Accounts/Contacts) is essential.
If ADOPT: Verity implements a `Lead` entity separate from the core `Customer` and `Contact` models. A Lead represents an unverified customer request. When a dispatcher confirms the service quote, the Lead is "converted", auto-generating a `Customer`, `Contact`, and a `WorkOrder` linked to them.
Affects Bible sections: Volume II (Party/Customer model), Volume III (Execution)

---

### Opportunity Pipeline for Custom Service Quotes

Confidence: HIGH
Recommendation: ADOPT
Rationale: High-value field service jobs (e.g. building renovations) require quotation and negotiation before dispatch. An Opportunity pipeline lets managers track pending quotes and forecast work.
If ADOPT: Verity implements an `Opportunity` entity representing quote negotiations. Opportunities have stages (Drafting, Sent, Negotiating, Won, Lost) and map to a `Quote` document. Converting the Opportunity to "Won" releases the linked Quote and generates the corresponding Work Order.
Affects Bible sections: Volume II (Work Primitive), Volume VI (CRM capability)
