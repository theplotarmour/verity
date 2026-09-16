# Module: Accounting (Account)

## Purpose
The `account` module handles the double-entry bookkeeping engine, customer invoicing, vendor bills, tax calculations, payments, and general ledgers of Odoo.

## Scope
- Executes financial entries matching standard double-entry accounting rules (Debits must equal Credits).
- Processes and registers Customer Invoices and Vendor Bills.
- Schedules payments and performs manual or automatic Bank Reconciliations.
- Handles multi-currency transactions and local tax reporting structures.
- Inherits collaborative capabilities (Chatter) from `mail`.

## Major Entities

### 1. Account Move (`account.move`)
- **Type**: Persistent Model.
- **Purpose**: Represents a general journal entry. Also used for customer invoices, vendor bills, and refunds (`move_type` field dictates behavior).
- **Fields**:
  - `name`: Sequential identifier (e.g. `INV/2026/08/0001`).
  - `partner_id`: Customer/Vendor.
  - `move_type`: Type enum (`entry`, `out_invoice` (customer invoice), `in_invoice` (vendor bill), `out_refund`, `in_refund`).
  - `state`: Enumerable status (`draft`, `posted`, `cancel`).
  - `line_ids`: Journal lines container (`One2many`).

### 2. Account Move Line (`account.move.line`)
- **Type**: Persistent Model.
- **Purpose**: Individual ledger entries mapping debits, credits, and account codes.
- **Fields**:
  - `move_id`: Parent entry (`Many2one`).
  - `account_id`: General ledger account (`Many2one` to `account.account`).
  - `debit`: Debit amount.
  - `credit`: Credit amount.
  - `balance`: Computed balance (`debit - credit`).

### 3. Account Journal (`account.journal`)
- **Type**: Persistent Model.
- **Purpose**: Transaction log registers.
- **Types (`type`)**: `sale` (customer invoices), `purchase` (vendor bills), `cash` (cash registers), `bank` (bank accounts), `general` (miscellaneous adjustment entries).

## Core Workflows
- **Posting Journal Entry**:
  - Transition: `draft` → `posted` via `action_post()`.
  - Validations:
    - Debits must match Credits exactly (`sum(debit) == sum(credit)`).
    - Period must be open for accounting postings.
  - Side effects:
    - Generates a permanent sequential invoice number.
    - Locks the values of the lines from further edits.

## Permissions
- Model Access is defined in `addons/account/security/ir.model.access.csv`.
- **Groups**:
  - `account.group_account_invoice`: Can read/create/edit customer invoices and vendor bills.
  - `account.group_account_readonly`: Read-only access to accounts and ledgers.
  - `account.group_account_user`: Can edit, post entries, and perform reconciliations.
  - `account.group_account_manager`: Can change fiscal settings, periods, lock dates, and charts of accounts.
