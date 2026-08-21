---
doc_id: API-INVOICE
title: API contract — Invoice
generated: true
source_model: _model/capabilities/billing.yaml
regenerate_with: python3 _tools/generate.py
---

# API contract — Invoice

*Generated. Edit `_model/capabilities/billing.yaml`, not this file.*

All responses are permission-projected. A field the caller may not read is **absent** from the payload, never `null`, so a client cannot distinguish *hidden* from *empty*. Out-of-scope subjects return `404`, never `403`.

## Resource shape

```json
{
  "id": "uuid"  // immutable,
  "tenant_id": "uuid"  // immutable,
  "document_number": "string"  // immutable,
  "series_key": "string"  // immutable,
  "counterparty_ref": "uuid"  // immutable,
  "contract_ref": "uuid"  // immutable,
  "issue_date": "date"  // immutable,
  "due_date": "date"  // gated:view_financial,
  "period_start": "date",
  "period_end": "date",
  "currency": "string"  // gated:view_financial, immutable,
  "subtotal_minor": "money_minor"  // gated:view_financial,
  "tax_total_minor": "money_minor"  // gated:view_financial,
  "total_minor": "money_minor"  // gated:view_financial,
  "allocated_minor": "money_minor"  // gated:view_financial,
  "disputed_minor": "money_minor"  // gated:view_financial,
  "written_off_minor": "money_minor"  // gated:view_financial,
  "registration_required": "bool",
  "registration_reference": "string",
  "registration_qr": "text",
  "registration_deadline_at": "timestamptz",
  "registration_failure_reason": "text",
  "document_ref": "string",
  "sent_at": "timestamptz",
  "sent_via": "enum",
  "credit_of_invoice_id": "uuid",
  "document_kind": "enum"  // immutable
}
```

## Endpoints

| Method | Path | Action | Verb | Idempotent |
|---|---|---|---|---|
| GET | `/api/v1/billing/invoice` | list | `list` | yes |
| GET | `/api/v1/billing/invoice/{id}` | read | `view` | yes |
| POST | `/api/v1/billing/invoice/{id}/issue_invoice` | Issue an invoice | `execute` | yes |
| POST | `/api/v1/billing/invoice/{id}/issue_credit_note` | Credit an invoice | `execute` | yes |

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
> Location: `invoice.api.query_semantics` · Capability: `billing`  
> **Blocks:** `ui:list:invoice`, `performance:invoice`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.
