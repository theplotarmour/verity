# OpenProject — Concept Inventory

Source: app/models/work_package.rb, app/models/relation.rb (GitHub: opf/openproject dev branch)
Date inspected: 2026-08-22
Confidence: HIGH

---

### WorkPackage

Source evidence: `app/models/work_package.rb`
Definition: The fundamental unit of work in OpenProject. It represents tasks, user stories, bugs, milestones, phases, or any other type of trackable activity.
Key attributes:
- `project_id` (belongs_to :project)
- `type_id` (belongs_to :type)
- `status_id` (belongs_to :status)
- `author_id` (belongs_to :author)
- `assigned_to_id` (belongs_to :assigned_to)
- `responsible_id` (belongs_to :responsible)
- `priority_id` (belongs_to :priority)
- `category_id` (belongs_to :category)
- `done_ratio` (percentage complete, governed by status or manual entry)
Relationships:
- Belongs to a Project and a Type.
- Has many `time_entries` for tracking effort.
- Has many `file_links` for document/file attachments.
- Managed hierarchically via ancestor/descendant relationships.

---

### Work Package Type (Type)

Source evidence: `app/models/work_package.rb:66`
Definition: Defines the schema, status flows, and workflow rules for a specific category of WorkPackage (e.g. Task, Milestone, Support Ticket).
Relationships: Maps allowed statuses and custom fields to a WorkPackage.

---

### Relation

Source evidence: `app/models/relation.rb`
Definition: A directed link between two WorkPackages specifying a dependency or logical connection.
Key attributes:
- `from_id` (belongs_to :from, class_name: "WorkPackage")
- `to_id` (belongs_to :to, class_name: "WorkPackage")
- `relation_type` (String)
Supported types:
- `relates` (relates / relates)
- `precedes` / `follows` (scheduling dependency; moving the predecessor affects the successor)
- `blocks` / `blocked` (execution blocking)
- `duplicates` / `duplicated` (cancellation/resolution sync)
- `includes` / `partof` (non-hierarchical inclusion)
- `requires` / `required` (dependency constraint)
- Note: Parent-child hierarchical relationships are stored separately in the hierarchy tables, not via `Relation`.

---

### Ancestors / Hierarchy

Source evidence: `app/models/work_package.rb:46` (`include WorkPackage::Ancestors`)
Definition: The parent-child tree structure of WorkPackages.
Purpose: Allows breaking large tasks down into nested sub-tasks, inheriting dates or summing progress.
Notes for Verity: Parent-child is a distinct native structural feature, separate from dependency relations like blocks/precedes.
