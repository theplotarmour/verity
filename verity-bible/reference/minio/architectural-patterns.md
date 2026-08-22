# MinIO — Architectural Patterns

Source: MinIO Object Management Reference (min.io/docs/minio/linux/index.html)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Presigned Direct Uploads (Technician App Uploads)

Source: Developer APIs
Pattern: The application server acts as the authorizer and coordinator (generating a presigned URL), but the client uploads files directly to the object storage endpoint.
Problem solved: Protects application server CPU, RAM, and network bandwidth from getting thrashed by high-resolution image uploads.
Applicability to Verity: HIGH — Technicians upload high-resolution images as work evidence. The mobile client must upload directly to S3/MinIO via presigned URLs.

---

### Key-based Tenancy Scoping

Source: Storage paths
Pattern: Virtual folders are created within a single bucket using path keys (e.g. `tenant_123/work_orders/wo_99/photo.jpg`).
Problem solved: Multi-tenant file organization without creating thousands of S3 buckets (which is limited by S3 provider limits).
Applicability to Verity: HIGH — Store all tenant assets in a single global bucket, but strictly partition the object keys with a prefix of `tenant_id`.
