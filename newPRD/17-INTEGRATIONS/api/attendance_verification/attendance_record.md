---
doc_id: API-ATTENDANCE_RECORD
title: API contract — Attendance Record
generated: true
source_model: _model/capabilities/attendance_verification.yaml
regenerate_with: python3 _tools/generate.py
---

# API contract — Attendance Record

*Generated. Edit `_model/capabilities/attendance_verification.yaml`, not this file.*

All responses are permission-projected. A field the caller may not read is **absent** from the payload, never `null`, so a client cannot distinguish *hidden* from *empty*. Out-of-scope subjects return `404`, never `403`.

## Resource shape

```json
{
  "id": "uuid"  // immutable,
  "tenant_id": "uuid"  // immutable,
  "resource_ref": "uuid",
  "commitment_ref": "uuid",
  "location_ref": "uuid",
  "operating_day": "date",
  "claimed_start_at": "timestamptz",
  "claimed_end_at": "timestamptz",
  "verified_start_at": "timestamptz",
  "verified_end_at": "timestamptz",
  "agreed_start_at": "timestamptz",
  "agreed_end_at": "timestamptz",
  "start_evidence_strength": "enum",
  "end_evidence_strength": "enum",
  "start_evidence_ref": "string",
  "end_evidence_ref": "string",
  "start_position_verdict": "enum",
  "end_position_verdict": "enum",
  "start_margin_m": "int",
  "end_margin_m": "int",
  "break_minutes": "int",
  "payable_minutes": "int",
  "billable_minutes": "int"  // gated:view_financial,
  "substitution_of_resource_ref": "uuid",
  "recorded_by_principal_id": "uuid",
  "source": "enum",
  "device_ref": "uuid",
  "sync_lag_minutes": "int",
  "dispute_id": "uuid",
  "locked_at": "timestamptz"
}
```

## Endpoints

| Method | Path | Action | Verb | Idempotent |
|---|---|---|---|---|
| GET | `/api/v1/attendance_verification/attendance_record` | list | `list` | yes |
| GET | `/api/v1/attendance_verification/attendance_record/{id}` | read | `view` | yes |
| POST | `/api/v1/attendance_verification/attendance_record/{id}/record_attendance` | Record a start or an end | `execute` | yes |
| POST | `/api/v1/attendance_verification/attendance_record/{id}/settle_attendance` | Settle attendance for pay and billing | `execute` | yes |

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
> Location: `attendance_record.api.query_semantics` · Capability: `attendance_verification`  
> **Blocks:** `ui:list:attendance_record`, `performance:attendance_record`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.
