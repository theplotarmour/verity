# Task Plan 27 — Storage Abstraction

This document defines the plan to implement a portable, provider-agnostic S3-compatible storage driver, integrating it into the existing `files.ts` registry alongside the legacy Supabase storage adapter.

---

## 1. Requirements

### VERITY-INFRA-002: Provider-Agnostic Storage
*   **Target**: Decouple file persistence from Supabase-specific storage APIs.
*   **Requirement**: Introduce a standard S3 client SDK driver targeting any S3-compatible endpoint (MinIO, SeaweedFS, or AWS S3).
*   **Configuration**: Add validation properties for S3 connection parameters (`s3Endpoint`, `s3Bucket`, `s3AccessKey`, `s3SecretKey`, and `storageProvider`) inside `src/server/platform/config.ts`.

---

## 2. Design

### Step 1: Configuration Schema Updates
Update `src/server/platform/config.ts` to include:
*   `storage.provider`: `'supabase' | 's3'`
*   `storage.s3Endpoint`: String URL
*   `storage.s3Bucket`: String
*   `storage.s3AccessKey`: String
*   `storage.s3SecretKey`: String

### Step 2: Implement S3 Storage Driver
Create `src/server/storage/s3.ts` to implement the `StorageDriver` interface from `src/server/platform/files.ts`:
*   `createUploadUrl(key, mimeType)`: Generates a signed PUT url using `@aws-sdk/s3-request-presigner` / `@aws-sdk/client-s3`.
*   `createReadUrl(key, expiresInSeconds)`: Generates a signed GET url.
*   `delete(key)`: Deletes objects.

### Step 3: Install Driver conditionally
In `src/server/storage/install.ts` or within `src/server/storage/supabase.ts`/`s3.ts`, register the active driver based on `runtimeConfig.storage.provider`.

---

## 3. Verification & Acceptance Criteria
*   [ ] Running `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner` adds portable S3 capabilities.
*   [ ] Mock/Unit tests pass for both `supabase` and `s3` storage driver configurations.
*   [ ] Existing file upload & retrieval endpoints maintain functional parity under both drivers.

---

## 4. Implementation Notes (Claude Code, 2026-08-30)

### Scope correction, made before writing code
This document's own Section 1-3 draft (above, left unedited as a record of
what was originally proposed) asks for a second, real provider: an S3 driver,
two new AWS SDK dependencies, and a `storage.provider` switch. The actual
Task 27 instructions given for this session are explicit and override that
draft: *"The immediate objective is NOT to remove Supabase... do not add
[S3-compatible infrastructure] unless explicitly required by the task... Do
not implement that second provider merely to prove the point unless the task
requires it."* Sections 1-3's S3 driver was therefore **not implemented**.
This is a scope correction against this document's own earlier draft, not a
deviation from what was actually asked of this session.

One related finding, flagged rather than acted on: `@aws-sdk/client-s3` and
`@aws-sdk/s3-request-presigner` are already present in `package.json`
`dependencies` (confirmed via `git log -- package.json`, present since commit
`3f54fc7`, well before this task) — and unused: no `src/server/storage/s3.ts`
or any other file imports them. They predate this session and this task did
not add them; removing unused dependencies is a separate, unrelated cleanup
and was left alone per the "keep narrowly scoped" instruction.

### What the inventory found
Before writing anything, the existing abstraction was inventoried end to end:

*   **`StorageDriver`** (`src/server/platform/files.ts`) — a three-method,
    fully provider-neutral interface: `createUploadUrl`, `createReadUrl`,
    `delete`. No Supabase-shaped types or parameters anywhere in it.
*   **`registerStorageDriver()`/`storageDriver()`** — a simple module-level
    registry. Domain code (`reserveUpload`, `confirmUpload`, `readUrlFor`)
    calls only `driver.createUploadUrl`/`createReadUrl`, never a concrete
    provider's API.
*   **`src/server/storage/supabase.ts`** — the *only* file in `src/` that
    imports `@supabase/supabase-js` or calls any `.storage.*` method.
    Confirmed by repository-wide search (`@supabase/supabase-js`,
    `.storage.from(`, `createSignedUploadUrl`, `createSignedUrl`) — one
    match, this file, for all four.
*   **Configuration** — already routed through `runtimeConfig.storage.*`
    (Task 26). `installStorage()` reads no raw `process.env` at all.
*   **Consumers** — repository-wide search for `reserveUpload`,
    `confirmUpload`, `readUrlFor`, `storageKeyFor` found **zero** callers
    outside `files.ts` itself and the test suite. No capability, command, or
    route currently uses the file-storage contract at all (Evidence/LR-scan
    upload flows referenced in earlier taskplans are not yet wired to any UI
    or command). There was, in the literal sense, nothing to "refactor
    consumers" — there are no consumers yet.
*   **Existence checks** — not part of the interface, and nothing anywhere
    needs one. Not added: an unused `exists()` method would be exactly the
    "speculative extension point" the task's own constraints forbid.
*   **Delete wrapper in `files.ts`** — no `deleteFile()` convenience function
    exists in `files.ts`; only the test suite reaches `storageDriver()!.delete()`
    directly (still through the neutral `StorageDriver` type, not a Supabase
    API — not a boundary leak, just an unused convenience). Not added, for
    the same reason: no caller needs it yet.

