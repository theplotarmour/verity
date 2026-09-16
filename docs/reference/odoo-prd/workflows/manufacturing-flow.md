# Workflow: Manufacturing Flow

This document describes the material transformation process in Odoo MRP.

## Workflow Sequence

```mermaid
sequenceDiagram
    actor Planner as Production Planner
    actor Operator as Work Center Operator
    participant MO as Manufacturing Order (mrp.production)
    participant Inventory as Stock Move (stock.move)

    Planner->>MO: Create MO (draft)
    Planner->>MO: Confirm MO (action_confirm)
    Note over MO: State changes: draft -> confirmed
    MO-->>Inventory: Reserve Components (action_assign)
    Planner->>MO: Start Production (button_start)
    Operator->>MO: Consume Raw Materials
    Operator->>MO: Record Finished Goods & Validate (button_mark_done)
    Note over MO: State changes: progress -> done
```

## Step-by-Step Requirements

### 1. Creation & Confirmation
- **Trigger**: Reordering rule triggers or user creates manual MO.
- **Workflow**:
  - Confirms the MO (`action_confirm()`).
  - Generates component reservation moves (`stock.move`) from inventory.

### 2. Component Availability Check
- **Workflow**: The scheduler runs `action_assign()` on component moves. If items are in stock, they are reserved for the MO. If not, the MO state remains `confirmed` (waiting for materials).

### 3. Execution & Close
- **Workflow**:
  - The planner starts production (`button_start()`).
  - Workers execute steps at work centers.
  - Upon completion, clicking "Mark as Done" consumes components, creates finished product stock moves, updates valuation, and closes the MO (`done` state).
