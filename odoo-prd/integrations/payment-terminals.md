# Integration: Payment Terminals

## Purpose
Specifies Odoo's connectivity with POS hardware payment terminals (e.g. Adyen, Ingenico, Stripe) and electronic payment gateways.

## Scope
- Defines the network communication protocol between Odoo POS clients and payment terminals.
- Logs electronic transaction IDs for bank reconciliation.
- Handles authorization, completion, and refund flows.

## Functional Requirements
1. **POS Client-Terminal Loop**:
   - The cashier triggers an electronic payment from the POS checkout screen.
   - Odoo dispatches a payment request payload (amount, order reference) to the local terminal IP or cloud API.
   - The terminal locks and prompts the customer to present their card.
   - The terminal returns transaction status (`approved`, `declined`, `error`).
2. **Error and Reversal Handling**:
   - In case of communication drop, cashiers can trigger manual payment validation, logging an offline transaction reference code.

## Traceability
- **Source Module**: `point_of_sale`, `payment`
- **Source Files**: `addons/point_of_sale/models/pos_payment.py`
