---
doc_id: ACT-REPORTING-EXPORT_REPORT
title: Action — Export a report
generated: true
source_model: _model/capabilities/reporting.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Export a report

*This document is generated. Edit `_model/capabilities/reporting.yaml`, not this file.*

**Entity:** `report_export` · **Capability:** `reporting`

**Why this exists:** An export leaves the system permanently and cannot be recalled. Everything about this action is designed so that the copy is traceable and so that exporting is never a way around a gate the interface applied.


## 1. Specification

### Who can perform it

- any_authenticated
- auditor
- finance

### Preconditions

- A completed run exists for this reader.
- A purpose is stated.
- The acting session is elevated where the report is financial or sensitive.
- The row count is within the export limit.

### Inputs

- run_id
- format
- purpose

### What is created

- report_export
- a generated file

### What is modified

None.

### What events fire

- reporting.exported

### Who is notified

- **to**: the report owner; **channel**: in_app; **when**: always; **template**: report_exported; **must_include**: ['who', 'purpose', 'row_count']
- **to**: tenant_owner; **channel**: in_app_and_email; **when**: the report is financial or sensitive; **template**: sensitive_export; **must_include**: ['who', 'purpose', 'row_count', 'withheld_fields']; **mandatory_legal**: True

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

One export per principal at a time; a second queues. Two large exports from one tenant have the same load profile as an incident.

### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_VALIDATION` | 422 | purpose empty | State why you are exporting. It is recorded and shown to the workspace owner. | False |  |
| `E_AUTHN` | 401 | the report is financial or sensitive and the session is not elevated | Confirm your identity to continue. | False |  |
| `E_QUOTA` | 402 | the row count exceeds max_export_rows | Plan limit reached. | False | narrow the period. An export of an entire history is a migration and belongs to a different, separately authorised path |
| `E_PRECONDITION` | 409 | the run has expired | This action is not available in the current state. | False | re-run first, so that the exported figures are computed under the reader's current scope rather than a stale one |
| `E_RATE_LIMIT` | 429 | repeated exports of overlapping periods | Too many attempts. Try again shortly. | True | this pattern is a bulk extraction assembled from pieces and it is limited for that reason |

## 3. Edge cases

**EC-01.** An export by a reader whose gates withheld fields. The file states which fields were withheld and under which gate. A recipient reading a partial file as complete is how a decision gets made on data somebody was deliberately not shown.

**EC-02.** Two readers exporting the same report and receiving different files. Correct and expected, and the watermark identifies whose file each is. Without it two partial files circulate and neither can be attributed.

**EC-03.** An export link forwarded outside the tenant. The link expires and is non-guessable, and the watermark in the file identifies who took it. The model cannot prevent forwarding and makes the copy attributable, which is the honest limit of what it can do.

**EC-04.** An auditor exporting an entire period as evidence. Supported and is a legitimate primary use, and it is exactly the same path with the same audit record as any other export. There is no privileged export that avoids the trail.

**EC-05.** An export requested for a run whose small-population cells were suppressed. The suppression carries into the file. Exporting is never a route to the cells the interface withheld.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/reporting/report_export/export_report.md`.
