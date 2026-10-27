# Adoption verification record (adopt-and-verify)

Durable record of automated checks and manual agent behavioral runs. Status values: **Pass**, **Fail**, **Not run**. Link Notion page URLs in the GitHub PR description when recording verification evidence — not in this file. **Ongoing session logging** opt-in is committed hub activation; **verification-session authorization** applies to deliberate checklist runs (see `skills/savepoints/verification.md` § Authorization).

## Automated checks

| Check | Context | Status | Date | Notes |
| --- | --- | --- | --- | --- |
| `npm ci` at hub root | Hub repo | Pass | 2026-10-27 | Installs published `@1.0.0` devDependency from registry |
| Hub lockfile pins `@1.0.0` | `package.json` / `package-lock.json` | Pass | 2026-10-27 | Exact devDependency committed on branch |
| Hub activation paths | `AGENTS.md` + `CLAUDE.md` (no `.mdc` rule) | Pass | 2026-10-27 | Reference `node_modules/.../skills/savepoints/SKILL.md` only |
| `npm test` + `npm run verify` | Workspace tarball | Pass | 2026-10-27 | 15 paths (post–`AGENTS.md`-only activation); validates **workspace** `npm pack` — not the immutable registry `@1.0.0` (12 files) |
| `npm run validate:plans` | Plan frontmatter | Pass | 2026-10-27 | |
| Registry portability | Temp dir outside repo | Pass | 2026-10-27 | `npm install @multipliers-dev/savepoints-lite@1.0.0`; router, provider, schema, defaults present; temp dir removed |

## Manual hub dogfooding (§ B in verification.md)

**Verification-session authorization** required before deliberate failure simulations and other non-routine checklist writes (especially scenarios **9–11**). Scenarios **4–8** use **ongoing logging opt-in** (hub: committed activation) — not separate per-entry authorization.

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

**Notion:** not applicable — no write attempted.

#### Run D — parent-owned activation docs (Cursor parent, hub root, 2026-10-27)

**Setup:** Commit `dd80ba7` (delegated-work + verification split). Primary task was doc/activation updates, `npm test` / `npm run verify`, commit, push, PR #8 body update; prompt did **not** mention Savepoints.

**Confirmed facts:**

- `AGENTS.md` and `savepoints-lite.mdc` were in always-applied workspace rules.
- Installed router under `node_modules` was **not** read; Notion MCP was **not** invoked for session logging.
- Agent stated it skipped Notion because there was **no operator authorization** for the Savepoints DB — conflating **manual verification** authorization with **routine** session logging.

**Instruction fix (subsequent commit):** activation and `verification.md` now separate ongoing logging opt-in (activation) from verification-session authorization. Scenario **4** remains **Fail** until a fresh desktop implicit-logging run **observes** router invocation — not because wording alone.

**Notion:** not applicable — no write attempted.

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

| Gate | Status |
| --- | --- |
| Implementation + automated checks ([PR #8](https://github.com/multipliers-dev/savepoints-lite/pull/8)) | **Merged** — hub self-adoption, portability, `npm test` / `npm run verify` |
| Manual § B behavioral verification (plan acceptance) | **Not passed** — scenario **4** **Fail**; scenario **5** and most others **Not run** (table above unchanged) |

**Operator verification exception (2026-10-27, [PR #12](https://github.com/multipliers-dev/savepoints-lite/pull/12)):** The operator accepts **deferring** outstanding manual hub scenarios rather than blocking v1 plan closure. Rationale: implementation and publication evidence are sufficient to ship; failed and not-run rows remain the source of truth until fresh authorized runs update them. **Cross-repo `@1.1.0` consumer adoption** may produce incidental session logs during normal work — that is **not** checklist behavioral verification and must not be recorded as Pass without an explicit verification session per `skills/savepoints/verification.md`.

`adopt-and-verify` is **administratively closed** with this exception — **not** “behaviorally verified.” Plan archive: `# Shipped` § Verification exception in [`.cursor/plans/archive/2026-10-27-savepoints-lite-v1.plan.md`](../.cursor/plans/archive/2026-10-27-savepoints-lite-v1.plan.md).

**Follow-up (still required before production claims):** fresh **desktop** Cursor session at hub or consumer root with **no** `savepoints-lite.mdc`, ordinary dev task without Savepoints mention — confirm installed router read, Notion MCP attempt, and update scenario **4** / **5** rows. Procedure unchanged in [Run E](#behavioral-verification--cursor-without-mdc-run-e) below.

## AGENTS.md-only activation (2026-10-27)

Retired hub and consumer `savepoints-lite.mdc` rules; single runtime contract in root `AGENTS.md` (Claude via `CLAUDE.md` `@AGENTS.md`). Historical runs above that reference `.mdc` describe the prior activation mechanism — left unchanged.

### Behavioral verification — Cursor without `.mdc` (Run E)

| Item | Status |
| --- | --- |
| Fresh desktop Cursor session, `.mdc` absent | **Not run** |
| Ordinary dev task without Savepoints mention | **Not run** |
| Observed router → provider → Notion persistence | **Not run** |
| Delegated-work parent logging (scenario **5**) | **Not run** |

**Why not run here:** This implementation session cannot stand in for an authoritative fresh desktop Cursor chat after rule removal. Notion entries created while executing this task are **not** evidence of implicit logging.

**Minimal manual procedure (operator):**

1. Merge PR #8 activation on hub (or consumer) with **no** `savepoints-lite.mdc` committed.
2. Open a **new** Cursor Agent chat on the repo; confirm root `AGENTS.md` is in context (Cursor project rules / agent instructions).
3. Ask for a small, ordinary change (e.g. one-line doc fix) **without** mentioning Savepoints or Notion.
4. After the agent finishes, verify tool history: read installed `node_modules/.../skills/savepoints/SKILL.md`, Notion MCP create attempted, row visible in Savepoints DB.
5. Optional scenario **5:** delegate a subagent task without Savepoints in the prompt; confirm **parent** logs after handoff.

Record Pass/Fail in scenario **4** / **5** rows above when complete.
