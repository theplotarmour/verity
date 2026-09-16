# Module: Mail (Collaborative Hub)

## Purpose
The `mail` module is the productivity and collaboration engine of Odoo. It introduces the "Chatter" component, activity management, direct messaging, and email/notification integration, allowing users to collaborate on any business document.

## Scope
- Adds the collaborative chatter log at the bottom or side of business records (Opportunities, Orders, Invoices).
- Manages followers (`mail.followers`) who receive notifications upon document changes.
- Schedules, tracks, and triggers user actions (Activities like "To Do", "Call", "Email").
- Handles internal discussion channels and direct messages (`discuss.channel`).

## Major Entities

### 1. Mail Thread (`mail.thread`)
- **Type**: Abstract Model.
- **Purpose**: Inherited by other models (e.g. `sale.order`, `account.move`) to equip them with chatter and messaging capabilities.
- **Actions**:
  - `message_post()`: Publishes a message, internal note, or email to the record's chatter thread.
  - `message_subscribe()`: Adds partners as followers to the thread.

### 2. Mail Message (`mail.message`)
- **Type**: Persistent Model.
- **Purpose**: Stores individual chatter messages, system log notes (field modifications), and emails.
- **Fields**:
  - `body`: HTML content of the message.
  - `model` / `res_id`: Polymorphic link pointing to the specific document record.
  - `subtype_id`: Link to `mail.message.subtype` (e.g., "Discussions", "Activities", "Stage Changed").

### 3. Mail Activity (`mail.activity`)
- **Type**: Persistent Model.
- **Purpose**: Tracks scheduled tasks assigned to users on specific records.
- **Fields**:
  - `activity_type_id`: Type (e.g. Email, Call, Meeting, To Do).
  - `date_deadline`: Due date.
  - `user_id`: Assigned user.
  - `state`: Computed status (`overdue`, `today`, `planned`).

## Permissions
- Model Access is defined in `addons/mail/security/ir.model.access.csv`.
- **Chatter posting**: Users with read access to a document can typically post internal notes or read messages in its chatter thread.
- **Activity creation**: Users who can write to a document can create, edit, or complete activities linked to it.

## Traceability
- **Module Directory**: `addons/mail`
- **Model Files**: `addons/mail/models/*.py`
- **Controller Routes**: `addons/mail/controllers/`
