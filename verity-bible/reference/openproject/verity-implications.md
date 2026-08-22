# OpenProject — Verity Implications

Source: app/models/work_package.rb, app/models/relation.rb (GitHub: opf/openproject dev branch)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Decoupling Hierarchy from Dependencies

Confidence: HIGH
Recommendation: ADOPT
Rationale: Modeling structural containment (Parent/Child Work Orders) and temporal sequencing (Precedes/Follows dependencies) as distinct models prevents logical conflicts. A Work Order contains sub-orders for different locations/tasks, but scheduling dependencies can cross-cut these bounds.
If ADOPT: Verity implements Parent/Child associations as native self-referring foreign keys on WorkOrder, but uses a separate `WorkOrderDependency` join table to represent blocks/precedes relationships.
Affects Bible sections: Volume II (Work Primitive), Volume III (Execution)

---

### Multi-Type Work Packages (Flexible Work Entities)

Confidence: HIGH
Recommendation: ADOPT
Rationale: OpenProject represents bugs, features, support tickets, and milestones as a single `WorkPackage` entity configured by a `Type` schema. Verity should model Work Orders, Preventative Maintenance tasks, Inspections, and Customer Calls as variations of a single core `WorkOrder` / `Activity` primitive with a type-specific configuration.
If ADOPT: Verity defines a base `WorkOrder` model. Feature flags and layout options are loaded dynamically depending on `workOrderType`.
Affects Bible sections: Volume II (Work Primitive)

---

### Direct Precedes/Follows Date Propagation

Confidence: MEDIUM
Recommendation: REJECT
Rationale: OpenProject dynamically updates successor dates when a predecessor's date changes. In field services, this auto-shift behavior can cause scheduling chaos (e.g. workers double-booked). Instead of automatic shifting, Verity should highlight conflicts and prompt dispatchers to manually resolve scheduling overlaps.
If REJECT: If a predecessor Work Order is delayed, flag a validation warning/SLA alert but do not auto-shift successor dates without dispatcher action.
Affects Bible sections: Volume III (Scheduling & Dispatch)
