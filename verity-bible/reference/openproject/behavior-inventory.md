# OpenProject — Behavior Inventory

Source: app/models/work_package.rb, app/models/relation.rb (GitHub: opf/openproject dev branch)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Work Package Scheduling Validation & Date Derivation

Source evidence: `app/models/work_package.rb:42` (`include WorkPackage::SchedulingRules`), `app/models/work_package.rb:52` (`include WorkPackages::DerivedDates`)
Trigger: Modifying start date, end date, or duration of a WorkPackage.
Preconditions: WorkPackage has a defined schedule rule type.
Steps:
1. Verify if the dates violate scheduling constraints from predecessor relations (`precedes` / `follows`).
2. If parent has dates derived from children (automatic scheduling), query child work packages to compute the min start date and max end date.
3. Propagate changes downstream to successor work packages.
State changes: Start date and end date updated in database.
Failure handling: Raises validation error if dates violate relation constraints (e.g. starting before predecessor ends).

---

### Status Transitions and Workflow Guards

Source evidence: `app/models/work_package.rb:43` (`include WorkPackage::StatusTransitions`)
Trigger: Attempting to update `status_id` of a WorkPackage.
Preconditions: User has required permission for status transitions; type allows the status.
Steps:
1. Lookup permitted transition paths for the current user's role and the work package's `Type`.
2. Check dependency conditions: if the transition is to a closed state, verify if all blocking relationships (`blocks` / `blocked`) are resolved.
3. Validate if any mandatory custom fields for the target status are populated.
State changes: Updates `status_id`, logs transition to the journal.
Failure handling: Fails validation if blocking issues are open.

---

### Relation Creation and Cycle Detection

Source evidence: `app/models/relation.rb`
Trigger: Creating a new `Relation` record between two WorkPackages.
Steps:
1. Validate that the relation does not link a work package to itself.
2. Run cycle detection to ensure the new relation (especially `precedes`/`blocks`) does not create a circular dependency.
3. For scheduling relations, recalculate dates of the target (`to`) work package.
Failure handling: Aborts with error if cycle is detected.
