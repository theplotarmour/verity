---
doc_id: TEST-RESOLVE_PRICE
title: Test catalogue — Work out what something costs
generated: true
source_model: _model/capabilities/catalog.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Work out what something costs

*This document is generated. Edit `_model/capabilities/catalog.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `resolve_price` is invoked by an authorised actor, then the declared records are created/updated and events [] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `resolve_price` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `resolve_price` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `resolve_price` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `resolve_price` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `resolve_price` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `resolve_price` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `resolve_price` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `resolve_price` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `resolve_price` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `resolve_price` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `resolve_price` succeeds. 

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `resolve_price` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `resolve_price` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `resolve_price` succeeds. 

## Tenant isolation

**T-016** A principal in tenant A invoking `resolve_price` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: no applicable price rule for this item, scope and instant → expect `E_PRECONDITION`. returns UNPRICED rather than zero. Zero is a price and it is the wrong one; a caller that receives zero will sell something for nothing, whereas one that receives unpriced must decide what to do

**T-018** Cause: two applicable rules at the same precedence → expect `E_CONFLICT_UNIQUE`. returns AMBIGUOUS with both rules named, and does not choose. This condition is prevented at save time and is caught again here because a rule can become ambiguous through a scope change elsewhere

**T-019** Cause: quantity falls in a gap between quantity-break rules → expect `E_VALIDATION`. returns UNPRICED naming the gap, so the fix is to the ladder rather than to the order

**T-020** Cause: the tax_treatment port is bound but unavailable → expect `E_DEPENDENCY`. the net price resolves and the tax component is returned as unknown rather than as zero. A tax of zero and a tax that could not be computed must never render identically

**T-021** Cause: selected options violate their group selection rule → expect `E_VALIDATION`, message: 'field-specific'. validated here as well as at order time, because a client that computes a price for an invalid selection will show it to somebody

## Edge cases

**T-022** (EC-01) A percent_of_list rule where no list price exists. Returns unpriced, not zero. A discount off nothing is nothing, and returning it as a price is how an item gets given away.

**T-023** (EC-02) Tax-inclusive and tax-exclusive rules both applicable at different precedences. The winning rule's own tax_inclusive flag governs and the response states which. Mixing the two silently across a single order is a systematic error that reconciles to nothing.

**T-024** (EC-03) Resolution at an instant in the past, for re-pricing a historical line during a dispute. Fully supported and is the reason rules are versioned and retained rather than edited. The answer must be identical to what was captured at the time, and any difference is itself a finding.

**T-025** (EC-04) A composite item priced from its composition rather than from a rule. Supported where the tenant configures derived pricing, and the derived price carries the composition version as its provenance. Where a rule also applies, the rule wins - an explicitly set price always beats a derived one, because somebody chose it.

**T-026** (EC-05) Resolution offline, on a cached rule set. Permitted, and the response is marked as resolved from a cache with its age. Any transaction completed on a cached price is re-resolved on sync, and a difference is surfaced as a conflict rather than silently accepted or silently overwritten - the person who quoted the price to a customer needs to know.

## Idempotency and concurrency

**T-027** Replaying the same request with the same idempotency key produces one effect and one event.

**T-028** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-029** An audit row of class `read_sensitive_only` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-030** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 30**
