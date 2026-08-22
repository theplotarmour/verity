# Formbricks — Behavior Inventory

Source: Formbricks Types and Schema (GitHub: formbricks/formbricks)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Logic Branching Evaluation

Source: Survey Frontend Engine
Trigger: User inputs or changes an answer to a question during form entry.
Steps:
1. Lookup logical rules (`SurveyLogic`) associated with the active question.
2. Evaluate condition against user input (e.g. check if `input_value == "Yes"`).
3. If true, dynamically adjust the questionnaire steps:
   - Mark target question as visible.
   - Or set next step destination to target question ID.
State changes: Modifies UI wizard step sequence.
Notes for Verity: Essential for work order inspection checklists — e.g. "If safety check fails, force technician to upload photo of defect before continuing."

---

### Submission Validation & Data Mapping

Source: Formbricks API Schema Validation
Trigger: Client submits a completed form (Response).
Preconditions: Survey template is active.
Steps:
1. Parse the submitted key-value data map.
2. For each question in the Survey template:
   - Verify if required fields are populated.
   - Run type validations (validate numbers, verify files, check email format).
   - If validation fails, abort submission and return specific field error.
3. Save validated Response record to database.
Failure handling: Aborts with validation error if required inputs are empty.
