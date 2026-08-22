# MinIO — Verity Implications

Source: MinIO Object Management Reference (min.io/docs/minio/linux/index.html)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Presigned Direct Upload for Work Evidence

Confidence: HIGH
Recommendation: ADOPT
Rationale: Technicians uploading photos for work order validation (e.g. proof of repair) generates heavy file transfer load. Routing these through the Node/TypeScript backend will bottleneck the server. Using presigned URLs allows the mobile client to upload directly to S3/MinIO.
If ADOPT: The API exposes `/attachments/presigned-upload-url` which accepts file details, validates permissions, and generates a presigned S3 PUT URL. The mobile client uploads the file directly to object storage.
Affects Bible sections: Volume V (Data Architecture), Volume V (Offline & Client Sync)

---

### Tenant Prefix Key Constraints

Confidence: HIGH
Recommendation: ADOPT
Rationale: Storing files for different tenants in separate S3 buckets causes provider resource limits to be hit quickly. Organizing files within a single bucket using path keys (e.g., `tenant_<tenant_id>/...`) is standard.
If ADOPT: The application backend enforces prefix-based authorization. When generating a presigned URL or reading a file, the backend verifies that the object key begins with the requester's `tenant_id`. Direct key access without prefix verification is blocked.
Affects Bible sections: Volume V (Security & Multi-tenancy)
