# Novu — Architectural Patterns

Source: Novu Documentation (docs.novu.co)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Channel Abstraction (Provider Agnostic Routing)

Source: Novu Channels Architecture
Pattern: Application code never imports Twilio or Sendgrid directly. The application triggers an abstract "Workflow", and the notification engine dynamically routes the payload to the configured channel provider.
Problem solved: Allows switching SMS/Email vendors without modifying application code.
Applicability to Verity: HIGH — Verity should have a unified `NotificationService` that abstracts email, SMS (Twilio), and push notification delivery.

---

### Subscriber-Side Preference Management

Source: Novu Preferences
Pattern: Users manage preferences per Notification Category (e.g. billing alerts, assignment updates), mapping them to active channels.
Problem solved: Avoids hardcoding "opt-out" lists; provides professional compliance tools.
Applicability to Verity: HIGH — Essential for respect of worker and customer communication preferences.
