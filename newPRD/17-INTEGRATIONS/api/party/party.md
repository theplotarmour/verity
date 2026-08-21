---
doc_id: API-PARTY
title: API contract — Party
generated: true
source_model: _model/capabilities/party.yaml
regenerate_with: python3 _tools/generate.py
---

# API contract — Party

*Generated. Edit `_model/capabilities/party.yaml`, not this file.*

All responses are permission-projected. A field the caller may not read is **absent** from the payload, never `null`, so a client cannot distinguish *hidden* from *empty*. Out-of-scope subjects return `404`, never `403`.

## Resource shape

```json
{
  "id": "uuid"  // immutable,
  "tenant_id": "uuid"  // immutable,
  "kind": "enum"  // immutable,
  "display_name": "string",
  "legal_name": "string"  // gated:view_sensitive,
  "primary_phone_e164": "e164"  // gated:view_sensitive,
  "primary_email": "citext"  // gated:view_sensitive,
  "tax_registration_id": "string"  // gated:view_sensitive,
  "tax_registration_kind": "enum",
  "identity_document_kind": "enum"  // gated:view_sensitive,
  "identity_document_ref": "string"  // gated:view_sensitive,
  "identity_verified_at": "timestamptz"  // gated:view_sensitive,
  "credit_limit_minor": "money_minor"  // gated:view_financial,
  "payment_terms_days": "int"  // gated:view_financial,
  "risk_flag": "enum"  // gated:view_financial,
  "source": "enum",
  "created_at": "timestamptz"  // immutable,
  "created_by_principal_id": "uuid",
  "merged_into_party_id": "uuid",
  "search_projection_hash": "string"
}
```

## Endpoints

| Method | Path | Action | Verb | Idempotent |
|---|---|---|---|---|
| GET | `/api/v1/party/party` | list | `list` | yes |
| GET | `/api/v1/party/party/{id}` | read | `view` | yes |
| POST | `/api/v1/party/party/{id}/create_party` | Add a party | `execute` | yes |

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
> Location: `party.api.query_semantics` · Capability: `party`  
> **Blocks:** `ui:list:party`, `performance:party`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.
