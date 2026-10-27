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

**Operator authorization required** for scenarios 4–11 and Notion portions of 13.

| # | Scenario | Status | Date | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Discoverability | Not run | — | |
| 2 | Installed router | Not run | — | |
| 3 | Provider delegation | Not run | — | |
| 4 | Primary-agent implicit logging | **Fail** | 2026-10-27 | See [Scenario 4 — primary-agent implicit logging (Run A)](#scenario-4--primary-agent-implicit-logging-run-a) |
| 5 | Delegated-work logging | Not run | — | Parent-owned model not yet verified; [Runs B–C](#runs-b-c--historical-subagent-local-logging-attempts) tested subagent-local logging only |
| 6 | Metadata | Not run | — | |
| 7 | Content | Not run | — | |
| 8 | Multi-write | Not run | — | |
| 9 | Fail-open | Not run | — | |
| 10 | Persistence honesty | Not run | — | |
| 11 | Anti-loop | Not run | — | |
| 12 | No capture hooks | Not run | — | |
| 13 | Claude Code | Not run | — | |

### Scenario 4 — primary-agent implicit logging (Run A)

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

### Runs B–C — historical subagent-local logging attempts

These runs assumed the **subagent** would implicitly log. Activation now assigns session logging to the **parent** when subagents return (scenario **5**). Subagent-local Savepoint absence in B–C is **not** evidence that parent-owned delegated logging fails.

#### Run B — controlled reproduction (fresh subagent, hub root, 2026-10-27)

**Setup:** Subagent on `slice/adopt-and-verify`; primary task was a one-sentence `docs/publishing.md` clarification + `npm test` + local commit; prompt did **not** mention Savepoints. Repro doc commit was **reverted** afterward so PR scope stays verification-only. **Parent did not record** the subagent outcome afterward (pre–parent-owned activation).

**Confirmed facts (subagent audit appendix):**

- Read `.cursor/rules/savepoints-lite.mdc` via Read: **no**
- Workspace rules mentioned savepoints-lite: **yes**
- Any path under `node_modules/@multipliers-dev/savepoints-lite/` read via Read: **none**
- Read `savepoints-notion` provider SKILL: **no**
- Notion MCP tools invoked: **none**
- Savepoint record attempted: **no** (subagent)

**Notion:** not applicable — no write attempted.

#### Run C — after session-log activation rewrite (fresh subagent, hub root, 2026-10-27)

**Setup:** Commit `2738fc8` on `slice/adopt-and-verify` (session-log–focused `AGENTS.md`, `.cursor/rules/savepoints-lite.mdc`, consumer templates). Subagent task: one-sentence `docs/publishing.md` clarification + `npm test`; prompt did **not** mention Savepoints. Repro edit **reverted** afterward so PR scope stays verification-only. **Parent did not record** the subagent outcome afterward (pre–parent-owned activation).

**Confirmed facts (subagent audit appendix):**

- Read `.cursor/rules/savepoints-lite.mdc` via Read: **no**
- Any path under `node_modules/@multipliers-dev/savepoints-lite/` read via Read: **none**
- Read `savepoints-notion` provider SKILL: **no**
- Notion MCP tools invoked: **none**
- Savepoint record attempted: **no** (subagent)

**Notion:** not applicable — no write attempted; operator authorization not exercised.

## Slice completion gate

`adopt-and-verify` plan todo stays **pending** until required manual hub scenarios are **Passed** (or operator-waived with PR rationale). Scenarios **4** and **5** remain open — do not mark **Passed** without an observed successful run (operator-authorized Notion write when applicable).

**Current PR branch:** hub implementation + automated checks **Pass**; scenario **4 Fail** (Run A — parent work without logging); scenario **5 Not run** (parent-owned delegated logging); Runs B–C retained as historical subagent-local attempts only; other manual scenarios **Not run**.
