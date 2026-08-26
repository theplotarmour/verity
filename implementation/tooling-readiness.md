# Tooling & MCP Readiness Pass

**Date:** 2026-08-26
**Scope:** local development/tooling environment only. **No application code, schema, migration,
deployment, HQ, ADR or client work touched.**
**Selection rule applied:** capability × reliability × security × maintainability ÷ complexity.
Nothing installed merely because it exists.

---

## 1. Machine audit

| Tool | Installed | Version | Required | Action |
|---|---|---|---|---|
| node | ✅ | v24.16.0 | Yes | none |
| npm | ✅ | 11.13.0 | Yes | none |
| npx | ✅ | 11.13.0 | Yes | none |
| git | ✅ | 2.54.0.windows.1 | Yes | none |
| claude | ✅ | 2.1.246 | Yes | none |
| curl | ✅ | 8.19.0 | Useful | none |
| rg (ripgrep) | ✅ | 14.1.1 | Useful | none |
| **vercel** | ✅ **installed this pass** | **59.5.0** | **Yes — Phase 0.10** | **`npm i -g vercel`; needs login** |
| docker | ❌ | — | Only for local Supabase | **Not installed** — see §3 |
| docker compose | ❌ | — | Only for local Supabase | Not installed |
| supabase | ❌ | — | Conditional | **Not installed** — see §3 |
| gh | ❌ | — | Optional | **Not installed** — see §3 |
| psql | ❌ | — | **No** | **Not needed** — see §3 |
| prisma (global) | ❌ | — | **No — project-local** | **Correctly absent** |
| jq | ❌ | — | **No** | Not needed — node parses JSON |
| fd | ❌ | — | No | Not needed — ripgrep + Glob cover it |
| winget | ✅ | v1.29.290 | — | Install route for gh / Docker |
| scoop | ❌ | — | — | Would be needed for the official Supabase CLI route |

**Prisma is project-local** (`devDependencies`), invoked via `npx prisma`. A second global install
would be a version-skew hazard against the migration history. Correctly left alone.

---

## 2. Installed this pass

**Vercel CLI 59.5.0** — the only installation. It is the hard prerequisite for Phase 0.10 and was
explicitly authorized.

```
vercel --version   Vercel CLI 59.5.0
vercel whoami      Error: Not authorized
```

Nothing was deployed. Authentication is yours to perform (§8).

---

## 3. Deliberately NOT installed, with reasons

**Supabase CLI.** Its headline capability — local Supabase development — requires **Docker, which
is not installed**. Installing the CLI without Docker buys project linking and db inspection, both
of which are already covered: Prisma owns migrations, and database inspection has been running
through the Prisma client all session. The official Windows route is Scoop, which is also not
installed, so this is a three-package decision (Scoop → Supabase CLI → Docker Desktop) for a
capability nothing currently blocks on. **Recommend deferring until local Supabase or Edge
Functions are actually needed.**

**Docker Desktop.** Large install, background service, licensing considerations. Nothing in the
current roadmap requires it — the fresh-database verification in Phase 0.9 ran against disposable
databases on the existing cluster instead, which was cheaper and closer to the real target.

**GitHub CLI.** Genuinely useful, low risk, installable via `winget install GitHub.cli`. But **no
CI workflows exist** in this repository (`.github/` is absent), git works for all current
operations, and no phase blocks on it. **Recommend, do not install yet.**

**psql.** Not required. Every database operation this session — diagnosis, privilege inspection,
extension probing, migration verification, cross-tenant testing — ran through the Prisma client.
Adding a PostgreSQL client install for parity would be complexity without capability.

**jq, fd.** Node parses JSON; ripgrep and the built-in file tools cover search. No.

---

## 4. MCP inventory

| MCP | Existing | Needed | Scope | Risk | Recommendation |
|---|---|---|---|---|---|
| **supabase** | **Added this pass** | **Yes** | project, `read_only=true`, `project_ref` pinned | **LOW** as configured | **Configured — awaiting your approval + OAuth** |
| sequential-thinking | ✅ connected | Yes | user | LOW | Keep |
| memory | ✅ connected | Optional | user | LOW | Keep |
| **filesystem** (`D:\Code`) | ✅ connected | Questionable | user | **HIGH** | **Review — see §6** |
| magic-ui | ✅ connected | No | user | LOW | Harmless; unused by Verity |
| caveman | ✅ connected | — | user | LOW | Keep |
| claude-in-chrome | ✅ available as tools | **Yes** | managed connector | MEDIUM | **Keep — this is the browser capability; do not add another** |
| plugin:pm-skills:atlassian | ⚠ needs auth | No | plugin | — | Leave unauthenticated |
| plugin:second-opinion:codex | ✘ failed | No | plugin | — | Dead — remove or ignore |
| plugin:zeroize-audit:serena | ✘ failed | No | plugin | — | Dead (needs `uvx`) |
| plugin:pw:pw-testrail | ✘ failed | No | plugin | — | Dead |
| plugin:pw:pw-browserstack | ✘ failed | No | plugin | — | Dead |
| github | ❌ | Yes, eventually | — | MEDIUM | **Recommend — needs a PAT from you** |
| vercel (MCP) | ❌ | **No — CLI covers it** | — | — | **Skip for now**, avoid duplicate capability |
| figma | ❌ | Later | — | MEDIUM | **Recorded only, not connected** |

