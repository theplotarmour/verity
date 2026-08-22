# Permissions in UI

## Purpose
Defines how the UI adapts to user permissions, ensuring that forbidden actions are hidden or disabled, and navigation gracefully reflects access levels without compromising security.

## Scope
Component-level permission gating, navigation filtering, disabled action states. Excludes backend authorization logic (handled in Domain Layer).

## Authority
- PRN-001: Least Surprise / Explainable Automation
- PRN-002: Progressive Disclosure of Complexity
- Bible V1 (System of Record - Unified Party Identity)

## Prerequisites
- Identity and RBAC/Permission claims available in user session.

## Specification Requirements
- **WHAT MUST EXIST:** UI must not expose actions, buttons, or navigation links that the user is explicitly forbidden from executing.
- **WHAT MUST EXIST:** If an action is contextually disabled (e.g., user has permission, but the entity is in a closed state), it should be shown as disabled with a clear explanation, rather than completely hidden.

## Approved Architecture
- **Access Control Context (Authority: EXISTING INFRASTRUCTURE):** Utilize React Context or server-side session parsing to provide the current user's claims to components.
- **Server-Driven UI (Authority: Next.js):** Primary permission filtering occurs in Server Components to ensure zero byte transfer for restricted feature UI code.

## Implementation Contract
- Implement an `<AccessGate required={['manage:work_orders']}>` wrapper component for conditionally rendering UI blocks.
- In Server Components, evaluate session claims before rendering sensitive layout segments or table columns.
- For actions disabled by *state* (not permission), render the button with `disabled={true}` and a tooltip/title explaining why (e.g., "Cannot edit a completed work order") to satisfy PRN-001.
- For actions disabled by *permission*, omit the button entirely to satisfy PRN-002 and reduce clutter.

## Constraints & Invariants
- **INV-002:** Read-Only Closed States - No mutation components (buttons, forms) should be active if the entity is in a terminal state, regardless of the user's high-level permissions.
- Client-side hiding of UI elements is purely for UX; it MUST NOT be relied upon for security. The backend Server Action/API MUST independently verify permissions.

## Dependencies
- Depends on: Session claims, Domain state.
- Depended on by: All interactive components.

## Failure Modes
- **Phantom Actions:** UI shows a button, user clicks, server returns 403. Mitigate by ensuring exact alignment between UI gate conditions and backend auth guards.

## Testing Requirements
- Render tests for components with mocked privileged and unprivileged user sessions.

## Conformance Checks
- Search codebase to ensure sensitive forms are wrapped in server-side permission checks.

## Traceability
- Bible V1
- PRN-001
- PRN-002

## Open Decisions
- None.
