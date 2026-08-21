---
doc_id: API-AUDIT_DIGEST
title: API contract — Audit Digest
generated: true
source_model: _model/capabilities/core_audit.yaml
regenerate_with: python3 _tools/generate.py
---

# API contract — Audit Digest

*Generated. Edit `_model/capabilities/core_audit.yaml`, not this file.*

All responses are permission-projected. A field the caller may not read is **absent** from the payload, never `null`, so a client cannot distinguish *hidden* from *empty*. Out-of-scope subjects return `404`, never `403`.

## Resource shape

```json
{
  "id": "uuid"  // immutable,
  "tenant_id": "uuid"  // immutable,
  "window_start": "timestamptz"  // immutable,
  "window_end": "timestamptz"  // immutable,
  "record_count": "bigint"  // immutable,
  "first_record_hash": "string"  // immutable,
  "last_record_hash": "string"  // immutable,
  "merkle_root": "string"  // immutable,
  "previous_digest_signature": "string"  // immutable,
  "signature": "string"  // immutable,
  "signing_key_id": "string"  // immutable,
  "published_at": "timestamptz"  // immutable,
  "external_anchor_ref": "string"  // immutable
}
```

## Endpoints

| Method | Path | Action | Verb | Idempotent |
|---|---|---|---|---|
| GET | `/api/v1/core_audit/audit_digest` | list | `list` | yes |
| GET | `/api/v1/core_audit/audit_digest/{id}` | read | `view` | yes |
| POST | `/api/v1/core_audit/audit_digest/{id}/verify_digest` | Verify the audit chain | `execute` | yes |

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
> Location: `audit_digest.api.query_semantics` · Capability: `core_audit`  
> **Blocks:** `ui:list:audit_digest`, `performance:audit_digest`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.
