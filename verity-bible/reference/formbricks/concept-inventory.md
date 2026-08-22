# Formbricks — Concept Inventory

Source: Formbricks Types and Schema (GitHub: formbricks/formbricks)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Survey (Form Template)

Source: `packages/types/surveys/types.ts`
Definition: The schema representing a dynamic form definition, containing questions, conditional routing, and layout rules.
Key attributes:
- `id` (String)
- `name` (String)
- `questions` (Array of Question objects)
- `logic` (Array of SurveyLogic objects representing skip logic)
- `status` (draft | active | paused)
Notes for Verity: Maps directly to Verity's Work Order checklists and inspection templates.

---

### Question

Source: `packages/types/surveys/types.ts`
Definition: An individual data collection input field within a Survey.
Supported types:
- `text`: single/multi line text
- `multipleChoice`: single/multi-select option list
- `number`: numeric input with min/max rules
- `fileUpload`: file/photo attachment upload
- `date`: calendar date selection
- `signature`: digital signature capture (critical for work order completion evidence)

---

### SurveyLogic (Skip/Branching Logic)

Source: `packages/types/surveys/types.ts`
Definition: Rules mapping a question's response to dynamic routing actions (e.g. if question 1 is "Leak detected", show question 2 "Leak location", otherwise skip to question 3).
Key attributes: `condition` (equals | notEquals | contains), `value`, `destination` (target question ID | end of survey).

---

### Response (Submission)

Source: Formbricks Submissions
Definition: The populated key-value answers submitted by a user for a specific Survey instance.
Key attributes: `surveyId`, `personId`, `data` (Key-value map of question IDs to submitted values).
Notes for Verity: Verity decouples the Template (Survey) from the populated Result (Response).
