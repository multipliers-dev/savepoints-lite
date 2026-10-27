# Agent instructions

`@multipliers-dev/savepoints-lite` — instruction-only npm package (router + Notion provider skills). No application runtime in this repo.

## Commands

| Command | Purpose |
| --- | --- |
| `npm test` | Vitest package/skill invariant tests |
| `npm run verify` | Skill tree + `npm pack --dry-run` tarball expectations |
| `npm run validate:plans` | Structural checks for `.cursor/plans/*.plan.md` (`@multipliers-dev/plan-validator`) |
| `npm run verify:git-hooks` | Confirm Husky shims are runnable in this checkout |

## Git hooks

Do not blur hook infrastructure with commit checks or CI.

| Layer | Question | Mechanism |
| --- | --- | --- |
| **1 — Hook availability** | Are Git hooks wired and runnable in *this* checkout? | `prepare-git-hooks.sh`, `verify-git-hooks.sh`, `ensure-hooks.sh`, `husky-shim-repair.sh`, `session-ensure-git-hooks.sh` (`.cursor/hooks/ensure-git-hooks.sh`); `sessionStart` verify/repair/warn |
| **2a — Agent feedback** | Not used | No Prettier / `afterFileEdit` |
| **2b — Commit correctness** | What must pass before a commit lands locally? | `.husky/pre-commit`: `npm test` then `npm run verify` |
| **3 — Authoritative enforcement** | Backstop when local/agent machinery fails? | CI (`npm test`, `npm run verify`; separate **Validate plans** workflow on `.cursor/plans/`) |

An agent must not assume Git hooks are active merely because `core.hooksPath` is configured. After `git worktree add`, run `npm run prepare` (or `npm run verify:git-hooks` after prepare) in the new worktree before committing.

Cloud Agents: committed `.cursor/environment.json` runs `npm ci` (triggers `prepare`) then blocking `ENSURE_HOOKS_MODE=wait ENSURE_HOOKS_WAIT_SECS=120 sh scripts/ensure-hooks.sh` on start — no `cloud-agent-*` Node wrappers (no `.nvmrc` pin). Installing the team-harness marketplace plugin does not wire this repo by itself. After merging lifecycle changes, trigger and promote a new environment Build.

## Savepoints Lite (hub dogfooding)

This repository **consumes** the published npm package it ships. `npm ci` installs the **exact registry** devDependency pin (same semver as workspace `package.json` when aligned after publish). Session logging reads skills from `node_modules/`, not git `skills/`. Instruction-only — **no** Savepoints lifecycle hooks.

### Ongoing logging authorization

Installing the package or connecting Notion MCP does **not** alone authorize production Notion writes. **Opt-in** = this Savepoints Lite session-log section committed in root `AGENTS.md`. Instruction-only — **no** Savepoints lifecycle hooks.

Once opted in, maintain the session log **without** asking for separate authorization before each entry, subject to host Notion MCP permissions. If activation is absent or consent is unclear, do not write to Notion; request activation or explicit consent where appropriate; otherwise fail open without claiming persistence.

[`skills/savepoints/verification.md`](skills/savepoints/verification.md) **manual verification** (deliberate checklist runs, especially failure simulations) requires **explicit operator authorization for that verification session** — separate from routine session logging and **not** a reason to skip logging during ordinary work when this repo is activated.

### Session log

Maintain a running session log in Notion.

Do not wait until the session ends. Record an entry immediately after:

- Every completed piece of meaningful work.
- Every significant decision.
- Every task switch.
- Every primary-task error or its resolution.

Each entry should capture:

- What was done (commands, files, features)
- Decisions made (and why)
- Open threads (unfinished work)
- Errors (what went wrong and how it was handled)

Use the installed Savepoints Lite instructions at:

`node_modules/@multipliers-dev/savepoints-lite/skills/savepoints/SKILL.md`

Complete the logging workflow before moving on to the next task or delivering the final response. Reading the instructions alone does not count as recording an entry.

If logging fails, continue the primary work without retry loops.

**Delegated work:** The primary agent maintains the session log, including meaningful work completed by subagents. When a subagent returns, evaluate its reported outcome and record an entry (what was done, decisions, open threads, errors) before continuing — using this checkout's installed router and Notion provider. Do not assume the subagent succeeded without supporting evidence; skip duplicate entries for the same event. Subagents do not need to install Savepoints Lite or persist Savepoints independently. Do not assume isolated worktrees contain `node_modules`, workspace activation, or Notion MCP access.

- `node_modules` must exist — do **not** use this repository's `skills/` tree as the instruction source.
- Fail open on write failure; never claim Notion persistence without confirmed write.

| Host | Load mechanism |
| --- | --- |
| **Cursor** | Root `AGENTS.md` (including this section) |
| **Claude Code** | [`CLAUDE.md`](CLAUDE.md) imports this file (`@AGENTS.md`) |

Consumer snippet: [`templates/consumer/AGENTS.md.snippet`](templates/consumer/AGENTS.md.snippet). Verification: [`skills/savepoints/verification.md`](skills/savepoints/verification.md), [`docs/adoption-verification-record.md`](docs/adoption-verification-record.md).

## Discipline

- Pre-commit runs `npm test` and `npm run verify`; do not bypass hooks.
- Keep changes focused; do not add product scaffolding (frameworks, databases, deploy pipelines) unless the task requires it.
- Commit in small, logical steps with clear messages.
