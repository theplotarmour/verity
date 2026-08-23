# Verity Recovery Audit

**Date:** 2026-08-23
**Trigger:** an independent audit reported `FOUNDATION: NOT READY`, claiming the working tree
had lost `src/`, the test suite and every Prisma migration.
**Method:** the claim was tested against this checkout before any recovery action was taken.

## Verdict

# NO RECOVERY REQUIRED — THIS CHECKOUT IS INTACT

The reported degradation is **not reproducible here**. Every artefact the audit listed as deleted
is present, tracked, and passing. No files were restored, because none were missing.

The audit is not wrong about what it saw. It observed a different working tree.

---

## 1. Repository state at time of audit

| Fact | Value |
|---|---|
| HEAD | `bb42e61d8eb34deee13060c0fb6f610ee09484c9` |
| Branch | `main` |
| `origin/main` | `bb42e61` — identical, no divergence |
| Working tree | **clean** — `git status --short` returns zero lines |
| Remote | `https://github.com/theplotarmour/verity.git` |

A clean tree at the merge commit is the decisive fact: git reports **no deletions of any kind**.

## 2. Point-by-point test of the audit's evidence

| Audit claim | Actual | Status |
|---|---|---|
| `src/app/layout.tsx` deleted | present, 31 lines | **FALSE** |
| `src/app/page.tsx` deleted | never existed at that path — root route is `src/app/(shell)/page.tsx` | **MISREAD** |
| `src/server/platform/authorization.ts` deleted | present, 344 lines | **FALSE** |
| `src/server/platform/tenancy.ts` deleted | present, 74 lines | **FALSE** |
| `src/test/foundation-acceptance.test.ts` deleted | present, 390 lines | **FALSE** |
| All `prisma/migrations/` deleted | **22 migrations** present | **FALSE** |
| `schema.prisma` is a generator/datasource shell | **1,686 lines** | **FALSE** |
| "No test files found, exiting with code 1" | **19 test files, 274 tests, all passing** | **FALSE** |
| Build produces only a `/404` route | **13 routes + middleware** | **FALSE** |
| `CLAUDE.md` says "Franchise Operating System" | no such string in this checkout | **FALSE** |
| `CLAUDE.md` hardcodes `factoryId` as the scoping rule | appears only in the **forbidden-patterns list**, which bans it | **POLARITY INVERTED** |
| `CLAUDE.md` asserts three active franchise packs | appears only in the **forbidden** section | **POLARITY INVERTED** |

### The `page.tsx` misread

`src/app/page.tsx` is absent by design. The root route lives at `src/app/(shell)/page.tsx` —
a Next.js **route group**, which contributes no URL segment. This is the mechanism that lets the
shell layout wrap every capability route. Absence there is correct architecture, not a deletion.

### The `factoryId` polarity inversion

The audit grepped for the string and reported a hit as an instruction. Every occurrence in
`CLAUDE.md` is in the *Forbidden patterns — legacy VEDA, grep-able, never write these* section:

> 1. `factoryId` / `factory_id` — use `tenantId` / `organizationId` (Spec PLA-TEN-001)

The file **prohibits** the identifier the audit accused it of mandating. Same for
`facility_management`, `franchise_qsr`, `franchise_retail`, which appear once, in the sentence
that forbids them. A grep that ignores polarity turns a decontamination checklist into evidence
of contamination.

## 3. Root cause of the audit's findings

The audit's file paths are `/D:/Code/verity/...` — a **Windows checkout**, not this macOS working
directory. Its observations are internally consistent with one specific state:

**HEAD advanced to `bb42e61` while the working tree still holds files from a pre-`c11a9f9`
VEDA-era commit.**

Three independent facts converge on this:

1. **The franchise `CLAUDE.md` exists only before `c11a9f9`.** `git log -S "Franchise Operating
   System" -- CLAUDE.md` returns `94894fe` (present) and `c11a9f9` (removed). `c11a9f9`
   — *"chore(repo): decontaminate agent config"* — is confirmed an **ancestor of `main`**.
   Reading that text means reading a file from before that commit.
2. **`git status` reporting mass deletions** is exactly what git prints when HEAD contains files
   that are absent from disk. Not when files were deliberately removed — a removal on a branch
   would be committed, and the tree would be clean.
3. **Typecheck and build "succeeded" with one `/404` route.** A Next.js build over an empty
   `src/app` compiles trivially and emits only the fallback. Green there is evidence of an empty
   tree, not a healthy one — which the audit correctly noted as unconvincing.

Most likely mechanism: an interrupted or partially-applied `git pull`/`checkout` on Windows
(file locking, antivirus, or a killed process) that advanced the ref without writing the tree.

**Remediation is on that machine, not in this repository:**

```
git status                 # confirm the deletions are unstaged
git restore .              # rewrite the working tree from HEAD
git status                 # expect clean
```

If that fails, a fresh `git clone` of `origin/main` resolves it. **Do not commit those
deletions** — doing so would delete the platform for real.

## 4. Reproducibility gate

The prior `274/274` claim was explicitly not accepted as evidence. It was re-run in this checkout,
against the live database.

