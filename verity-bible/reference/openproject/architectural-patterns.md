# OpenProject — Architectural Patterns

Source: app/models/work_package.rb, app/models/relation.rb (GitHub: opf/openproject dev branch)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Separate Hierarchy Tree vs. Dependency Network

Source evidence: `app/models/work_package.rb:46` (`Ancestors`) vs. `app/models/relation.rb`
Pattern: Parent-child nesting is treated as a core hierarchical structural property of the entity (using nested sets/closure tables), whereas execution or scheduling constraints are modeled as a flexible edge-based directed graph (`Relation` entity).
Problem solved: Decouples structural breakdown (WBS) from sequencing/logistical planning.
Trade-offs: Requires maintaining two distinct data models, increasing query complexity when aggregating progress up the hierarchy.
Applicability to Verity: HIGH — A Work Order may have a parent-child structure (e.g. Master Work Order with sub-orders), but blocking dependencies between tasks or work orders must be modeled separately.

---

### Journalized History (Audit Logging)

Source evidence: `app/models/work_package.rb:49` (`include WorkPackage::Journalized` / `Versions`)
Pattern: Every change to an entity's fields is persisted to a separate versions/journal table as a delta record.
Problem solved: Full historic auditability, capability to restore to previous states, and user activity feeds.
Applicability to Verity: HIGH — Critical for SLA verification and dispute resolution.

---

### Done-Ratio Strategy Policies

Source evidence: `app/models/work_package.rb:62` (`DONE_RATIO_OPTIONS`)
Pattern: Allowing the completion percentage of a task/project to be computed dynamically from status rules or manual user updates.
Problem solved: Support for different team workflows (some prefer status-mapped progress, others manual fine-grained updates).
Applicability to Verity: HIGH — Aligning with ERPNext's progress policies, Verity needs dynamic completion calculations.
