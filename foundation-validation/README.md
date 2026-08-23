# Foundation Validation

Evidence for the **VERITY PLATFORM FOUNDATION READY** milestone.

This directory is not authority. It records how the foundation was tested against capabilities
that do not exist, and what that exercise found. The authorities remain `verity-bible/`,
`verity-spec/` and `implementation/`.

## Method

The foundation-ready definition (A–J) asks whether new capabilities, entities, workflows,
permissions, events, UI, configuration and client systems can be introduced without altering the
platform. Prose alone cannot answer that, because the failure mode being tested for is precisely
the one an author does not notice.

So the exercise ran in two parts:

1. **One capability was actually composed** end-to-end against the running platform, using only
   its public surface — `src/test/foundation-acceptance.test.ts`.
2. **Seven more were modelled on paper** against the same primitives, answering the six questions
   for each, recorded in [capability-analysis.md](./capability-analysis.md).

## The demonstrated capability

**Drone Inspection** was chosen because nothing anywhere in the corpus anticipates it. There is
no aerial concept in the Bible, no altitude in the specification, no flight window in the
handoff. If the foundation carries it unchanged, that is evidence rather than assertion.

It was composed entirely from platform primitives:

| Layer | How it was satisfied |
|---|---|
| Storage | The capability created its own table with the base entity pattern and its own RLS policy |
| Registration | `capability_definition` + `entity_definition` |
| Lifecycle | Four states the platform has never seen — `planned → in_flight ⇄ grounded → report_filed` |
| Domain attributes | Tenant custom fields (`airframe`, `max_altitude_m`, `airspace_class`) |
| Business rule | A tenant configuration value (`drone.max_altitude_m`) enforced as a command precondition |
| Write path | A command through the standard pipeline, with authorization and event emission |
| Audit | The shared `Activity` stream |
| Automation | The shared workflow engine with two registered node handlers |
| Interface | Navigation and a form descriptor built from metadata |

**Result: no platform file was modified.** The only file added to the repository was the test
itself — verified by `git status` against `src/server/platform`, `src/components` and `prisma`.
Fourteen assertions cover the path, including that an undeclared transition is refused, that a
terminal state locks the record and its form, that an undeclared extension value is rejected, and
that suspending the capability makes it vanish from navigation *and* blocks its commands.

## Findings

Three things this exercise surfaced, none of them silently patched.

**1. A capability needs a migration, not just registration.** The platform deliberately does not
generate tables at runtime, so a capability ships DDL. That is the right trade — an EAV store
masquerading as a schema would be worse — but it means "install a capability" is a deployment
event, not a runtime one. Condition A holds; it is worth stating plainly that it holds at deploy
time.

**2. Row-level and field-level authorization are not yet enforced.** PLA-AUT-004 and PLA-AUT-005
are specified and their `scope` values are carried through resolution, but nothing evaluates them.
Every capability modelled here needs at least row-level scoping — a technician seeing only their
own site is the single most repeated requirement across all eight. This is the largest remaining
gap and is called out in each analysis rather than assumed away.

**3. `Resource` is still undecided (ADR-002).** Five of the eight capabilities want to schedule
something that is not a single person — a crew, a bay, a vehicle, a scanner. The foundation does
not model `Resource` at all yet, which is correct: ADR-002 is deliberately open, and inventing a
Resource shape to make a hypothetical capability work is exactly what the kickoff forbade. The
analyses record what each capability would need so the decision can be made against real demand.

## Status of the milestone

The foundation-ready conditions are assessed in [capability-analysis.md](./capability-analysis.md).
Conditions A–C and E–J are met and demonstrated. **Condition D is partially met**: new permissions
can be introduced without changing the authorization architecture, but only entity-level checks are
enforced today.
