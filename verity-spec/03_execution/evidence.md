# Verity Master Platform Specification

## 03_execution/evidence.md

## Provenance
*   **Primary Sources**: `reference/minio/verity-implications.md` / `reference/formbricks/concept-inventory.md` (Signature capture)
*   **Verity Bible Authority**: [verity-bible/volume_3_execution_workflows.md](file:///D:/Code/verity/verity-bible/volume_3_execution_workflows.md) (Section 3: Evidence Primitive Model)
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Evidence Primitives

An **Evidence** record represents verified operational data captured in the field to validate that work was physically and correctly performed.

---

## 2. Immutability & Traceability

### EXE-EVI-001: Write-Once Immutability
*   **Rule**: Once an Evidence record (image file pointer, signature vector, GPS coordinate verify log) is successfully uploaded and associated with a Work Order, it is strictly read-only. Editing or deleting evidence records by technicians or dispatchers is blocked.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### EXE-EVI-002: Metadata Traceability
*   **Rule**: Every Evidence record must carry:
    *   `captured_by_user_id` (FK to User).
    *   `gps_coordinates` (latitude, longitude, accuracy radius in meters).
    *   `device_timestamp` (DateTime recorded by local client clock at capture).
    *   `work_order_id` (FK to WorkOrder).
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

---

## 3. Supported Evidence Types

### EXE-EVI-003: Photo Evidence
*   **Description**: Image files captured via the mobile camera.
*   **Validation Constraint**: The upload payload must preserve original camera Exif metadata (timestamp, focal length) where available to prevent upload of pre-existing images.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### EXE-EVI-004: Signature Capture
*   **Description**: Digital sign-off captured on the touchscreen client.
*   **Format**: Stored as an encoded SVG vector coordinate path rather than a low-resolution bitmap screenshot to ensure clarity.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### EXE-EVI-005: Geo-Match Verification
*   **Description**: Comparison check verifying that the device coordinates at check-in or submit match the target Location's geofence bounds.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`
