---
doc_id: API-OUTBOUND_MESSAGE
title: API contract — Outbound Message
generated: true
source_model: _model/capabilities/integrations.yaml
regenerate_with: python3 _tools/generate.py
---

# API contract — Outbound Message

*Generated. Edit `_model/capabilities/integrations.yaml`, not this file.*

All responses are permission-projected. A field the caller may not read is **absent** from the payload, never `null`, so a client cannot distinguish *hidden* from *empty*. Out-of-scope subjects return `404`, never `403`.

## Resource shape

```json
{
  "id": "uuid"  // immutable,
  "tenant_id": "uuid"  // immutable,
  "connection_id": "uuid",
  "event_type": "string"  // immutable,
  "event_version": "int"  // immutable,
  "source_capability_key": "string"  // immutable,
  "source_event_id": "uuid"  // immutable,
  "payload": "json"  // immutable,
  "payload_hash": "string"  // immutable,
  "created_at": "timestamptz"  // immutable,
  "next_attempt_at": "timestamptz",
  "attempt_count": "int",
  "last_status_code": "int",
  "last_response_excerpt": "text",
  "delivered_at": "timestamptz",
  "dead_lettered_at": "timestamptz",
  "dead_letter_reason": "text",
  "replayed_from_message_id": "uuid"
}
```

## Endpoints

| Method | Path | Action | Verb | Idempotent |
|---|---|---|---|---|
| GET | `/api/v1/integrations/outbound_message` | list | `list` | yes |
| GET | `/api/v1/integrations/outbound_message/{id}` | read | `view` | yes |
| POST | `/api/v1/integrations/outbound_message/{id}/deliver_message` | Deliver an outbound message | `execute` | yes |

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
> Location: `outbound_message.api.query_semantics` · Capability: `integrations`  
> **Blocks:** `ui:list:outbound_message`, `performance:outbound_message`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.
