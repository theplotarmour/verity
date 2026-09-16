# Automation and Scheduled Processes

Odoo integrates both schedule-driven and event-driven automation frameworks to execute business rules asynchronously.

## 1. Scheduled Actions (`ir.cron`)

Scheduled actions are background operations executed periodically by the server's cron daemon.

### Technical Attributes
- `name`: Description of the action.
- `model_id`: The model against which the method is called.
- `user_id`: The security context under which the code runs (typically `base.user_root`).
- `interval_number`: Frequency count.
- `interval_type`: Time unit (Minutes, Hours, Days, Weeks, Months).
- `numbercall`: Limit on executions (-1 indicates infinite loop).
- `code`: The Python script block executed when the timer fires (e.g., `model._action_check_expiration()`).
- `active`: Boolean to toggle the schedule.

### Core Scheduled Actions in Odoo
- **Vacuum Cleaner (`ir.autovacuum`)**:
  - Run interval: Daily.
  - Functional purpose: Cleans up expired user web sessions, purges transient wizard tables (`TransientModel`), and clears temporary file attachments.
- **Mail Queue Manager (`mail.mail.queue.trigger`)**:
  - Run interval: Every few minutes (configurable).
  - Functional purpose: Sweeps the `mail.mail` outgoing table and sends queued emails to the external SMTP mail server.
- **Activity Scheduler**:
  - Run interval: Daily.
  - Functional purpose: Reviews scheduled activities and marks past-due items in red in the user chatter.

---

## 2. Automated Actions (`base.automation`)

Automated actions are event-triggered rules configured by administrators to automate manual workflows without writing new Python modules.

### Event Triggers (`trigger`)
- `on_create`: Fires immediately after a new record is saved in the database.
- `on_write`: Fires when specific fields on an existing record are modified.
- `on_create_or_write`: Combined create/write.
- `on_unlink`: Fires immediately before a record is deleted.
- `on_time`: Time-relative triggers (e.g. "Trigger 3 days after Sales Order Confirmation Date").

### Executable Actions
Upon trigger, the engine can execute:
- **Python Code**: Executes arbitrary scripting with access to variables `record` (the active record) and `env` (environment).
- **Update Record**: Modifies specific field values on the active record or a parent/related record.
- **Create Activity**: Automatically schedules an activity (e.g. "To Do", "Call") for a specified user.
- **Send Email / SMS**: Dispatches communications using pre-configured templates.
