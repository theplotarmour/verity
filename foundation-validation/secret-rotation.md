# Secret Rotation

Status of the credentials flagged in `implementation/16-environment/env-contract.md`.

**Read this first:** removing a variable from `.env` does not revoke anything. A credential stays
live at its provider until revoked there. Everything in the *Outstanding* table below is still
valid right now.

## Finding: most of these do not need rotating, they need revoking

The greenfield codebase reads exactly four environment variables:

```
DATABASE_URL   DIRECT_URL   CI   NODE_ENV
```

Every other secret inherited from the VEDA deployment is referenced by no code at all. Rotating a
credential that nothing consumes just mints a fresh live credential and leaves the old one to be
found later. The correct action for those is **revoke at source and re-issue only when a capability
actually needs one** — which, for a platform with no business capabilities yet, is none of them.

They have been removed from `.env`. Revocation at the provider is outstanding and is the part that
matters.

## Done

| Credential | Action | Notes |
|---|---|---|
| `verity_app` database role | **Rotated** | 64 hex chars, generated locally, never written to the repository. This role is `NOSUPERUSER NOBYPASSRLS`, so RLS is enforced on it; `assertRlsEnforceable()` refuses to start otherwise. Verified: 180/180 tests pass on the new credential |
| 16 unreferenced variables | **Removed from `.env`** | `JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `MAINTENANCE_TOKEN`, `S3_*` (5), `RESEND_API_KEY`, `NOTIFY_EMAIL_FROM`, `OPENAI_*` (3), `SUPABASE_MEDIA_BUCKET`, `SUPABASE_URL`, `DATABASE_POOL_LIMIT` |
| `VERITY_HQ_PHONES` | **Removed earlier** | Marked DEPRECATED by `env-contract.md` |

## Outstanding — requires provider dashboard access

I cannot perform these. Each needs an account console I do not have, and two of them would break
the platform if changed from SQL.

| # | Credential | Where | Why it matters |
|---|---|---|---|
| 1 | **Database password** (`postgres`) | Supabase → Settings → Database → Reset password | **Highest priority.** This value appeared in plaintext in an unignored file and was printed to a terminal, so it is in the session transcript. Treat as disclosed |
| 2 | `JWT_SECRET` / API keys | Supabase → Settings → API → Rotate JWT secret | Rotating invalidates `SUPABASE_SERVICE_ROLE_KEY` and the anon key together. VEDA-era; flagged by `env-contract.md` |
| 3 | `SUPABASE_SERVICE_ROLE_KEY` | Same rotation as #2 | Full bypass of row-level security. The single most dangerous key in the set |
| 4 | `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Supabase → Storage → S3 access keys | Revoke rather than rotate; nothing uses storage yet |
| 5 | `RESEND_API_KEY` | Resend dashboard → API keys | Revoke; no notification capability exists |
| 6 | `OPENAI_API_KEY` | OpenAI dashboard → API keys | Revoke. Not in `env-contract.md` at all — it appears to predate the corpus |
| 7 | `MAINTENANCE_TOKEN` | Application-owned | No rotation needed; simply not re-issued until something needs it |

After #1, update `DIRECT_URL` in `.env` with the new password. `DATABASE_URL` is unaffected — it
uses `verity_app`, which is already rotated.

## Why the two connections use different roles

| Variable | Role | Bypasses RLS | Used by |
|---|---|---|---|
| `DATABASE_URL` | `verity_app` | No | All application traffic |
| `DIRECT_URL` | `postgres` | Yes | `prisma migrate` only |

Supabase's default `postgres` role has `rolbypassrls = true`, verified on this project. Pointing
application traffic at it would give **zero tenant isolation with a fully green test suite**, since
every policy would be skipped while remaining present and syntactically valid. That is why the
split exists and why `assertRlsEnforceable()` fails closed on a bypassing connection.

## Verification

```bash
# The runtime role must not be able to bypass RLS.
psql "$DATABASE_URL" -c \
  "SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user;"
# expected: verity_app | f | f
```

This is also asserted by the conformance suite, so a future change to `DATABASE_URL` that quietly
points at a privileged role fails the test run rather than reaching production.
