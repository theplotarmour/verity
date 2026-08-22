# Plane — Behavior Inventory

Source: Plane Documentation and Django model structure (GitHub: makeplane/plane dev branch)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Issue State Transition & Activity Logging

Source: Issue, IssueActivity models
Trigger: User or system modifies the `state` (status) of an Issue.
Preconditions: Target state belongs to the same Project.
Steps:
1. Validate the transition path.
2. Update the `state_id` on the Issue record.
3. Generate an `IssueActivity` record containing:
   - `actor`: the modifying User
   - `verb`: "updated" or "transitioned"
   - `field`: "state"
   - `old_value`: previous state name
   - `new_value`: target state name
4. Trigger real-time notifications to assignees.
State changes: `Issue.state_id` updated in DB, `IssueActivity` row created.

---

### Sub-Task Progress Rollup

Source: Plane Issue hierarchy rules
Trigger: A sub-task changes its status to completed.
Steps:
1. Recalculate parent issue progress percentage.
2. If parent progress calculation policy is automatic: update parent completion percentage.
3. If all sub-tasks are completed, prompt/alert user or auto-transition parent issue status to completed (depending on configuration).
Notes for Verity: Useful workflow helper for nested checklists.
