# Test and Runtime Evidence

## Gate results

| Gate | Command/environment | Result | Interpretation |
|---|---|---|---|
| Dependency audit | `npm audit --json` | FAIL policy-dependent: 2 moderate, 0 high/critical | Vitest dev advisory open |
| Working dependency tree | `npm ls --depth=0` | FAIL `ELSPROBLEMS` | stale/extraneous local installation |
| Initial typecheck | `npm run typecheck` before Prisma generation | FAIL | generated client stale against schema |
| Workspace build | `npm run build` | PASS; regenerated Prisma, built Next 16.2.10 | proves source compiles, not correct dependency version |
| Typecheck after generate | `npm run typecheck` | PASS | generation ordering matters |
| Workspace lint | `npm run lint` | FAIL: ignored `.claude/worktrees` and mockup code included | local tooling contamination |
| Clean archive install | `npm ci` | PASS | 618 packages; 2 moderate advisories |
| Clean archive versions | `npm ls next ...` | PASS | Next/eslint-config-next 16.3.3; Vitest 4.1.10 |
| Clean archive build | placeholder non-live env | PASS | correct committed Next artifact compiles |
| Clean archive lint | `npm run lint` | PASS with one warning | tracked tree itself has no lint errors |
| Normal test suite | `npm test` in workspace | SAFELY REFUSED | remote DB guard fired before suites; no mutation |
| Audit-only pure slice | 10 selected files, no DB setup | 117 PASS / 1 FAIL | valid useful static/pure evidence; GSTIN fixture regression |
| Broader audit-only attempt | 245 tests | 228 pass / 17 fail | contaminated worktree + config fixture + Windows mode issues; not canonical result |
| Live DB catalog | read-only audit probe | PASS | strong role/RLS/policy/grant evidence |
| Local production runtime | built app on `127.0.0.1:3017` | PARTIAL PASS | sign-in rendered, no browser errors, auth/API controls observed |
| Docker acceptance | unavailable host | UNTESTED | blocks on-prem certification |
| Playwright e2e | shared remote DB only | UNTESTED | mutation risk; intentionally not run |
| Backup/restore/fault injection | no isolated lab | UNTESTED | blocks recovery certification |
| Current GitHub CI | public run at commit | FAIL before job start | duplicate YAML keys |

## Clean-build warning

Both working and clean builds warn that `node:crypto` from `src/server/platform/integration.ts` is reachable from Edge/client instrumentation import traces. The build completes, but the runtime-boundary warning must be eliminated or explicitly demonstrated harmless across the selected deployment runtime.

## Safe pure-test failure

`src/server/capabilities/trading/import.test.ts` expects `07AAACG2115R1Z1` to be accepted, but production validation rejects it because the GSTIN check digit is invalid. The validator is fail-closed; the fixture/expectation is stale. This still fails a release test and must be corrected with an independently valid test number, not by weakening validation.

## Configuration-test inconsistency

Several `src/test/config.test.ts` positive cases assign `REQUIRED_ENV` without any of the newly mandatory private signing-secret aliases, then expect config import to succeed. Current `config.ts` correctly rejects that. CI is presently invalid before reaching the tests; once repaired, the fixture must supply a private test secret without restoring the prohibited anon-key fallback.

## Runtime observations

- Browser landed on `/sign-in`, rendered meaningful content, had no framework overlay and no warning/error console entries.
- Root and configuration redirected unauthenticated access to sign-in; HQ denied operator access.
- `/api/health`: 200; `/api/ready`: 200 with DB `ok`.
- `/api/metrics`: 401; `/api/scheduled`: 401 without bearer secret.
- Security headers included X-Frame-Options DENY, nosniff, HSTS, and nonce CSP on proxied application routes.
- Expected unauthenticated route access produced server-side exception stack logs before redirect/denial, creating noisy error telemetry.

## Evidence integrity

No environment values, connection strings, credentials, customer rows, auth state, database dumps, or screenshots containing customer data were stored. The only retained executable probes are audit-only, read-only or pure-test configuration files under `evidence/`.

