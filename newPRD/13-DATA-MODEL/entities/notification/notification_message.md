---
doc_id: ENT-NOTIFICATION_MESSAGE
title: Entity — Message
generated: true
source_model: _model/capabilities/notification.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Message

*This document is generated. Edit `_model/capabilities/notification.yaml`, not this file.*

**Capability/module:** `notification` · **Owner scope:** `tenant`

One attempt to tell one recipient one thing on one channel, with what was rendered, what it cost and what the provider said happened.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `template_id` | uuid | yes | no | — | no | no |  |
| `template_version` | int | yes | yes | — | no | no |  |
| `recipient_principal_id` | uuid | no | no | — | no | no |  |
| `recipient_party_ref` | uuid | no | no | — | no | no |  |
| `recipient_channel_ref` | uuid | no | no | — | no | no | which channel of theirs, resolved through the party_directory port with consent and suppression already applied |
| `audience_rule` | text | yes | no | — | no | no | how this recipient was selected - the role, the relationship or the subscription. Recorded so that "why did I get this" is answerable, which is the second most common support question this capability generates |
| `source_capability_key` | string | yes | no | — | no | no |  |
| `source_ref` | uuid | no | no | — | no | no |  |
| `trigger_event_id` | uuid | no | no | — | no | no | the event that caused it, so duplicate suppression can key on it |
| `rendered_subject` | string | no | yes | — | no | no |  |
| `rendered_body` | text | yes | yes | — | no | no | what was actually sent, frozen. Re-rendering from the template at read time would show a recipient something different from what they received |
| `channel` | enum | yes | no | — | no | no |  |
| `cost_class` | enum | yes | no | — | no | yes |  |
| `estimated_cost_minor` | money_minor | no | no | — | no | yes |  |
| `priority` | enum | yes | no | — | no | no |  |
| `mandatory_class` | enum | yes | no | — | no | no |  |
| `scheduled_for` | timestamptz | no | no | — | no | no | set when a message is held for quiet hours or for batching |
| `sent_at` | timestamptz | no | no | — | no | no |  |
| `provider_reference` | string | no | no | — | no | no |  |
| `delivery_state` | enum | yes | no | — | no | no |  |
| `failure_reason` | text | no | no | — | no | no |  |
| `attempt_count` | int | yes | no | — | no | no |  |
| `batch_id` | uuid | no | no | — | no | no |  |
| `dedupe_key` | string | yes | no | — | no | no | computed from the trigger, the recipient and the template. The uniqueness constraint on it is what makes at-least-once upstream delivery safe |

## 2. Lifecycle

States: `queued`, `held`, `sent`, `delivered`, `read`, `failed`, `suppressed`, `expired`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `queued` | GAP | GAP | GAP | entity-specific, see capability model |
| `held` | GAP | GAP | GAP | entity-specific, see capability model |
| `sent` | GAP | GAP | GAP | entity-specific, see capability model |
| `delivered` | GAP | GAP | GAP | entity-specific, see capability model |
| `read` | GAP | GAP | GAP | entity-specific, see capability model |
| `failed` | GAP | GAP | GAP | entity-specific, see capability model |
| `suppressed` | GAP | GAP | GAP | entity-specific, see capability model |
| `expired` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. unique(tenant_id, dedupe_key) within the deduplication window. At-least-once event delivery upstream plus retries here means a duplicate message is the expected failure rather than an unlikely one.
2. rendered_body is frozen. A recipient disputing what they were told must be shown what was sent, not what the current template would produce.
3. A message may not be created for a channel the recipient has suppressed or has not consented to for its cost class, except where mandatory_class is other than none, and even then never on a channel that is hard-suppressed by a bounce.
4. delivery_state=delivered means only that the provider reported delivery. No inference beyond that is permitted anywhere in the platform.
5. Financial fields are gated by view_financial. The rendered body is gated by the permissions of the record it concerns, not by the notification capability's own rules.

## 4. Deletion and retention semantics

| Question | Answer |
|---|---|
| Soft or hard delete | Soft by default (`deleted` reserved state). Hard delete only via retention job or a data-subject erasure request. |
| What happens to children | Blocked if any child row in a non-terminal state references this row. The user is shown the blocking rows, not a generic error. |
| What happens to audit rows | Retained. Audit rows are never cascade-deleted. |
| What happens to emitted events | Retained. Events are immutable history. |
| Archive vs delete | Archive removes from default lists and aggregate reports; delete removes from all reads except audit and legal hold. |

## 5. Tenant isolation

Tenancy mode: `tenant_scoped_with_site_partition`. Enforced by Postgres row-level security on `tenant_id`, not by application `WHERE` clauses. Every query runs under a role that cannot see other tenants even if the application layer forgets a predicate. Cross-tenant reads require a platform archetype and are audited under `security`.

## 6. Related documents

- Permission matrix: `14-PERMISSIONS/notification/notification_message.md`
- Screen specifications: `11-UX/screens/notification/notification_message/`
- Test catalogue: `20-TESTING/notification/notification_message/`