```
$ npm run test
 Test Files  19 passed (19)
      Tests  274 passed (274)
   Duration  34.13s
```

```
$ npm run typecheck     # tsc --noEmit — clean
$ npm run build         # 13 routes + proxy middleware, compiled in 2.6s
```

| Gate | Result | Status |
|---|---|---|
| Vitest | 19 files, 274 passed, 0 failed, 0 skipped | **REPRODUCED** |
| Typecheck | clean | **REPRODUCED** |
| Production build | 13 routes + middleware | **REPRODUCED** |
| ESLint | clean **after the fix in §5** | **FIXED** |

Migrations present: **22**, `20260823000000_init_tenancy` through the capability set.
Source files under `src/`: **77** TypeScript/TSX.

## 5. The one genuine defect found

Everything above was verification. This was the only real problem the pass uncovered.

**`npm run lint` failed — 2 errors, 2 warnings**, all inside
`verity-app-ui-mockups/project/support.js`:

```
198:10  error  ReactDOM.render is deprecated since React 18.0.0    react/no-deprecated
1215:9  error  Do not assign to the variable `module`             @next/next/no-assign-module-variable
```

That directory is a **design handoff bundle** from claude.ai/design — HTML/CSS/JS prototypes kept
as visual authority. It is never compiled, imported, or shipped. Linting it reports defects in
someone else's prototype as defects in the platform, and the noise is permanent because the file
is not ours to fix.

**FIXED** — added `verity-app-ui-mockups/**` to `globalIgnores` in `eslint.config.mjs`.
`npm run lint` is now clean. The bundle is untouched; it remains the visual reference.

## 6. Housekeeping observation — not fixed

`.eslintrc.json` is tracked and **dead**. ESLint 9 flat config (`eslint.config.mjs`) takes
precedence, so the eslintrc's rules never apply. It is a pre-flat-config leftover that will
mislead anyone who edits it expecting an effect. Left in place because deleting config is a
change with no test behind it; flagged for a deliberate decision.

## 7. What was NOT done, and why

- **No files restored.** Nothing was missing. Restoring from history over a clean, passing tree
  would have been a destructive no-op at best.
- **No `CLAUDE.md` rewrite.** The contamination it was accused of carrying is the contamination
  it exists to forbid. Rewriting it on the strength of an inverted grep would have removed the
  forbidden-patterns list — the single artefact preventing legacy VEDA identifiers from returning.
- **No git reset, cherry-pick, or history surgery.** `main` and `origin/main` agree at `bb42e61`.
  There is nothing to recover toward.
- **No Experience Shell or UX work.** Gated behind `FOUNDATION = PASS`. That gate is now open
  (§4), but the work was not started in this pass, which was scoped to forensics.

## 8. Phase 0 definition of done

| Item | Status |
|---|---|
| correct foundation recovered | **N/A — never lost** |
| `src/` restored | **N/A — 77 files present** |
| server runtime restored | **N/A — 20 platform modules present** |
| Prisma schema restored | **N/A — 1,686 lines present** |
| migrations restored | **N/A — 22 present** |
| tests restored | **N/A — 19 files, 274 passing** |
| no accidental legacy code | **PASS** — conformance suite asserts it mechanically |
| `CLAUDE.md` rewritten | **NOT REQUIRED** — see §7 |
| agent instructions audited | **PASS** — see §9 |
| current branch/history understood | **PASS** — see §1, §3 |

## 9. Agent instruction audit

Requested by the brief independently of the false alarm. Findings on the **user-global skill
library**, which loads into every session in this repository:

| Skill | Finding | Disposition |
|---|---|---|
| `db-migration-helper` | mandates scoping by `factoryId`, names `Orders`/`Inspections`/`Invoices` | **DO NOT USE HERE** — forbidden pattern #1; its RLS guidance is already implemented, so it adds nothing and risks reintroducing the identifier |
| `franchise-ops-helper` | franchisor-HQ / franchisee-outlet, SOP gates, photo audit engines | **DO NOT USE HERE** — the exact franchise pack framing the project forbids, and client-domain work is unauthorised |
| `ui-ux-pro-max-saas` | prescribes a fixed identity (Sora+Inter, near-black, scarlet accent) | **CONDITIONAL** — mechanical rules (44px targets, safe-area) are fine and already met; its palette conflicts with the approved Verity gold/neutral identity and must not override it |

These are external to the repository and were not modified. `.claude/settings.json`, project
`CLAUDE.md` and repository hooks carry no legacy directives.

## 10. Standing conclusion

Foundation status is unchanged from the prior readiness audit, now independently reproduced in a
clean checkout rather than asserted:

- **FOUNDATION: PASS** — 274/274, typecheck clean, build clean, lint clean, 22 migrations.
- **EXPERIENCE SHELL: UNBLOCKED** — the foundation gate the brief set is met. The approved brand
  identity in `verity-app-ui-mockups/` has **not yet been applied** to the shell; that is real
  outstanding work, not a regression.
- **CLIENT BUILD: STILL NOT ALLOWED** — unchanged, by instruction.

The non-blocking gaps recorded in `platform-readiness-audit.md` §14 all stand. None were affected
by this pass.