**Conclusion: the provider-neutral boundary already existed and was already
correct.** The architecture this task asks for —
`Application -> StorageDriver interface -> Supabase adapter -> Supabase
Storage` — was already in place, verified by direct repository search rather
than assumed from the task's premise. Per the project's own build-order
principle ("required behavior already exists: reuse it or change nothing"),
no production code was changed.

### What was actually done
The one real, verifiable gap: `storage-binding.test.ts` covers the adapter's
behavior only as a live integration test against a real Supabase project,
and skips itself entirely without credentials (`hasStorage` guard) — so the
adapter's own logic (signed-URL construction, error-to-exception mapping,
`installStorage()`'s conditional registration) had no coverage that runs
unconditionally, with no network dependency. Added:

*   **`src/test/storage-adapter.test.ts`** (new, 10 tests, no network/DB
    dependency) — mocks `@supabase/supabase-js`'s `createClient` the same way
    `proxy.test.ts` mocks `@supabase/ssr`, and covers:
    *   `installStorage()` registers no driver when storage variables are
        entirely unset, or only partially set.
    *   `installStorage()` registers a driver named after its bucket when
        fully configured, and is idempotent (a second call does not
        construct a second Supabase client).
    *   `supabaseStorageDriver()`'s three methods (`createUploadUrl`,
        `createReadUrl`, `delete`) on both their success path and their
        `E_STORAGE` error path.

One incidental finding while writing these tests, worth recording: importing
`src/server/storage/supabase.ts` transitively imports Prisma's client
(`supabase.ts` -> `files.ts` -> `command.ts` -> `db.ts`), and Prisma's own
internal env loader repopulates a *deleted* environment variable from `.env`
on that import (a genuinely-deleted key reads as "absent" to that loader,
which then restores it; a key merely set to `""` is left alone). This is
pre-existing Prisma behavior, unrelated to this task and not changed by it —
`storage-adapter.test.ts`'s negative-configuration tests set the relevant
variables to `""` rather than deleting them, to get a stable, deleted-like
(falsy) value without tripping that reload.

### Files changed
*   **New**: `src/test/storage-adapter.test.ts`.
*   **No production code changed.** `files.ts`, `supabase.ts`, `config.ts`
    are untouched — the boundary they already implement satisfies this
    task's architecture requirement as written.

### Provider boundary
Confined entirely to `src/server/storage/supabase.ts`. Verified by repo-wide
search immediately before writing this section (same searches as above),
re-run after adding the test file to confirm the new file did not introduce
a leak:

```
rg "@supabase/supabase-js|\.storage\.from\(|createSignedUploadUrl|createSignedUrl\(" src
  -> src/server/storage/supabase.ts   (only)
```

`storage-adapter.test.ts` imports `@supabase/supabase-js` only inside a
`vi.doMock()` factory (to intercept, not to call the real SDK), which does
not count against this boundary — a test mocking a provider's SDK is
verifying the adapter, not depending on the provider.

### Tests executed
*   `npx vitest run src/test/storage-adapter.test.ts` — 10/10 passed, in isolation, first.
*   `npm run typecheck` — clean.
*   `npm run lint` — clean (same one pre-existing, unrelated `SmartTable.tsx` warning as Task 26).
*   `npm run test` (full suite) — 472/473 passed; the one failure
    (`audit-runtime.test.ts`, a transient "can't reach database server"
    network error against the remote pooler, unrelated to storage) was
    re-run in isolation immediately after and passed 15/15 — confirmed flake,
    not a regression.

### Results
Architecture requirement satisfied — confirmed pre-existing, not newly built.
Configuration requirement satisfied — confirmed pre-existing (Task 26).
Behavior preserved — no production code touched. Testing requirement
satisfied — genuine coverage gap closed (10 new tests, provider-mocked, no
network dependency). Dependency-boundary requirement satisfied — verified by
direct repository search, reproduced above.

### Known limitations
*   `storage-binding.test.ts` (the live end-to-end test) still requires a
    real, configured Supabase project to run; it is not replaced by the new
    unit tests, which verify the adapter's *logic* but not an actual round
    trip against Supabase's real API.
*   No second provider exists, so the "swap `SupabaseStorageProvider` for
    another implementation without touching domain code" design test is
    argued from the interface shape (three methods, no Supabase-specific
    parameter or return type anywhere in `StorageDriver` or in any caller of
    `storageDriver()`/`reserveUpload`/`confirmUpload`/`readUrlFor`), not
    demonstrated with a second working driver — per this task's own
    instruction not to build one merely to prove the point.
*   There are still no real consumers of the file-storage contract
    (`reserveUpload`/`confirmUpload`/`readUrlFor`) anywhere in the
    application. Wiring an actual upload flow (e.g., plywood's LR-scan
    Evidence) to this contract is unimplemented business capability, not a
    Task 27 gap.

### Follow-up dependencies
*   `@aws-sdk/client-s3` / `@aws-sdk/s3-request-presigner` sit in
    `package.json` unused; flagged for a future cleanup pass (removal) or,
    if a real S3-compatible provider is later required, for an actual
    `src/server/storage/s3.ts` built against them — either way, a decision
    for whoever picks that up, not silently resolved here.
*   If a second provider is ever added, `configSchema.storage` in
    `src/server/platform/config.ts` gains its fields then, not now
    (avoiding a single-implementation `provider` switch field that
    currently has nothing to switch to).

### Final status
**Task 27 — COMPLETE.** Ready for Antigravity review.
