# Task Plan 46A — API Inventory

This document is the endpoint inventory companion to Task 46.

It must be produced as a separate artifact and populated from the actual
repository, not from assumptions.

## Required Table

| Method | Route | Auth | RBAC | Tenant scope | Validation | Mutation | Audit |
| ------ | ----- | ---- | ---- | ------------ | ---------- | -------- | ----- |

## Inventory

### HTTP Routes

| Method | Route | Auth | RBAC | Tenant scope | Validation | Mutation | Audit |
| ------ | ----- | ---- | ---- | ------------ | ---------- | -------- | ----- |
| GET | `/api/health` | None | None | None | None | No | No |
| GET | `/api/ready` | None | None | None | DB probe only | No | No |
| GET | `/api/metrics` | Production-only operator secret | Operator secret gate, not tenant RBAC | None | Header compare | No | No |
| GET | `/api/scheduled` | Shared cron secret | Secret gate, not tenant RBAC | `tenant=<uuid>` or `tenant=all` | Query param + cadence whitelist | Yes | Yes, via scheduled work |
| POST | `/api/scheduled` | Shared cron secret | Secret gate, not tenant RBAC | `tenant=<uuid>` or `tenant=all` | Query param + cadence whitelist | Yes | Yes, via scheduled work |

### Server Actions

| Method | Route | Auth | RBAC | Tenant scope | Validation | Mutation | Audit |
| ------ | ----- | ---- | ---- | ------------ | ---------- | -------- | ----- |
| Server Action | `src/server/actions/platform.ts::runCommand` | Verified actor | Command-level permission checks | Derived from active membership | Command schema | Yes | Yes, through command runtime |
| Server Action | `src/server/actions/platform.ts::runQuery` | Verified actor | Query-level permission checks | Derived from active membership | Query schema | No | No direct mutation |
| Server Action | `src/server/actions/platform.ts::switchOrganization` | Verified actor | Membership ownership check | Selected membership's tenant | Membership id membership check | Yes | Yes, security event |
| Server Action | `src/server/actions/platform.ts::signInWithPassword` | Supabase auth | No tenant RBAC before sign-in | None until actor exists | FormData fields | Yes, session state | Best-effort auth success only |
| Server Action | `src/server/actions/platform.ts::signOut` | Existing session | None | None | None | Yes, session state | No direct audit |
| Server Action | `src/server/actions/hq.ts::createClientAction` | Verified operator | Operator authority | New client tenant | FormData fields | Yes | Through `createClient` |
| Server Action | `src/server/actions/hq.ts::enterClientAction` | Verified operator | Operator authority | Target client tenant | FormData field `tenantId` | Yes | Through `enterClient` |
| Server Action | `src/server/actions/hq.ts::runClientCommand` | Verified operator | Command-level permission checks inside target tenant | Target tenant | Command schema | Yes | Yes, through command runtime |
| Server Action | `src/server/actions/hq.ts::runClientQuery` | Verified operator | Query-level permission checks inside target tenant | Target tenant | Query schema | No | No direct mutation |

## Required Coverage

* public endpoints
* admin endpoints
* internal endpoints
* webhooks
* file endpoints
* bootstrap endpoints
* health endpoints

## Acceptance Criteria

* [ ] Every route found in the repository is listed or explicitly excluded with reason.
* [ ] Each row records authentication and authorization posture.
* [ ] Each row records tenant scope behavior.
* [ ] Each row records validation strategy.
* [ ] Each row states whether it mutates state.
* [ ] Each row states whether it is audited.

## Notes

* No additional HTTP routes were identified in the inspected surface beyond the
  four routes above.
* The server-action list is included because those actions are the effective
  mutation/query boundary for the application.
