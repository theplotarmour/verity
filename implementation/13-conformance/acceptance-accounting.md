# Acceptance script — Accounting (`verity.capability.accounting`)

Authority: `taskplans/85_foundation_conformance_acceptance_script.md`,
`taskplans/72_erpclaw_capability_accounting.md`. Second use of the template
`acceptance-plywood.md` established — written the same session the
capability itself was built (2026-09-04), so it IS the template used going
forward, not an afterthought reconstructed later.

MVP scope only — see Task 72 for what this capability does not yet do
(fiscal periods, budgets, statement reports).

## Prerequisite

A tenant with `verity.capability.accounting` active and an actor holding
`Create`/`Edit` on `verity.accounting.account` and
`verity.accounting.journal_entry`.

## 1. Create workspace

- [ ] Capability shows **Active**; `Accounting` appears in the `Money` nav
      group.

## 2. Configure defaults

- [ ] N/A — this MVP has no tenant-level configuration beyond the chart of
      accounts itself (item 3).

## 3. Create first master records

- [ ] `createAccount` — a Cash account (`type: "Asset"`) and a Sales account
      (`type: "Income"`) both created, appear via `listAccounts`.
- [ ] Duplicate `code` on a second `createAccount` call is rejected
      (`E_VALIDATION`), confirming the uniqueness precondition.

## 4. Perform a first transaction

- [ ] `postJournalEntry` with two balanced lines (debit Cash 10000 paise,
      credit Sales 10000 paise) succeeds.
- [ ] An unbalanced entry (debit ≠ credit) is rejected with
      `E_VALIDATION` naming the mismatch, and writes nothing (verify via
      `trialBalance` showing no partial line).
- [ ] A line that is both a debit and a credit (or neither) is rejected
      before any write.

## 5. Complete it

- [ ] `reverseJournalEntry` against the entry from step 4 posts a new entry
      with debit/credit swapped, `reversalOfId` set — the original entry is
      unchanged (append-only: confirm the DB rejects a direct UPDATE/DELETE
      attempt on `journal_entry`/`journal_line` via the
      `*_append_only` trigger).
- [ ] A second `reverseJournalEntry` against the same original entry is
      rejected (`E_VALIDATION: this entry has already been reversed`).

## 6. View the resulting report

- [ ] `trialBalance` shows both accounts back to zero net movement after the
      reversal (10000 debit + 10000 credit on Cash from the two entries;
      same on Sales) — the reversal is visible as a second row, not an edit
      of the first.
- [ ] `accountLedger` for the Cash account lists both journal entries in
      posting order with their memos.

## 7. Verify the audit trail

- [ ] Both `postJournalEntry` calls (original + reversal) produced a
      `verity.accounting.journal_entry_posted` / `..._reversed` event with
      actor and correlation id.
- [ ] No step above required a direct database edit — every write went
      through `postJournalEntry`/`reverseJournalEntry`, and the append-only
      trigger makes a bypass structurally impossible, not merely
      discouraged.

## Result

**Not yet walked live** — this MVP is registered and migrated (2026-09-04)
but this script has not been run against a real tenant session yet. Marking
it PENDING rather than PASS until someone actually walks it; do not treat
"the code exists" as equivalent to "the script passed," which is the exact
distinction this taskplan exists to enforce.
