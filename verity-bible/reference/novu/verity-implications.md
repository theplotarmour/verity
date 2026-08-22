# Novu — Verity Implications

Source: Novu Documentation (docs.novu.co)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Abstract Notification Service for External Providers

Confidence: HIGH
Recommendation: ADOPT
Rationale: Direct integration with vendor SDKs (e.g. Twilio) scattered across codebase makes refactoring and testing impossible. Abstracting notifications behind a unified service aligns with clean code principles.
If ADOPT: Verity defines a `Notification` primitive. Application code calls `NotificationService.send("worker.assigned", workerId, { job_id: 1 })`. The backend resolves templates, user preferences, and sends via Twilio/SMTP/APNS depending on environmental provider configs.
Affects Bible sections: Volume VI (Notification capability), Volume III (Event Bus)

---

### Dynamic Notification Templates

Confidence: HIGH
Recommendation: ADOPT
Rationale: Hardcoding email/SMS markup in TypeScript files prevents managers from tweaking phrasing. Storing template strings in the database with Handlebars/Mustache interpolation is much cleaner.
If ADOPT: Verity implements a `NotificationTemplate` entity containing: `slug`, `channel` (email | sms | push), `subject_template`, `body_template`. These are parsed at runtime with JSON payload contexts.
Affects Bible sections: Volume VI (Configuration & Extension)
