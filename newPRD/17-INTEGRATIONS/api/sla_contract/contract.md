---
doc_id: API-CONTRACT
title: API contract — Contract
generated: true
source_model: _model/capabilities/sla_contract.yaml
regenerate_with: python3 _tools/generate.py
---

# API contract — Contract

*Generated. Edit `_model/capabilities/sla_contract.yaml`, not this file.*

All responses are permission-projected. A field the caller may not read is **absent** from the payload, never `null`, so a client cannot distinguish *hidden* from *empty*. Out-of-scope subjects return `404`, never `403`.

## Resource shape

```json
{
  "id": "uuid"  // immutable,
  "tenant_id": "uuid"  // immutable,
  "reference": "string"  // immutable,
  "counterparty_ref": "uuid",
  "title": "string",
  "starts_on": "date",
  "ends_on": "date",
  "auto_renew": "bool",
  "renewal_notice_days": "int",
  "scope_location_refs": "json",
  "scope_expression": "text",
  "billing_basis": "enum"  // gated:view_financial,
  "currency": "string"  // gated:view_financial,
  "value_minor": "money_minor"  // gated:view_financial,
  "penalty_cap_minor": "money_minor"  // gated:view_financial,
  "operating_calendar_ref": "uuid",
  "document_ref": "string",
  "owner_principal_id": "uuid",
  "version_number": "int",
  "supersedes_contract_id": "uuid"
}
```

## Endpoints

| Method | Path | Action | Verb | Idempotent |
|---|---|---|---|---|
| GET | `/api/v1/sla_contract/contract` | list | `list` | yes |
| GET | `/api/v1/sla_contract/contract/{id}` | read | `view` | yes |

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
> Location: `contract.api.query_semantics` · Capability: `sla_contract`  
> **Blocks:** `ui:list:contract`, `performance:contract`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.
