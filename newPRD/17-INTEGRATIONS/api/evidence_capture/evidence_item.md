---
doc_id: API-EVIDENCE_ITEM
title: API contract — Evidence Item
generated: true
source_model: _model/capabilities/evidence_capture.yaml
regenerate_with: python3 _tools/generate.py
---

# API contract — Evidence Item

*Generated. Edit `_model/capabilities/evidence_capture.yaml`, not this file.*

All responses are permission-projected. A field the caller may not read is **absent** from the payload, never `null`, so a client cannot distinguish *hidden* from *empty*. Out-of-scope subjects return `404`, never `403`.

## Resource shape

```json
{
  "id": "uuid"  // immutable,
  "tenant_id": "uuid"  // immutable,
  "kind": "enum"  // immutable,
  "subject_capability_key": "string"  // immutable,
  "subject_ref": "uuid"  // immutable,
  "requirement_key": "string"  // immutable,
  "captured_at": "timestamptz"  // immutable,
  "received_at": "timestamptz"  // immutable,
  "captured_by_principal_id": "uuid"  // immutable,
  "device_ref": "uuid"  // immutable,
  "position": "geo_point"  // gated:view_sensitive, immutable,
  "position_accuracy_m": "int"  // immutable,
  "position_verdict": "enum"  // immutable,
  "content_hash": "string"  // immutable,
  "content_size_bytes": "bigint"  // immutable,
  "content_type": "string"  // immutable,
  "storage_ref": "string",
  "capture_metadata": "json"  // immutable,
  "from_live_capture": "bool"  // immutable,
  "clock_skew_seconds": "int"  // immutable,
  "redacted_at": "timestamptz",
  "redaction_reason": "text",
  "retention_class": "string",
  "expires_at": "timestamptz"
}
```

## Endpoints

| Method | Path | Action | Verb | Idempotent |
|---|---|---|---|---|
| GET | `/api/v1/evidence_capture/evidence_item` | list | `list` | yes |
| GET | `/api/v1/evidence_capture/evidence_item/{id}` | read | `view` | yes |
| POST | `/api/v1/evidence_capture/evidence_item/{id}/capture_evidence` | Capture evidence | `execute` | yes |
| POST | `/api/v1/evidence_capture/evidence_item/{id}/upload_evidence` | Upload captured evidence | `execute` | yes |
| POST | `/api/v1/evidence_capture/evidence_item/{id}/redact_evidence` | Redact evidence | `execute` | yes |

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
> Location: `evidence_item.api.query_semantics` · Capability: `evidence_capture`  
> **Blocks:** `ui:list:evidence_item`, `performance:evidence_item`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.
