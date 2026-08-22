# Domain and Meta-Model Inventory

## Core Model Types
Odoo's Object-Relational Mapping (ORM) implements three core class primitives:

1. **Persistent Models (`models.Model`)**:
   - Represents a permanent business object.
   - Maps directly to a PostgreSQL database table (e.g., `sale.order` maps to `sale_order`).
   - Maintains transactional records.
2. **Transient Models (`models.TransientModel`)**:
   - Represents temporary session states or step-by-step inputs (e.g., Wizards, Import configurations, Payment confirmation dialogs).
   - Maps to temporary PostgreSQL tables.
   - Cleaned up periodically (data older than a few hours) by the `ir.autovacuum` cron process.
3. **Abstract Models (`models.AbstractModel`)**:
   - Acts as a functional mixin or interface.
   - Does not map to a database table.
   - Used to share common functional fields, methods, or security logic across multiple models (e.g., `mail.thread` for messaging, `avatar.mixin` for profile images).

## Field Types and Attributes
Fields are defined in Python and compiled into database columns or calculated properties:

### 1. Basic Fields
- `Boolean`: Persistent boolean flag (`True` / `False`).
- `Char`: Fixed-size single-line text string (typically mapped to `varchar`).
- `Text`: Multi-line text block (mapped to `text`).
- `Html`: Multi-line text field containing HTML elements, with cross-site scripting (XSS) sanitation on writes.
- `Integer`: 32-bit integer value.
- `Float`: Double-precision floating-point number.
- `Monetary`: High-precision numeric decimal representing currency value. Requires a companion `Many2one` relation pointing to a `res.currency` record.
- `Selection`: An enumerable field with a fixed list of key-value pairs (stored as strings in database, translated in UI).
- `Date`: Date value (YYYY-MM-DD).
- `Datetime`: Timezone-aware date and time value (stored in database as UTC, converted to user local timezone at display-time).
- `Binary`: Byte stream storage for attachments, images, or documents.

### 2. Relational Fields
- `Many2one('target.model')`: A foreign key relation to a single record in another table. Handles database-level referential integrity (e.g. `partner_id` in `sale.order`).
- `One2many('target.model', 'inverse_field_id')`: Virtual relation representing the inverse of a `Many2one` field. Does not occupy a physical database column. Stored as an active query mapping at runtime.
- `Many2many('target.model', 'relation_table_name', 'column1', 'column2')`: Stored in a dedicated join table to handle many-to-many associations.

### 3. Advanced Field Attributes
- `compute='_method_name'`: Defines a computed field. The value is calculated dynamically by running the named method.
- `store=True|False`: Defaults to `False` for computed fields. If `store=True`, the computed value is cached in a physical database column and recalculated *only* when dependency fields (declared via `@api.depends`) change.
- `related='relation_id.field_name'`: Shorthand for a computed field that mirrors a field from a linked record (e.g., `related='partner_id.name'`).

## Validation and Constraints
Odoo supports constraints at both the database level and Python runtime:

### 1. SQL Constraints (`_sql_constraints`)
- List of tuple definitions compiled directly into PostgreSQL database constraints:
  ```python
  _sql_constraints = [
      ('code_uniq', 'unique(code)', 'The code must be unique!'),
  ]
  ```
- Evaluated and enforced natively by PostgreSQL at transaction commit.

### 2. Python Constraints (`@api.constrains`)
- Runtime validations executed when records are created or written to:
  ```python
  @api.constrains('price_unit')
  def _check_price_unit(self):
      for record in self:
          if record.price_unit < 0:
              raise ValidationError("Price cannot be negative!")
  ```
- If a constraint condition fails, it raises a `ValidationError`, aborting the operation and rolling back the transaction.

## Inheritance Strategies
Odoo models use three primary inheritance mechanics:

| Strategy | Syntax | Description | Database Outcome |
| :--- | :--- | :--- | :--- |
| **Classical Extension** | `_inherit = 'res.partner'` | Adds fields and overrides methods of the parent model directly in-place. | Modifies existing table columns. |
| **Prototypal Inheritance** | `_name = 'res.partner.new'`<br>`_inherit = 'res.partner'` | Copies all field schemas and logic from parent into a completely new model. | Creates a new table (`res_partner_new`) copy. |
| **Delegation Inheritance** | `_inherits = {'res.partner': 'partner_id'}` | Automatically delegates attribute access. If a field does not exist on the child model, it reads/writes to the linked parent. | Child table contains a foreign key field `partner_id`. |
