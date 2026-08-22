# Novu — Concept Inventory

Source: Novu Documentation (docs.novu.co)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Subscriber

Source: Novu Concepts
Definition: The entity receiving notifications (users, customers, or devices).
Key attributes: `subscriberId` (String), `email` (String), `phone` (String), `firstName`, `lastName`, `avatar`.
Notes for Verity: subscriber maps directly to Verity's `Party` (User or Customer Contact).

---

### Notification Workflow (Trigger)

Source: Novu Workflows
Definition: A blueprint containing the step-by-step logic, channels, templates, and delay conditions for sending notifications.
Key attributes:
- `id` (String) — trigger identifier
- `steps` (Array of steps: send SMS, wait 1 hour, send Email)
- `variables` (List of dynamic text parameters required by templates)
Relationships: Triggered by an event payload mapping variables to target Subscribers.

---

### Channel & Integration Provider

Source: Novu Channels
Definition: An abstract delivery channel (In-App, Email, SMS, Push, Chat/Slack) mapped to a specific Integration Provider (Sendgrid, Twilio, Firebase).
Purpose: Decouples notification intent from the third-party API implementation.

---

### Subscriber Preferences

Source: Novu Preferences
Definition: User-defined settings managing which notification categories (workflows) can be sent over which channels.
Key attributes: `enabled` (Boolean), `channels` (Map: email: true, sms: false).
Notes for Verity: Essential for GDPR and spam compliance.