**Four dead plugin MCP servers** fail on every startup. They cost a connection attempt each and
clutter diagnostics. Not removed — plugin config is outside this task's boundary.

---

## 5. Supabase MCP — what was configured and why

`.mcp.json` (new, project-scoped, **contains no secrets**):

```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=ygkjidaggwvhjgpqlkmj&read_only=true&features=docs%2Cdatabase%2Cdebugging"
    }
  }
}
```

Three deliberate restrictions beyond the example command:

| Restriction | Reason |
|---|---|
| `project_ref` pinned | Scopes to the single Verity project. Account-level tools (`list_projects`, `list_organizations`) become unavailable, so no unrelated Supabase project is exposed |
| `read_only=true` | All SQL runs as a read-only Postgres user; mutating tools are disabled |
| `features=docs,database,debugging` only | **Dropped from the suggested list:** `account` (exposes other projects), `development`, `functions` (deploys code), `branching` (creates branches — writes and cost) |

**One thing you should know.** Supabase's own guidance is to point MCP at a *development* project
and give production none. Verity has **one** Supabase project, and it is the live application
database. `read_only=true` is therefore doing real work here, not just belt-and-braces — it is the
only thing standing between this MCP and the database Phase 0 just verified. I would not relax it
without a second project existing.

Status: `⏸ Pending approval` — Claude Code requires you to approve a new project-scoped MCP, then
Supabase OAuth runs in your browser.

---

## 6. Security findings

**`.claude/env.txt` is NOT gitignored.** 647 bytes, 13 lines, and pattern-matching finds **2
secret-shaped tokens**. It is currently untracked, so nothing has leaked — but one `git add -A`
commits credentials permanently. *Contents were not printed, per the process correction adopted
after the earlier incident: metadata and match counts only.*

