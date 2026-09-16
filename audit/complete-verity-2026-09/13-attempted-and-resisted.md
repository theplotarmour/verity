# Attempted and Resisted Controls

This file separates controls that actively resisted a safe probe from controls merely inferred from code.

| Probe / attempted path | Control response | Result |
|---|---|---|
| Run full Vitest suite with configured remote DB | `src/test/setup-env.ts` rejected remote `DATABASE_URL` before suites | **PASS safety control**; tests themselves UNTESTED |
| Use runtime DB connection for catalog reads | Current role reported `verity_app`, no superuser/BYPASSRLS | PASS |
| Find application tables without RLS/FORCE RLS | Only migration ledger lacks RLS; no app table lacks either | PASS |
| Find RLS tables without policy | zero | PASS |
| Find raw runtime grant on migration ledger/request quota | none | PASS |
| Unauthenticated root/config access | redirected to sign-in | PASS behavior; noisy logs |
| Unauthenticated HQ access | platform operator denial | PASS behavior; noisy logs |
| Unauthenticated metrics access | 401 | PASS |
| Unauthenticated scheduled-work access | 401 | PASS |
| Render local sign-in | meaningful page, password input, no framework overlay, no browser warnings/errors | PASS |
| Build without first manually regenerating Prisma | build ran `prisma generate`, then compiled and typechecked | PASS build ordering |
| Typecheck before generation | failed on stale generated client | expected environment drift; not a source compile failure after build |
| Clean detached lockfile installation | installed exact Next 16.3.3 and built | PASS committed-artifact reproducibility |
| Run pure validator tests | GSTIN validator rejected invalid check digit despite test expecting acceptance | **PASS fail-closed validator; FAIL stale test** |
| Search tracked secrets | no confirmed tracked secret; pattern scan produced templates/tests/docs false positives | PASS bounded scan |
| Inspect local credential-like files | confirmed ignored/non-empty without printing values | containment maintained |

Not claimed as resisted: cross-tenant row attacks, suspended-module direct URL, malicious upload, OIDC login, clean Docker install, scheduler cadence, backup corruption, restore injection, or external-provider outages. Those were not safely executed.

