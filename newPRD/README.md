# VERITY-PRD

Machine-readable canonical specification with generated human-readable artifacts.

## What is authoritative

Only three things in this repository are hand-authored. Everything else is generated
and disposable — delete it, run the generator, and it returns byte-identical.

    _model/_vocabulary.yaml    shared vocabulary: roles, scopes, verbs, states,
                               event envelope, error taxonomy, UI states, audit classes
    _model/_kernel.yaml        the meta-model: the 16 constructs Verity is made of
    _model/_composition.yaml   how constructs compose into different business systems
    _model/capabilities/*.yaml one file per capability

## Regenerating

    python3 _tools/normalize_model.py    # repairs hand-authored YAML, idempotent
    python3 _tools/generate_v2.py        # emits everything below

## Generated output map

    00-EXECUTIVE/          kernel overview
    06-MODULE-SPECS/       one document per action
    07-PACKS/              pack definitions
    08-SYSTEM-BUILDER/     kernel construct reference, port contracts, composition model
    11-UX/screens/         one document per entity x screen x state
    13-DATA-MODEL/         entity docs, Postgres DDL with RLS, state machines
    14-PERMISSIONS/        role x verb x scope matrices
    15-EVENTS/             event catalogue
    17-INTEGRATIONS/api/   API contracts
    20-TESTING/            generated test catalogues
    23-DECISION-LOG/       contradictions and unresolved decisions
    24-OPEN-QUESTIONS/     gap register
    26-TRACEABILITY/       traceability matrix, dependency graph

Empty numbered folders are structural placeholders from the mandate. They are empty
because nothing has been modelled for them yet, not because they were forgotten.

## Reading order

1. 08-SYSTEM-BUILDER/composition-model.md
2. 00-EXECUTIVE/kernel-overview.md
3. 23-DECISION-LOG/contradictions-and-open-decisions.md
4. 24-OPEN-QUESTIONS/generated-gap-register.md

## Current state

29 capabilities modelled — the full library. 16 kernel constructs, 10 seed ports,
48 capability-declared ports, 5 packs, 105 entities, 115 actions, 741 transitions,
151 events, 3377 generated tests.

15,361 unresolved gaps, of which 15,335 are unconditional generator emissions and
26 are closable by model authoring. The gap register separates the two, because
the unconditional count is a constant multiplied by the entity count and therefore
rises every time a capability is authored — it is real work and it is not a
progress metric.

7 open architectural decisions, unchanged and deliberately unresolved. DEC-K-001
still gates the others.

## Verification

    python3 _tools/lint_model.py        # kernel invariants a model author can close
    python3 _tools/anti_erp_tests.py    # AET-01, 02, 03, 05 from the composition model

The lint reports only gaps a model author can act on; it deliberately ignores the
unconditional emissions. The anti-ERP tests are the objective answer to whether
this is still a composable platform. All four implemented tests pass; AET-04 needs
a runtime and AET-06 needs a threshold that is marked VALIDATION_REQUIRED.
