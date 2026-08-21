---
doc_id: API-ESCALATION_RULE
title: API contract — Escalation Rule
generated: true
source_model: _model/capabilities/lease_management.yaml
regenerate_with: python3 _tools/generate.py
---

# API contract — Escalation Rule

*Generated. Edit `_model/capabilities/lease_management.yaml`, not this file.*

All responses are permission-projected. A field the caller may not read is **absent** from the payload, never `null`, so a client cannot distinguish *hidden* from *empty*. Out-of-scope subjects return `404`, never `403`.

## Resource shape

```json
{
  "id": "uuid"  // immutable,
  "tenant_id": "uuid"  // immutable,
  "lease_id": "uuid",
  "applies_to_charge_kind": "enum",
  "method": "enum",
  "percentage": "decimal"  // gated:view_financial,
  "amount_minor": "money_minor"  // gated:view_financial,
  "index_key": "string",
  "index_lag_months": "int",
  "floor_percentage": "decimal"  // gated:view_financial,
  "cap_percentage": "decimal"  // gated:view_financial,
  "steps": "json",
  "effective_dates": "json",
  "last_applied_on": "date",
  "next_due_on": "date",
  "requires_agreement": "bool"
}
```

## Endpoints

| Method | Path | Action | Verb | Idempotent |
|---|---|---|---|---|
| GET | `/api/v1/lease_management/escalation_rule` | list | `list` | yes |
| GET | `/api/v1/lease_management/escalation_rule/{id}` | read | `view` | yes |
| POST | `/api/v1/lease_management/escalation_rule/{id}/apply_escalation` | Apply an escalation | `execute` | yes |

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
> Location: `escalation_rule.api.query_semantics` · Capability: `lease_management`  
> **Blocks:** `ui:list:escalation_rule`, `performance:escalation_rule`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.
