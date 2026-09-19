# Task 116 visual baseline — 2026-09-19

Authority: Task 116 Phase 0. This is an observed baseline, not a completion
claim. It records what was actually rendered in authenticated sessions before
the first implementation slice.

## Environments observed

### Production — business owner

- URL: `https://app.theverityai.xyz/overview`
- Deployment source at capture: `5c8fa33`
- Persona/account visible in shell: `naksh`
- Theme/viewport: dark desktop, approximately 1745×759 browser viewport
- Result: authenticated page rendered successfully.
- Primary finding: four equal headline cards were followed immediately by a
  second three-card band that repeated “Sales this month.” The page had many
  competent individual cards but no dominant business signal.
- Additional finding: the live shell correctly omitted the previously removed
  workspace pills.

### Local development — Company Core

- URL: `http://localhost:3001/outreach`
- Source: working tree after Task 116’s first component slice
- Persona/account visible in shell: `divyom.sharma`
- Theme/viewport: light desktop, 1280×720
- Result: authenticated page rendered successfully with no application error
  overlay and meaningful route content.
- Primary finding: direction, work queue, attention, pipeline pulse, team
  comparison, pipeline, funnel, creation, and lead table all render, but the
  page remains a long sequence of similarly framed content regions. This is the
  main Phase 3 composition target.
- The work queue’s initial `Loading…` state was visible during capture and then
  resolves independently; preserve that panel-level isolation while redesigning
  the composition.

## Route-family inventory

The production build route list is classified below. Dynamic detail routes
inherit the family of their parent unless noted.

### Executive/owner dashboards

- `/`
- `/overview`
- `/outreach`
- `/outreach/intelligence`
- `/hq`

### Daily-work workspaces

- `/approvals`
- `/counter`
- `/floor`
- `/kitchen`
- `/scheduling`
- `/outreach/workspace`
- `/outreach/team`

### Lists and catalogues

- `/assets`
- `/catalogue`
- `/customers`
- `/godowns`
- `/ledgers`
- `/locations`
- `/menu`
- `/outreach/domains`
- `/outreach/prospects`
- `/outreach/teams`
- `/people`
- `/prices`
- `/purchases`
- `/sales`
- `/stock`
- `/suppliers`
- `/transactions`

### Record-detail workspaces

- `/assets/[id]`
- `/catalogue/[productId]`
- `/customers/[customerId]`
- `/floor/[orderId]`
- `/godowns/[locationId]`
- `/locations/[id]`
- `/outreach/[id]`
- `/outreach/domains/[domainId]`
- `/outreach/teams/[teamId]`
- `/outreach/teams/[teamId]/members/[partyId]`
- `/purchases/[orderId]`
- `/sales/[orderId]`
- `/stock/[productId]`
- `/suppliers/[supplierId]`

### Forms and setup

- `/configuration`
- `/floor/setup`
- `/import`
- `/settings`
- `/settings/business`
- `/settings/tax`

### Reports and intelligence

- `/audit`
- `/evidence`
- `/finance`
- `/finance/[invoiceId]`
- `/outreach/intelligence`
- `/reports`
- `/reports/finance`
- `/reports/inventory`
- `/reports/purchases`
- `/reports/sales`
- `/tax`
- `/tax/close`
- `/tax/exceptions`
- `/tax/gstr-1`
- `/tax/gstr-3b`
- `/tax/itc`
- `/tax/purchases`

### Administration and HQ

- `/account`
- `/capabilities`
- `/hq/audit`
- `/hq/clients`
- `/hq/clients/[tenantId]`
- `/hq/clients/[tenantId]/modules`
- `/hq/clients/[tenantId]/operations`
- `/hq/clients/[tenantId]/organizations`
- `/hq/clients/[tenantId]/people`
- `/hq/clients/[tenantId]/roles`
- `/hq/clients/[tenantId]/settings`
- `/hq/settings`
- `/roles`
- `/workspace`

### Authentication and recovery

- `/sign-in`
- `/reset-password`
- `/reset-password/update`

### Infrastructure routes — outside visual page review

- `/_not-found`
- `/api/agent/chat`
- `/api/auth/oidc/callback`
- `/api/auth/oidc/logout`
- `/api/auth/oidc/start`
- `/api/health`
- `/api/metrics`
- `/api/ready`
- `/api/scheduled`
- `/icon.svg`

## Evidence gaps still open

- Store durable before screenshots in the repository evidence location.
- Capture Core dark and mobile.
- Capture Senior light/dark desktop/mobile.
- Capture Junior light/dark desktop/mobile.
- Capture owner light and mobile.
- Capture platform operator light/dark desktop/mobile.
- Capture representative populated, empty, loading, error, and permission-
  limited states.

These gaps prevent Phase 0 from being marked complete.

