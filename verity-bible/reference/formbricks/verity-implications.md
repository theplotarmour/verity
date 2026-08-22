# Formbricks — Verity Implications

Source: Formbricks Types and Schema (GitHub: formbricks/formbricks)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Dynamic Checklist Templates (Form Schemas)

Confidence: HIGH
Recommendation: ADOPT
Rationale: Hardcoding safety check columns or inspection questions in TypeScript code breaks the platform. Different companies need different check procedures for different equipment. A dynamic form template system solves this.
If ADOPT: Verity implements a `ChecklistTemplate` entity containing a `questions` JSON array (specifying ID, type, label, required status, and skip logic). Work Orders reference a `ChecklistTemplate`. The technician app renders the questionnaire dynamically.
Affects Bible sections: Volume II (Work Primitive), Volume VI (Configuration & Extension)

---

### Decoupled Checklist Submissions (Evidence Collection)

Confidence: HIGH
Recommendation: ADOPT
Rationale: Storing checklist responses directly in the work order row limits flexibility. Decoupling responses as a separate entity referencing the template keeps the work order schema clean.
If ADOPT: Verity implements a `ChecklistResponse` entity: `workOrderId`, `templateId`, `data` (JSONB key-value mapping question IDs to responses). Storing this as JSONB allows querying specific questions while preserving flexibility.
Affects Bible sections: Volume III (Execution), Volume V (Data Architecture)
