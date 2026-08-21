---
doc_id: API-BOOKING
title: API contract — Booking
generated: true
source_model: _model/capabilities/booking.yaml
regenerate_with: python3 _tools/generate.py
---

# API contract — Booking

*Generated. Edit `_model/capabilities/booking.yaml`, not this file.*

All responses are permission-projected. A field the caller may not read is **absent** from the payload, never `null`, so a client cannot distinguish *hidden* from *empty*. Out-of-scope subjects return `404`, never `403`.

## Resource shape

```json
{
  "id": "uuid"  // immutable,
  "tenant_id": "uuid"  // immutable,
  "reference": "string"  // immutable,
  "booked_by_party_ref": "uuid",
  "subject_party_ref": "uuid",
  "contact_channel_ref": "uuid",
  "location_ref": "uuid",
  "offering_ref": "uuid",
  "requested_resource_ref": "uuid",
  "starts_at": "timestamptz",
  "ends_at": "timestamptz",
  "party_size": "int",
  "channel": "enum",
  "deposit_required_minor": "money_minor"  // gated:view_financial,
  "deposit_paid_minor": "money_minor"  // gated:view_financial,
  "deposit_reference": "string"  // gated:view_financial,
  "cancellation_policy_id": "uuid",
  "cancellation_deadline_at": "timestamptz",
  "notes": "text",
  "access_requirements": "text"  // gated:view_sensitive,
  "source_waitlist_id": "uuid",
  "rescheduled_from_booking_id": "uuid",
  "reschedule_count": "int",
  "no_show_recorded_at": "timestamptz",
  "arrived_at": "timestamptz"
}
```

## Endpoints

| Method | Path | Action | Verb | Idempotent |
|---|---|---|---|---|
| GET | `/api/v1/booking/booking` | list | `list` | yes |
| GET | `/api/v1/booking/booking/{id}` | read | `view` | yes |
| POST | `/api/v1/booking/booking/{id}/hold_slot` | Hold a slot while somebody decides | `execute` | yes |
| POST | `/api/v1/booking/booking/{id}/confirm_booking` | Confirm a booking | `execute` | yes |
| POST | `/api/v1/booking/booking/{id}/cancel_booking` | Cancel a booking | `execute` | yes |

## Error responses

| Code | HTTP | Semantics |
|---|---|---|
| `E_AUTHN` | 401 | Session expired. Sign in again. |
| `E_AUTHZ_ENTITY` | 403 | must not reveal record existence |
| `E_AUTHZ_SCOPE` | 404 | deliberately 404 not 403 to avoid confirming existence outside scope |
| `E_AUTHZ_FIELD` | 200 | field omitted from response, never nulled, so client cannot distinguish empty from hidden |
| `E_VALIDATION` | 422 | field-specific |
| `E_PRECONDITION` | 409 | This action is not available in the current state. |
| `E_CONFLICT_VERSION` | 409 | Someone else changed this record. |
| `E_CONFLICT_UNIQUE` | 409 | A record with this value already exists. |
| `E_RATE_LIMIT` | 429 | Too many attempts. Try again shortly. |
| `E_DEPENDENCY` | 424 | A required service is unavailable. |
| `E_QUOTA` | 402 | Plan limit reached. |
| `E_TENANT_SUSPENDED` | 423 | This workspace is suspended. |
| `E_OFFLINE_STALE` | 409 | This was changed while you were offline. |
| `E_INTERNAL` | 500 | Something went wrong. The team has been notified. |

## Pagination, filtering, sorting

> **GAP [blocking] — list query semantics not specified: pagination strategy (cursor vs offset), which fields are filterable and sortable, default sort, and maximum page size**  
> Location: `booking.api.query_semantics` · Capability: `booking`  
> **Blocks:** `ui:list:booking`, `performance:booking`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.
