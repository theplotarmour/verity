# Verity Master Platform Specification

## 02_meta_model/views.md

## Provenance
*   **Primary Sources**: `odoo-prd/09-ui-ux-model.md` / `reference/metabase/concept-inventory.md`
*   **Verity Bible Authority**: [verity-bible/volume_4_experience_ux.md](file:///D:/Code/verity/verity-bible/volume_4_experience_ux.md)
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Declarative View System

Verity's user interfaces are not hardcoded static pages. Display structures (views) are defined as database metadata schemas and rendered dynamically by the experience shells.

---

## 2. Supported Operational Views

The experience system supports four canonical display layouts defined in the metadata layer:

### MET-VIW-001: List View
*   **Description**: Tabular representation of multiple records.
*   **Metadata Parameters**:
    *   `columns` (Array of objects specifying field key, label, data type, and sortable boolean).
    *   `default_sort` (Field key and direction).
    *   `row_actions` (Actions exposed to users on row select).
*   **Status**: `[UNKNOWN]`

### MET-VIW-002: Kanban View (Board)
*   **Description**: Visual card lists grouped into columns by State or status.
*   **Metadata Parameters**:
    *   `group_by_field` (Field key, e.g. `status`).
    *   `card_fields` (Fields to render on each card preview).
    *   `drag_action` (The Action triggered when dragging a card between columns).
*   **Status**: `[UNKNOWN]`

### MET-VIW-003: Calendar View
*   **Description**: Timeline grid mapping allocations to date-time blocks.
*   **Metadata Parameters**:
    *   `start_datetime_field`, `end_datetime_field`.
    *   `resource_mapping_field` (e.g. `assigned_resource_id`).
*   **Status**: `[UNKNOWN]`

### MET-VIW-004: Map View
*   **Description**: Geospatial marker mapping of locations and active resources.
*   **Metadata Parameters**:
    *   `coordinates_field` (geo_point field link).
    *   `marker_label_field`, `color_status_field`.
*   **Status**: `[UNKNOWN]`
