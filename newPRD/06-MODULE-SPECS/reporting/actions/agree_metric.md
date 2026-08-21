---
doc_id: ACT-REPORTING-AGREE_METRIC
title: Action — Agree what a number means
generated: true
source_model: _model/capabilities/reporting.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Agree what a number means

*This document is generated. Edit `_model/capabilities/reporting.yaml`, not this file.*

**Entity:** `metric_definition` · **Capability:** `reporting`

**Why this exists:** Modelled as an explicit act of agreement rather than as saving a definition, because the failure this capability exists to prevent is two people reading one figure and meaning different things. The agreement is the product; the query is an implementation detail.


## 1. Specification

### Who can perform it

- ops_manager
- finance
- tenant_owner
- tenant_admin

### Preconditions

- the decision question is stated
- the time basis is stated
- a denominator is stated where the aggregation requires one
- the source is reportable

### Inputs

- key
- label
- decision_question
- source
- aggregation
- measure_field
- filter_expression
- exclusions
- time_basis
- grain
- denominator_definition
- target_value
- direction_of_good

### What is created

- metric_definition

### What is modified

- previous version superseded

### What events fire

- reporting.metric_agreed

### Who is notified

- **to**: the owners of every report referencing the previous version; **channel**: in_app; **when**: this supersedes an agreed version; **template**: metric_definition_changed; **must_include**: ['what_changed', 'which_reports', 'that_historical_figures_keep_the_old_version']

### Can it be undone

Yes.

### Concurrency behaviour

Definitions are versioned rather than updated, so concurrent agreements produce an ordered sequence and the later supersedes. Published figures reference the version they were computed under, so no historical figure is ever changed by a definition change - the property that makes a quarter-on-quarter comparison honest.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_VALIDATION` | 422 | decision_question empty | What decision is this number for? | False | refused. This is the one field that separates a metric from a dashboard tile, and the kernel excludes dashboards |
| `E_VALIDATION` | 422 | time_basis not stated | Choose whether this counts by when it happened or when it was recorded. | False | never defaulted. The two give different answers whenever anything arrives late, which in a field operation is constantly |
| `E_VALIDATION` | 422 | a ratio or rate with no denominator definition | Say what this is a proportion of. | False |  |
| `E_VALIDATION` | 422 | the filter expression fails static analysis or exceeds the cost ceiling | field-specific | False | rejected at save rather than timing out during a board meeting |
| `E_PRECONDITION` | 409 | a published figure references the version being revised | This action is not available in the current state. | False | the correct path is a new version, and the message says so |
| `E_AUTHZ_FIELD` | 200 | the definition aggregates a financial field and the agreeing principal lacks view_financial | *(silent)* | False | refused. Agreeing the meaning of a number you cannot see is agreeing to something you have not read |

## 3. Edge cases

**EC-01.** Two metrics with similar labels and different definitions - a completion rate counted by occurrence and another counted by recording. Both are legitimate and both must exist, and the decision question is what distinguishes them for a reader. The model does not prevent near-duplicates; it makes their difference legible.

**EC-02.** A metric whose exclusions grow over time until the number describes mostly what was excluded. The exclusion share monitor exists for this, and it is the condition under which a metric quietly stops describing reality while continuing to look healthy.

**EC-03.** A metric agreed by one person where the tenant has only one. Permitted; the guard requires two principals or tenant_owner alone, and a single-person tenant has tenant_owner. Requiring two in a business of one makes the capability unusable, which is the failure mode the kernel warns about for over-configured onboarding.

**EC-04.** Agreeing a metric over a source that later becomes unreportable when a capability is disabled. The metric survives, reports referencing it break, and the audience is told. Silently dropping it would change every report that used it without anybody noticing.

**EC-05.** A definition change that makes this quarter incomparable with last. Historical figures keep their version and any rendering that spans the boundary is flagged. This is the single most useful property of versioning definitions and the reason it is worth the machinery.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/reporting/metric_definition/agree_metric.md`.
