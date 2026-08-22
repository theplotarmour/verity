# MinIO — Behavior Inventory

Source: MinIO Object Management Reference (min.io/docs/minio/linux/index.html)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Presigned Upload URL Generation and Client PUT

Source: MinIO Go API Reference (GetPresignedObjectUrl)
Trigger: A client (e.g. mobile app) requests to upload a photo for a Work Order.
Steps:
1. Application backend authenticates the client session and verifies they have permissions to write to the designated path.
2. Backend calls MinIO SDK to generate a presigned PUT URL for bucket B and object key K, specifying an expiry time (e.g., 900 seconds) and content-type constraint.
3. Backend returns the presigned URL to the client.
4. Client uploads the raw binary file directly to MinIO using a PUT request with the presigned URL.
5. Client notifies backend upon successful upload completion, triggering metadata recording.
State changes: Object created in MinIO bucket.
Notes for Verity: This bypasses the application backend for large file transfers, protecting application bandwidth.

---

### Object Versioning and Rollback

Source: MinIO Object Versioning Reference
Trigger: A client overwrites an existing object key.
Steps:
1. MinIO detects versioning is enabled on the target bucket.
2. Instead of overwriting, MinIO generates a new `version_id`.
3. The new version becomes the "current" object version.
4. Preexisting versions remain accessible via their specific `version_id`.
5. If the current version is deleted, MinIO places a "Delete Marker", which can be removed to restore the previous version.
Notes for Verity: Important for contract/document revision audits.
