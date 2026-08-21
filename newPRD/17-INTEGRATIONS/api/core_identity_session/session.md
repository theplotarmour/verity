---
doc_id: API-SESSION
title: API contract — Session
generated: true
source_model: _model/capabilities/core_identity_session.yaml
regenerate_with: python3 _tools/generate.py
---

# API contract — Session

*Generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

All responses are permission-projected. A field the caller may not read is **absent** from the payload, never `null`, so a client cannot distinguish *hidden* from *empty*. Out-of-scope subjects return `404`, never `403`.

## Resource shape

```json
{
  "id": "uuid"  // immutable,
  "principal_id": "uuid",
  "tenant_id": "uuid",
  "device_id": "uuid",
  "surface": "enum",
  "issued_at": "timestamptz"  // immutable,
  "absolute_expiry_at": "timestamptz"  // immutable,
  "idle_expiry_at": "timestamptz",
  "revoked_at": "timestamptz",
  "revocation_reason": "enum",
  "elevated_until": "timestamptz",
  "impersonated_by_principal_id": "uuid",
  "impersonation_ticket_ref": "string",
  "ip_at_issue": "inet",
  "user_agent_at_issue": "text"
}
```

## Endpoints

| Method | Path | Action | Verb | Idempotent |
|---|---|---|---|---|
| GET | `/api/v1/core_identity_session/session` | list | `list` | yes |
| GET | `/api/v1/core_identity_session/session/{id}` | read | `view` | yes |
| POST | `/api/v1/core_identity_session/session/{id}/authenticate_password` | Sign in with email and password | `execute` | yes |
| POST | `/api/v1/core_identity_session/session/{id}/authenticate_phone_otp` | Sign in with phone and OTP | `execute` | yes |
| POST | `/api/v1/core_identity_session/session/{id}/verify_mfa` | Complete MFA challenge | `execute` | yes |
| POST | `/api/v1/core_identity_session/session/{id}/refresh_session` | Slide idle expiry | `execute` | yes |
| POST | `/api/v1/core_identity_session/session/{id}/elevate_session` | Step-up re-authentication | `execute` | yes |
| POST | `/api/v1/core_identity_session/session/{id}/logout` | Log out (this device) | `execute` | yes |
| POST | `/api/v1/core_identity_session/session/{id}/logout_all` | Log out of all devices | `execute` | yes |
| POST | `/api/v1/core_identity_session/session/{id}/switch_tenant` | Switch workspace | `execute` | yes |
| POST | `/api/v1/core_identity_session/session/{id}/reap_session` | Reap an expired session | `execute` | yes |

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
> Location: `session.api.query_semantics` · Capability: `core_identity_session`  
> **Blocks:** `ui:list:session`, `performance:session`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.
