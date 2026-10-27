# Adoption verification record (adopt-and-verify)

Durable record of automated checks and manual agent behavioral runs. Status values: **Pass**, **Fail**, **Not run**. Link Notion page URLs in the GitHub PR description when operator authorization applies — not in this file.

## Automated checks

| Check | Context | Status | Date | Notes |
| --- | --- | --- | --- | --- |
| `npm ci` at hub root | Hub repo | Pass | 2026-10-27 | Installs published `@1.0.0` devDependency from registry |
| Hub lockfile pins `@1.0.0` | `package.json` / `package-lock.json` | Pass | 2026-10-27 | Exact devDependency committed on branch |
| Hub activation paths | Rule + `AGENTS.md` + `CLAUDE.md` | Pass | 2026-10-27 | Reference `node_modules/.../skills/savepoints/SKILL.md` only |
| `npm test` + `npm run verify` | Workspace tarball | Pass | 2026-10-27 | 16 paths; validates **workspace** `npm pack` — not the immutable registry `@1.0.0` (12 files) |
| `npm run validate:plans` | Plan frontmatter | Pass | 2026-10-27 | |
| Registry portability | Temp dir outside repo | Pass | 2026-10-27 | `npm install @multipliers-dev/savepoints-lite@1.0.0`; router, provider, schema, defaults present; temp dir removed |

## Manual hub dogfooding (§ B in verification.md)

**Operator authorization required** for scenarios 4–10 and Notion portions of 12.

| # | Scenario | Status | Date | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Discoverability | Not run | — | |
| 2 | Installed router | Not run | — | |
| 3 | Provider delegation | Not run | — | |
| 4 | Implicit logging | **Fail** | 2026-10-27 | See [Scenario 4 — implicit logging failures](#scenario-4--implicit-logging-failures) |
| 5 | Metadata | Not run | — | |
| 6 | Content | Not run | — | |
| 7 | Multi-write | Not run | — | |
| 8 | Fail-open | Not run | — | |
| 9 | Persistence honesty | Not run | — | |
| 10 | Anti-loop | Not run | — | |
| 11 | No capture hooks | Not run | — | |
| 12 | Claude Code | Not run | — | |

### Scenario 4 — implicit logging failures

#### Run A — PR #8 Bugbot fixes (Cursor agent, same session as operator audit)

**Confirmed facts (tool/conversation history):**

- `savepoints-lite.mdc` was present via Cursor **always-applied workspace rule injection** (not opened with Read on `.cursor/rules/savepoints-lite.mdc`).
- Meaningful work completed: doc/package/test edits for Bugbot findings, `npm ci` / `npm test` / `npm run verify` / `npm run validate:plans`, commit `5663a1a`, push, PR #8 body update.
- Installed router `node_modules/@multipliers-dev/savepoints-lite/skills/savepoints/SKILL.md` was read **once**, **after** implementation, commit, push, and PR update — not before finishing the work unit.
- Installed `savepoints-notion` provider SKILL was **not** read.
- **No** Notion MCP tools were invoked.
- **No** Savepoint record was created.

**Hypotheses (not yet proven root cause):**

- Activation may be treated as background context rather than a **same-turn completion obligation** tied to commit/push/PR wrap-up.
- “Read and follow” may be interpreted as optional file inspection rather than router → provider → persistence execution.
- Competing instructions (user rules, skills, task completion) may outrank Savepoints at session end without an explicit completion boundary.

**Notion:** not applicable — no write attempted; operator authorization not exercised.

#### Run B — controlled reproduction (fresh subagent, hub root, 2026-10-27)

**Setup:** Subagent on `slice/adopt-and-verify`; primary task was a one-sentence `docs/publishing.md` clarification + `npm test` + local commit; prompt did **not** mention Savepoints. Repro doc commit was **reverted** afterward so PR scope stays verification-only.

**Confirmed facts (subagent audit appendix):**

- Read `.cursor/rules/savepoints-lite.mdc` via Read: **no**
- Workspace rules mentioned savepoints-lite: **yes**
- Any path under `node_modules/@multipliers-dev/savepoints-lite/` read via Read: **none**
- Read `savepoints-notion` provider SKILL: **no**
- Notion MCP tools invoked: **none**
- Savepoint record attempted: **no**

**Hypotheses:**

- Failure reproduces under activation injection without explicit Savepoints reminder — not a one-off omission in Run A.
- Subagent sessions may not mirror every Cursor desktop harness behavior; desktop re-run still useful before instruction changes.

**Notion:** not applicable — no write attempted.

## Slice completion gate

`adopt-and-verify` plan todo stays **pending** until required manual hub scenarios are **Passed** (or operator-waived with PR rationale). Scenario **4 Fail** blocks claiming implicit logging works.

**Current PR branch:** hub implementation + automated checks **Pass**; manual scenario **4 Fail** (two observed runs); other manual scenarios **Not run**.
