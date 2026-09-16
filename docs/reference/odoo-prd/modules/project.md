# Module: Project

## Purpose
The `project` module handles project management, task checklists, and service execution tracking.

## Scope
- Defines Projects (`project.project`) and Tasks (`project.task`).
- Manages Kanban task pipelines separated by project stages.
- Connects task execution to customer service records.
- Inherits collaborative capabilities (Chatter) from `mail`.

## Major Entities

### 1. Project (`project.project`)
- **Type**: Persistent Model.
- **Purpose**: Represents a project container.
- **Fields**:
  - `name`: Project title (required).
  - `partner_id`: Customer partner associated with the project (`Many2one`).
  - `user_id`: Project Manager / Owner (`Many2one` to `res.users`).

### 2. Task (`project.task`)
- **Type**: Persistent Model.
- **Purpose**: Represents an individual task or deliverable.
- **Fields**:
  - `name`: Task title (required).
  - `project_id`: Parent project (`Many2one`).
  - `user_ids`: Assigned employees (`Many2many` to `res.users`).
  - `stage_id`: Progress stage (`Many2one` to `project.task.type`).
  - `active`: Archival toggle.

## Core Workflows
- **Task Lifecycle**:
  - Tasks progress through stages (e.g. Backlog, In Progress, Review, Done).
  - Stage changes trigger activity notifications and email status updates to followers.

## Permissions
- Model Access is defined in `addons/project/security/ir.model.access.csv`.
- **Groups**:
  - `project.group_project_user`: Can create, edit, and update tasks they are assigned to.
  - `project.group_project_manager`: Can create projects, edit all tasks, and configure project templates.

## Traceability
- **Module Directory**: `addons/project`
- **Model Path**: `addons/project/models/project_project.py`
