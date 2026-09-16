# Route, Action, API, and Guard Inventory

## Runtime routes

The clean Next.js build emitted 76 routes/pages/layouts, grouped below. `:id` denotes the build's dynamic segment.

| Plane/capability | Routes | Primary guard style | Audit note |
|---|---|---|---|
| Public/auth | `/sign-in`, `/icon.svg` | auth resolution/redirect | `/reset-password` is linked but absent |
| Shell/platform | `/`, `/account`, `/approvals`, `/assets`, `/assets/:id`, `/audit`, `/capabilities`, `/configuration`, `/evidence`, `/locations`, `/locations/:id`, `/people`, `/roles`, `/scheduling`, `/workspace` | shell actor + per-page permission/scope/direct tenant reads | activation not uniform on direct reads |
| Trading/Plywood | `/catalogue`, `/catalogue/:productId`, `/customers`, `/customers/:customerId`, `/finance`, `/finance/:invoiceId`, `/godowns`, `/godowns/:locationId`, `/import`, `/ledgers`, `/overview`, `/prices`, `/purchases`, `/purchases/:orderId`, `/reports`, `/reports/finance`, `/reports/inventory`, `/reports/purchases`, `/reports/sales`, `/sales`, `/sales/:orderId`, `/settings/business`, `/settings/tax`, `/stock`, `/stock/:productId`, `/suppliers`, `/suppliers/:supplierId`, `/tax`, `/tax/close`, `/tax/exceptions`, `/tax/gstr-1`, `/tax/gstr-3b`, `/tax/itc`, `/tax/purchases`, `/transactions` | mixture of registered queries and direct tenant reads | substantial surface; suspension test required |
| Dine-in | `/counter`, `/counter/:billId`, `/floor`, `/floor/:orderId`, `/floor/setup`, `/kitchen`, `/menu` | worker/shell auth + permission/domain reads | scheduler-bound SLA behavior not on-prem wired |
| Outreach | `/outreach`, `/outreach/:id`, `/outreach/check-in`, `/outreach/intelligence`, `/outreach/reports`, `/outreach/targets`, `/outreach/team`, `/outreach/workspace` | actor + role/scope checks + direct tenant reads | broad implementation; DB tests blocked |
| HQ/operator | `/hq`, `/hq/audit`, `/hq/clients`, `/hq/clients/:tenantId`, `/hq/clients/:tenantId/modules`, `/operations`, `/organizations`, `/people`, `/roles`, `/settings` under client segment, plus `/hq/settings` | platform-operator resolution and client-entry context | unauth access denied in runtime probe |
| APIs | `/api/agent/chat`, `/api/health`, `/api/metrics`, `/api/ready`, `/api/scheduled` | actor; public liveness; bearer secret; DB probe; bearer secret | all inventoried below |

## API controls

| Route | Method | Authentication | Authorization/scope | Input controls | Observed unauth result |
|---|---|---|---|---|---|
| `/api/agent/chat` | POST | `requireActor` | tool manifest + normal command/query policy | bounded JSON, rate limit | not invoked with body; static guard present |
| `/api/health` | GET | public | none by design | no body | 200, liveness identity only |
| `/api/ready` | GET | public | none by design | 3s DB probe | 200, `db=ok` |
| `/api/metrics` | GET | `CRON_SECRET` in production | operator-only metric snapshot | constant-time comparison | 401 |
| `/api/scheduled` | GET/POST | `CRON_SECRET` | enumerates only active tenant IDs, re-enters each tenant transaction | cadence allowlist, tenant selector | 401 |

## Server Actions

| File | Exported actions | Boundary |
|---|---|---|
| `actions/platform.ts` | `runCommand`, `runQuery`, `switchOrganization`, `signInWithPassword`, `signOut` | generic execution chokepoints plus auth/context actions |
| `actions/hq.ts` | `createClientAction`, `enterClientAction`, `runClientCommand`, `runClientQuery` | platform-operator/client-entry wrapper |
| `actions/people.ts` | `createTeamLogin`, `resetTeamPassword`, `suggestPassword` | authorization before Supabase admin call; target membership check |
| `actions/account.ts` | `changeOwnPassword` | authenticated self-service, Supabase-specific |
| `actions/import.ts` | preview/commit | schema validation + command batch |
| `actions/outreach.ts` | `generateLeadInsight` | actor-scoped agent turn/tool subset |

## Guard chain

```text
Browser/API request
  -> verified Supabase or OIDC principal
  -> memberships_for_auth_user(principal id)
  -> signed active-membership selection, rechecked
  -> ActorContext (tenant, organization, role, membership)
  -> withTenant transaction sets tenant GUC and asserts RLS-enforceable role
  -> command/query: input validation -> active capability -> policy -> scope/redaction
  -> handler -> activity/event/audit -> commit
```

The broken edge is presentation code that jumps from ActorContext to `withTenant` + Prisma and performs permission/scope checks without the active-capability step.

