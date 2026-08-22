# Verity Master Platform Specification

## projects/03-entities.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/projects.md`
*   **Verity Bible Authority**: `verity-bible/volume_2_metamodel_primitives.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. List of persistent and transient entities.

This document details the `projects` capability specs for the `03 Entities` contract.

### REQ-PROJECTS-03ENTITIES-001
*   **Requirement**: The capability manages `Project, ProjectTask` elements.
*   **Status**: `[FACT]`
*   **Source Reference**: `odoo/addons/project/models/project_task.py`

### REQ-PROJECTS-03ENTITIES-002
*   **Requirement**: State changes are constrained to enums: `PLANNING, ACTIVE, COMPLETED, SUSPENDED`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-PROJECTS-03ENTITIES-003
*   **Requirement**: Mutations are restricted to actions: `create_project, create_task, complete_project`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-PROJECTS-03ENTITIES-004
*   **Requirement**: Offline sync conflict class is `MERGEABLE`.
*   **Status**: `[DECIDED]`
