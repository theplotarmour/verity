---
doc_id: API-PENALTY_OBLIGATION
title: API contract — Penalty Obligation
generated: true
source_model: _model/capabilities/sla_contract.yaml
regenerate_with: python3 _tools/generate.py
---

# API contract — Penalty Obligation

*Generated. Edit `_model/capabilities/sla_contract.yaml`, not this file.*

All responses are permission-projected. A field the caller may not read is **absent** from the payload, never `null`, so a client cannot distinguish *hidden* from *empty*. Out-of-scope subjects return `404`, never `403`.

## Resource shape

```json
{
  "id": "uuid"  // immutable,
  "tenant_id": "uuid"  // immutable,
  "contract_id": "uuid",
  "service_level_id": "uuid",
  "measurement_period_start": "date",
  "measurement_period_end": "date",
  "breach_count": "int",
  "measured_value": "decimal",
  "target_value": "decimal",
  "calculated_amount_minor": "money_minor"  // gated:view_financial,
  "capped_amount_minor": "money_minor"  // gated:view_financial,
  "obligation_kind": "enum"  // gated:view_financial,
  "measurement_ids": "json",
  "approved_by_principal_id": "uuid",
  "applied_reference": "string",
  "waived_reason": "text"
}
```

## Endpoints

| Method | Path | Action | Verb | Idempotent |
|---|---|---|---|---|
| GET | `/api/v1/sla_contract/penalty_obligation` | list | `list` | yes |
| GET | `/api/v1/sla_contract/penalty_obligation/{id}` | read | `view` | yes |

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
> Location: `penalty_obligation.api.query_semantics` · Capability: `sla_contract`  
> **Blocks:** `ui:list:penalty_obligation`, `performance:penalty_obligation`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.