**Recommended fix (not applied — outside this task's boundary):** add `.claude/env.txt` to
`.gitignore`, or move the values into `.env`, which is already covered by the `.env*` rule.

**`filesystem` MCP is scoped to `D:\Code`** — the entire code directory, not just Verity. Under
§15 that is broad filesystem access and classifies as **HIGH risk**. It grants read/write across
every project on that drive. Recommend narrowing to `D:\Code\verity` or removing it; Claude Code's
native file tools already cover this repository.

**`npm audit`: 11 vulnerabilities (1 moderate, 10 high).** All trace to `sharp <0.35.0`
(libvips CVEs) pulled in transitively by Next. `npm audit fix --force` wants `next@16.3.3`, outside
the stated dependency range — so this is a framework-upgrade decision, not a quick fix. **Not
touched.**

**No CI workflows exist.** `.github/` is absent, which contradicts
`final-platform-readiness.md` §10 ("CI — NEWLY BOUND, UNVERIFIED ON A RUNNER"). Whatever was bound
is not in this repository. Worth reconciling before Phase 3's verification gate depends on it.

---

## 7. Testing stack — what exists

| Layer | Tool | Status |
|---|---|---|
| Unit + integration + database + RLS/security | **Vitest** | ✅ 21 files, 291 tests, all green |
| E2E | **Playwright** | ⚠ `@playwright/test` installed, `playwright.config.ts` and `e2e/` present (4 specs) — **but no `e2e` npm script** |
| Lint | **ESLint** | ⚠ `lint: "eslint"` with no target; also a dead `.eslintrc.json` alongside flat config |
| Types | **TypeScript** | ✅ `typecheck` clean |
| Build | **Next 16.2.10** | ✅ compiles |
| Deployment verification | — | ❌ Phase 0.10 |
| CI | — | ❌ absent |

**No redundant frameworks** — no Jest, no Cypress. The stack is correct; the gaps are wiring, not
tooling. Missing: an `e2e` script, a CI workflow, and deployment verification.

---

## 8. MCP access-class policy (recommendation)

| Class | Covers | Rule |
|---|---|---|
| **SAFE** | Docs lookup, read-only inspection, web research, repository reads | Proceed without asking |
| **CONTROLLED** | Development database writes, migrations, preview deployments, branch/PR creation | **Explicit authorization per action.** This is the class every Phase 0 action fell into, and the pattern already used all session |
| **DANGEROUS** | Production writes, destructive database operations, production deployment, credential management, role/privilege changes | **Explicit authorization every single time.** Never inferred from a prior approval |

```
PRODUCTION
  READ       → allowed with safeguards
  WRITE      → explicit authorization
  DESTRUCTIVE→ explicit authorization every time
  DEPLOY     → explicit authorization
  MIGRATION  → explicit authorization
```

As configured, the Supabase MCP is **SAFE** — `read_only=true` makes it structurally incapable of
CONTROLLED or DANGEROUS operations. That is the point of configuring it that way rather than
relying on discipline.

---

## 9. Recommended final toolchain

```
Claude Code
│
├── Local CLI
│   ├── git            ✅ present
│   ├── node/npm/npx   ✅ present
│   ├── npx prisma     ✅ project-local (never global)
│   ├── vercel         ✅ INSTALLED — needs `vercel login`
│   ├── gh             ⬜ recommended, not installed (winget)
│   ├── supabase       ⬜ deferred — needs Scoop + Docker
│   └── docker         ⬜ deferred — only for local Supabase
│
├── MCP
│   ├── Supabase       ✅ CONFIGURED read-only, project-scoped — needs approval + OAuth
│   ├── GitHub         ⬜ recommended — needs a PAT from you
│   ├── Vercel         ⬜ skipped — CLI covers it, avoid duplication
│   ├── Browser        ✅ claude-in-chrome already present — add no other
│   └── Figma          ⬜ recorded only, not connected
│
├── Skills
│   └── Supabase Agent Skills  ⬜ recommended — official, not yet installed
│
└── Hooks
    └── none configured — optional; defer until Phase 1
```

**Supabase Agent Skills** (`github.com/supabase/agent-skills`) is the official skill bundle:
Supabase development plus Postgres best practices, explicitly covering RLS, `SECURITY DEFINER`
functions, service-role keys and exposed schemas — the exact areas ADR-013 will touch. It installs
into `.claude/settings.json`, so it is a repository change and is left for your authorization.

---

## 10. Phase 0.10 readiness

**Is the machine technically ready for Phase 0.10?**

# YES

All prerequisites are in place. 0.10 itself remains unauthorized.

| Blocker | Status |
|---|---|
| Vercel CLI installed | ✅ **resolved this pass** — 59.5.0 |
| Vercel project linked | ✅ already linked |
| **Vercel authentication** | ✅ **RESOLVED 2026-08-26 — `vercel whoami` → `theplotarmour`** |

The authentication blocker was cleared by the product owner on 2026-08-26. Phase 0.10 is
unblocked technically and still requires explicit authorization to begin.

---

## 11. Authorization required

| # | Action | Why it needs you |
|---|---|---|
| 1 | ~~`vercel login`~~ | ✅ **DONE** — authenticated as `theplotarmour` |
| 2 | **Approve the Supabase MCP + complete OAuth** | Claude Code shows `⏸ Pending approval`; Supabase OAuth opens your browser |
| 3 | **Gitignore `.claude/env.txt`** | Repository change. Two secret-shaped values, currently one `git add -A` from permanent commit |
| 4 | **Narrow or remove the `filesystem` MCP** | User-level config, and HIGH risk as scoped to `D:\Code` |
| 5 | Install GitHub CLI + configure GitHub MCP | `winget install GitHub.cli`; the MCP needs a PAT you create with minimum scopes |
| 6 | Install Supabase Agent Skills | Modifies `.claude/settings.json` |
| 7 | Decide on Supabase CLI + Docker | Three-package decision; nothing currently blocks on it |
| 8 | Add an `e2e` npm script and a CI workflow | Repository change; Phase 3 will need both |
| 9 | Decide on the `sharp`/Next advisory | Framework upgrade outside the stated dependency range |

---

## 12. What this pass changed

| Change | Type |
|---|---|
| `npm install -g vercel` | Global CLI (authorized) |
| `.mcp.json` created | Project config, no secrets |
| `implementation/tooling-readiness.md` | This document |

**Nothing else.** No application code, schema, migration, deployment, HQ implementation, ADR,
Kent's work, or specification change. The database remains at 23/23, 291/291, RLS 51/51.
