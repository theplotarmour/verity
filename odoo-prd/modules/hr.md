# Module: Employees (HR)

## Purpose
The `hr` module provides organizational charting, department allocations, job positions, and employee profiles.

## Scope
- Defines Employee profiles (`hr.employee`).
- Manages Department structures (`hr.department`).
- Configures Job Positions (`hr.job`).
- Integrates with messaging and activities for internal employee communication.

## Major Entities

### 1. Employee (`hr.employee`)
- **Type**: Persistent Model.
- **Purpose**: Represents an employee.
- **Fields**:
  - `name`: Display name (required).
  - `user_id`: Linked backend user login (`Many2one` to `res.users`).
  - `parent_id`: Manager contact (`Many2one` to `hr.employee`).
  - `department_id`: Associated Department (`Many2one` to `hr.department`).

### 2. Department (`hr.department`)
- **Type**: Persistent Model.
- **Purpose**: Represents internal business units.
- **Fields**:
  - `name`: Department name.
  - `manager_id`: Department manager (`Many2one` to `hr.employee`).

## Core Workflows
- **Organizational Hierarchy**:
  - Linking `parent_id` manager paths on employee records dynamically updates the hierarchical corporate organization charts.

## Permissions
- Model Access is defined in `addons/hr/security/ir.model.access.csv`.
- **Groups**:
  - `hr.group_hr_user`: Can view colleague contact lists and submit requests.
  - `hr.group_hr_manager`: Full access to employee personnel records, contract details, and system configurations.

## Traceability
- **Module Directory**: `addons/hr`
- **Model Path**: `addons/hr/models/hr_employee.py`
