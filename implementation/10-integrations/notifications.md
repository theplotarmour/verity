# Notifications Integration

## Purpose
This document details the multi-channel notification dispatch system for communicating with users and parties.

## Scope
**In Scope:** Email, SMS/WhatsApp, Push notifications orchestration.
**Out of Scope:** UI toast notifications (these are client-side).

## Authority
- EXISTING INFRASTRUCTURE (Resend for Email, WhatsApp setup)
- Bible V5 (Novu pattern for multi-channel orchestration)

## Prerequisites
- Communication providers configured.

## Specification Requirements
- Reliable notification delivery based on user preferences.

## Approved Architecture
- Multi-channel orchestrator observing domain events.

## Implementation Contract
- **Multi-channel orchestration:** Dispatch notifications across various channels seamlessly. Reference the Novu pattern.
- **Channels:**
  - Email (Resend: EXISTING INFRASTRUCTURE)
  - WhatsApp (EXISTING INFRASTRUCTURE)
  - Push (IMPLEMENTATION DECISION REQUIRED for push notification provider)
- **Notification templates:** Templates defined per event type.
- **User notification preferences:** Users must be able to opt-in/out of specific channels or event types.
- **Tenant-scoped configuration:** Tenants must be able to configure their own sender identities (e.g., custom domains for email).

## Constraints & Invariants
- Notifications must fail silently relative to the core transaction (never block a business process).

## Dependencies
- Outbox / Domain events.
- Resend, WhatsApp API.

## Failure Modes
- Provider outages delay notifications.
- Malformed templates crash the renderer.

## Testing Requirements
- Mocked provider endpoints.
- Template rendering tests.

## Conformance Checks
- Verify user preferences are respected before dispatch.

## Traceability
- Bible V5

## Open Decisions
- IMPLEMENTATION DECISION REQUIRED: Push notification provider (e.g., FCM, APNS).
