# Form Patterns

## Purpose
Establishes the standard implementation patterns for forms, data mutations, validation, and offline optimistic updates across all shells.

## Scope
Form state management, validation schemas, server actions, error handling, and offline mutation queues.

## Authority
- Bible Synthesis ADAPTED (Zod)
- Next.js 16 App Router: EXISTING INFRASTRUCTURE
- CONSTITUTIONAL (Offline UX)

## Prerequisites
- Zod schemas defined for domain commands.
- UI components for inputs, buttons, and error states.

## Specification Requirements
- **WHAT MUST EXIST:** Robust client and server-side validation.
- **WHAT MUST EXIST:** Instant optimistic local mutations (especially in Worker Shell).
- **WHAT MUST EXIST:** Multi-step capability for complex intake processes.
- **WHAT MUST EXIST:** Field-level and form-level error visualization.

## Approved Architecture
- **Validation (Authority: Bible Synthesis ADAPTED):** Zod is the single source of truth for validation.
- **Submission (Authority: EXISTING INFRASTRUCTURE):** React 19 `useActionState` and Next.js Server Actions for form submissions.
- **Optimistic Updates (Authority: CONSTITUTIONAL):** React `useOptimistic` hook for immediate UI feedback before server confirmation.
- **Form State (Authority: EXISTING INFRASTRUCTURE):** HTML native forms progressively enhanced by React 19 form actions.

## Implementation Contract
- Define Zod schemas adjacent to Server Actions.
- In components, wrap Server Actions with `useActionState` to track `pending` and `error` states.
- Render field errors using `text-text-secondary` or brand red, explicitly tied to inputs via `aria-describedby` for accessibility.
- For the Worker Shell, wrap critical mutations in a background sync queue wrapper (if offline) and immediately update local state via `useOptimistic`.

## Constraints & Invariants
- **PRN-001:** Validation errors must be easily explainable and placed directly next to the offending input.
- Forms editing closed entities must be visually locked/disabled.

## Dependencies
- Depends on: Zod, Server Actions.
- Depended on by: Metadata-driven UI, Custom components.

## Failure Modes
- **Double Submission:** User clicks submit multiple times. Mitigate using `pending` state from `useFormStatus` to disable the submit button.
- **Offline Mutation Loss:** Worker submits offline, closes app, mutation lost. Mitigate by persisting offline mutation queue to `IndexedDB` before optimistic update.

## Testing Requirements
- E2E tests for form submission success and failure (validation error) states.
- Unit test optimistic state rollback on server action failure.

## Conformance Checks
- Forms must function without JavaScript enabled (Progressive Enhancement) where feasible, though complex dynamic forms may require JS.

## Traceability
- MET-ACT-001->004
- REQ-DATA-OFFLINE-001->003

## Open Decisions
- **IMPLEMENTATION DECISION REQUIRED:** Multi-step form state management approach (URL parameters vs React Context). URL parameters are preferred for shareability.
