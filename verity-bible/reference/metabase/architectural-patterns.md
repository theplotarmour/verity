# Metabase — Architectural Patterns

Source: Metabase Documentation and repository models (GitHub: metabase/metabase master branch)
Date inspected: 2026-08-22
Confidence: HIGH

---

### AST-Based Query Interception and Sandboxing

Source: Core Query Processor (QP)
Pattern: Query requests are not parsed as raw SQL strings; they are structured ASTs (Abstract Syntax Trees) passed to a middleware pipeline (Query Processor). The QP intercepts, validates, filters (applies sandboxing), and compiles the AST into database-specific SQL.
Problem solved: Safe row-level permissions without database views; protects against SQL injection.
Applicability to Verity: HIGH — Verity should process reporting/analytics requests through an AST-based builder (e.g. Prisma or a structured JSON query format) to enforce tenant isolation filters before generating DB queries.

---

### Dashboard layout as dynamic grid positions

Source: DashboardCard Model
Pattern: Dashboards don't hardcode static grids. Layout is defined by coordinate and size values (`col`, `row`, `size_x`, `size_y`) on each dashboard card, mapped to a responsive grid container.
Problem solved: Highly flexible dashboard layouts that auto-adjust to screen sizes.
Applicability to Verity: HIGH — Verity dashboard components should follow a similar row/col layout structure.

---

### Collection-based Inheritance

Source: Collection permissions
Pattern: Dashboards and questions inherit their access control permissions from their parent Collection.
Problem solved: Simplifies security configuration; setting permissions on a parent collection automatically secures all nested items.
Applicability to Verity: HIGH — Organizing templates and reporting assets into folders (Collections) with hierarchical permissions matches standard corporate setups.
