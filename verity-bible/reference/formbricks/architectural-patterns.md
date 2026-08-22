# Formbricks — Architectural Patterns

Source: Formbricks Types and Schema (GitHub: formbricks/formbricks)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Decoupling Template (Survey) from Execution instance (Response)

Source: Core Schema Design
Pattern: Forms are represented as static, versioned schemas (Surveys). Concrete user submittals (Responses) are simple key-value maps referencing the template ID, rather than duplicating the layout structure in every submission.
Problem solved: Keeps database size small and ensures historical form schemas can be updated without corrupting past submissions.
Applicability to Verity: HIGH — A Work Order checklist template (e.g. "Monthly AC Service Checklist") should be defined once as a schema. When a technician completes the checklist, their answers are stored as a lightweight JSON document referencing the checklist template ID.

---

### UI Schema Driven Field Rendering

Source: Formbricks React components
Pattern: The frontend UI generates form fields dynamically by mapping a JSON question list to specialized input components.
Problem solved: Allows creating and updating complex forms without writing new code or deploying new web builds.
Applicability to Verity: HIGH — Technicians fill out inspection templates in the field. The mobile app must render check fields, photos, and signatures purely based on the JSON template schema.
