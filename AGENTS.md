# Agent instructions

Greenfield repo — universal execution and verification only. Architecture and product choices are yours to make for the task at hand.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run TypeScript with reload (`tsx watch src/index.ts`) |
| `npm start` | Run TypeScript once (`tsx src/index.ts`) |
| `npm test` | Vitest (`--passWithNoTests` — green with zero tests) |
| `npm run typecheck` | TypeScript `tsc --noEmit` |
| `npm run validate:plans` | Structural checks for `.cursor/plans/*.plan.md` (`@multipliers-dev/plan-validator`) |
| `npm run verify:git-hooks` | Confirm Husky shims are runnable in this checkout |

## Git hooks

Do not blur hook infrastructure with commit checks or CI.

| Layer | Question | Mechanism |
| --- | --- | --- |
| **1 — Hook availability** | Are Git hooks wired and runnable in *this* checkout? | `prepare-git-hooks.sh`, `verify-git-hooks.sh`, `ensure-hooks.sh`, `husky-shim-repair.sh`, `session-ensure-git-hooks.sh` (`.cursor/hooks/ensure-git-hooks.sh`); `sessionStart` verify/repair/warn |
| **2a — Agent feedback** | Not used | No Prettier / `afterFileEdit` |
| **2b — Commit correctness** | What must pass before a commit lands locally? | `.husky/pre-commit`: `npm test` then `npm run typecheck` |
| **3 — Authoritative enforcement** | Backstop when local/agent machinery fails? | CI (`npm test`, `npm run typecheck`; separate **Validate plans** workflow on `.cursor/plans/`) |

An agent must not assume Git hooks are active merely because `core.hooksPath` is configured. After `git worktree add`, run `npm run prepare` (or `npm run verify:git-hooks` after prepare) in the new worktree before committing.

Cloud Agents: committed `.cursor/environment.json` runs `npm ci` (triggers `prepare`) then blocking `ENSURE_HOOKS_MODE=wait ENSURE_HOOKS_WAIT_SECS=120 sh scripts/ensure-hooks.sh` on start — no `cloud-agent-*` Node wrappers (no `.nvmrc` pin). Installing the team-harness marketplace plugin does not wire this repo by itself. After merging lifecycle changes, trigger and promote a new environment Build.

## Discipline

- Pre-commit runs `npm test` and `npm run typecheck`; do not bypass hooks.
- Keep changes focused; do not add product scaffolding (frameworks, databases, deploy pipelines) unless the task requires it.
- Commit in small, logical steps with clear messages.
