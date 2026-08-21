---
doc_id: ACT-REPORTING-RUN_REPORT
title: Action — Run a report
generated: true
source_model: _model/capabilities/reporting.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Run a report

*This document is generated. Edit `_model/capabilities/reporting.yaml`, not this file.*

**Entity:** `report_run` · **Capability:** `reporting`

## 1. Specification

### Who can perform it

- any_authenticated
- system_scheduler
- integration_principal

### Preconditions

- the report is published
- every metric is agreed
- the reader holds view over at least one source

### Inputs

- report_id
- period_start
- period_end
- dimension_filters
- run_for_principal_id

### What is created

- report_run

### What is modified

None.

### What events fire

- reporting.run_completed
- reporting.run_failed

### Who is notified

- **to**: each recipient in the audience roles; **channel**: schedule_channel; **when**: the run is scheduled; **template**: scheduled_report; **must_include**: ['data_as_of', 'period']; **batching_policy**: one per recipient per schedule
- **to**: the report owner; **channel**: in_app; **when**: the run failed; **template**: report_run_failed; **must_include**: ['reason']

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

Runs are reads and do not contend with each other. They can contend with operational transactions where the change feed is unbound and aggregates are computed against the operational store, which is why interactive runs carry a short timeout and a row limit - a reporting query that starves the transaction that pays the wages is a worse outcome than a slow report.


### Audit class

read_sensitive_only

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_AUTHZ_SCOPE` | 404 | the reader's scope excludes some or all of the population | *(silent)* | False | rows and aggregates are both projected, the suppressed count is recorded and NOT shown, and where nothing remains the report renders an explicit no-data-within-your-access state rather than zeros. Zeros are a statement that nothing happened |
| `E_QUOTA` | 402 | the result exceeds row_limit | *(silent)* | False | the run FAILS rather than truncating. A truncated report renders as a complete one and is acted on as though it were |
| `E_PRECONDITION` | 409 | a metric definition is not agreed or has been retired | *(silent)* | False | the report is marked broken and the reason is shown rather than a figure computed without that component |
| `E_DEPENDENCY` | 424 | a reporting source is unavailable | *(silent)* | True | the run fails. A partial report is more dangerous than none, because the missing part is invisible |
| `E_RATE_LIMIT` | 429 | a principal running very large reports repeatedly | Too many attempts. Try again shortly. | True | this is the export-shaped access pattern seen in reporting, and it is limited for the same reason it is limited in search |
| `E_INTERNAL` | 500 | the run exceeds its timeout | *(silent)* | True | cancelled with the option to narrow. The reader is told what to change rather than being told it failed |

## 3. Edge cases

**EC-01.** A scheduled report delivered to five recipients with different scopes. Executed five times, once per recipient under their own scope, and each receives their own figures. Running once under the author's scope and distributing would disclose to every recipient everything the author can see, which is the single most likely disclosure in a reporting capability.

**EC-02.** A cell computed over a population small enough to identify an individual - one person's attendance at a location with one worker. Suppressed per the small-population rule, and the run states that suppression occurred without stating where. Stating where reintroduces the disclosure by elimination.

**EC-03.** A report spanning a metric definition change. Figures either side of the boundary are rendered with their versions and the boundary is marked. Presenting them as one series would be a comparison of two different numbers with one label.

**EC-04.** A run against data whose freshness is behind the target. data_as_of is stated on the rendering, always. A figure quoted in a meeting from data that was two hours stale is defensible if the staleness was visible and indefensible if it was not.

**EC-05.** An integration principal running reports on a schedule. Permitted within its own scope, rate-limited more tightly than a human, and always audited, for the same reason as in search - a service account paginating aggregates is an efficient way to reconstruct a dataset.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/reporting/report_run/run_report.md`.
