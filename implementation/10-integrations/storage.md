# Storage Integration

## Purpose
This document defines how files, media, and attachments are stored and accessed within the platform.

## Scope
**In Scope:** File uploads, evidence storage, document storage, presigned URLs.
**Out of Scope:** Database backups.

## Authority
- Spec Requirement: File/media storage for evidence, documents, attachments
- EXISTING INFRASTRUCTURE: S3 (@aws-sdk/client-s3, @aws-sdk/s3-request-presigner)
- EXISTING INFRASTRUCTURE: Supabase Storage
- Bible V5: MinIO tenant-scoped buckets with signed URLs

## Prerequisites
- Storage infrastructure provisioned.

## Specification Requirements
- Secure, tenant-isolated file storage.

## Approved Architecture
- Object storage using presigned URLs for direct upload/download.

## Implementation Contract
- **Storage Backend:** IMPLEMENTATION DECISION REQUIRED: whether to use S3 directly, Supabase Storage, or both.
- **Tenant-scoped storage:** Files MUST be organized by tenant to ensure logical isolation.
- **Secure Access:** Use presigned URLs for secure direct upload/download from the client, avoiding passing large binaries through the Next.js API layer.
- **Metadata Management:** File metadata (name, size, mime-type, storage path) must be stored in the primary PostgreSQL database, while the binary resides in object storage.

## Constraints & Invariants
- Strict Tenancy Isolation (INV-001) applies to object storage paths and metadata.

## Dependencies
- AWS SDK or Supabase SDK.

## Failure Modes
- Presigned URL expiration causes upload/download failures if not refreshed.
- Orphaned files in storage if database transaction fails after upload.

## Testing Requirements
- Mocked storage clients for unit tests.
- Verify tenant boundary enforcement on file retrieval.

## Conformance Checks
- Ensure file keys strictly follow the tenant-scoped prefix pattern.

## Traceability
- INV-001

## Open Decisions
- IMPLEMENTATION DECISION REQUIRED: Exact storage backend (S3 directly vs Supabase Storage).
