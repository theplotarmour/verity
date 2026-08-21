---
doc_id: API-PARTY_CHANNEL
title: API contract — Party Channel
generated: true
source_model: _model/capabilities/party.yaml
regenerate_with: python3 _tools/generate.py
---

# API contract — Party Channel

*Generated. Edit `_model/capabilities/party.yaml`, not this file.*

All responses are permission-projected. A field the caller may not read is **absent** from the payload, never `null`, so a client cannot distinguish *hidden* from *empty*. Out-of-scope subjects return `404`, never `403`.

## Resource shape

```json
{
  "id": "uuid"  // immutable,
  "tenant_id": "uuid"  // immutable,
  "party_id": "uuid",
  "channel_kind": "enum",
  "value": "string"  // gated:view_sensitive,
  "label": "string",
  "is_primary": "bool",
  "verified_at": "timestamptz",
  "verification_method": "enum",
  "consent_marketing": "enum",
  "consent_transactional": "enum",
  "consent_recorded_at": "timestamptz",
  "consent_evidence_ref": "string",
  "bounce_count": "int",
  "last_successful_delivery_at": "timestamptz",
  "suppressed_at": "timestamptz"
}
```

## Endpoints

| Method | Path | Action | Verb | Idempotent |
|---|---|---|---|---|
| GET | `/api/v1/party/party_channel` | list | `list` | yes |
| GET | `/api/v1/party/party_channel/{id}` | read | `view` | yes |
| POST | `/api/v1/party/party_channel/{id}/record_consent` | Record consent for a channel | `execute` | yes |

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
> Location: `party_channel.api.query_semantics` · Capability: `party`  
> **Blocks:** `ui:list:party_channel`, `performance:party_channel`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.
