---
doc_id: API-BILLABLE_OUTCOME
title: API contract — Billable Outcome
generated: true
source_model: _model/capabilities/billing.yaml
regenerate_with: python3 _tools/generate.py
---

# API contract — Billable Outcome

*Generated. Edit `_model/capabilities/billing.yaml`, not this file.*

All responses are permission-projected. A field the caller may not read is **absent** from the payload, never `null`, so a client cannot distinguish *hidden* from *empty*. Out-of-scope subjects return `404`, never `403`.

## Resource shape

```json
{
  "id": "uuid"  // immutable,
  "tenant_id": "uuid"  // immutable,
  "source_capability_key": "string"  // immutable,
  "source_ref": "uuid"  // immutable,
  "counterparty_ref": "uuid",
  "contract_ref": "uuid",
  "location_ref": "uuid",
  "occurred_at": "timestamptz"  // immutable,
  "quantity": "decimal",
  "unit_of_measure": "string",
  "rate_basis": "enum",
  "item_ref": "uuid",
  "description_at_time": "string",
  "evidence_refs": "json",
  "evidence_strength": "string",
  "classification_hint": "string",
  "rated_amount_minor": "money_minor"  // gated:view_financial,
  "rate_rule_ref": "uuid"  // gated:view_financial,
  "tax_classification": "string"  // gated:view_financial,
  "invoice_line_id": "uuid",
  "excluded_reason": "text"
}
```

## Endpoints

| Method | Path | Action | Verb | Idempotent |
|---|---|---|---|---|
| GET | `/api/v1/billing/billable_outcome` | list | `list` | yes |
| GET | `/api/v1/billing/billable_outcome/{id}` | read | `view` | yes |
| POST | `/api/v1/billing/billable_outcome/{id}/rate_outcome` | Work out what an outcome is worth | `execute` | yes |

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
> Location: `billable_outcome.api.query_semantics` · Capability: `billing`  
> **Blocks:** `ui:list:billable_outcome`, `performance:billable_outcome`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.
