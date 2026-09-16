# UI/UX Specification

Odoo employs a metadata-driven UI engine. Instead of coding HTML screens manually, views are declared in XML. The web client (built on the **OWL (Odoo Web Library)** JavaScript framework) fetches these XML view definitions and dynamically renders the interface.

## Core View Types

### 1. Form View (`form`)
Used to create and edit individual business records.
- **Header**: Positioned at the top of the form. Displays the workflow status bar (stages/states) and action buttons. Action buttons are linked to Python methods (e.g. `Confirm` triggers `action_confirm`).
- **Sheet**: The main white card area. Contains fields arranged in columns (`<group>`).
- **Notebook**: Tabbed container at the bottom. Used to show related lines in a table structure (e.g. `<field name="order_line">` in Sales Orders).
- **Chatter**: Side or bottom panel that embeds the collaborative thread (`mail.thread`), followers, message history, and scheduled activities.

### 2. List/Tree View (`tree`)
Used to display collections of records in a table format.
- Supports column-level sorting, filtering, and summarization (e.g., adding `sum="Total"` to a column).
- Can enable inline editing (`editable="top"` or `editable="bottom"`) to modify rows directly without opening the full Form View.

### 3. Kanban View (`kanban`)
A visual card board where records are represented as cards grouped in vertical columns.
- Columns typically correspond to a relational field (e.g., `stage_id` in CRM).
- **Drag-and-Drop Interaction**: Dragging a card from one column to another automatically updates the stage field on the record and executes any stage-change side effects or validation rules.

### 4. Search View (`search`)
Defines the searching, filtering, and grouping options available for a model.
- **Filters**: Static filters configured in XML (e.g., `<filter name="my_orders" string="My Orders" domain="[('user_id', '=', uid)]"/>`).
- **Group By**: Allows aggregating list/kanban views by a specific field (e.g., `<filter string="Customer" name="group_by_partner" context="{'group_by': 'partner_id'}"/>`).
