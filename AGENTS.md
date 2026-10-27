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

This repository **consumes** the published npm package it ships. `npm ci` installs `@multipliers-dev/savepoints-lite@1.0.0` as a devDependency (exact version in `package.json` + lockfile).

**Activation (instruction-only — no Savepoints lifecycle hooks):**

| Surface | Mechanism |
| --- | --- |
| **Cursor** | [`.cursor/rules/savepoints-lite.mdc`](.cursor/rules/savepoints-lite.mdc) (`alwaysApply: true`) |
| **Claude Code** | [`CLAUDE.md`](CLAUDE.md) Savepoints section |
| **Router skill** | `node_modules/@multipliers-dev/savepoints-lite/skills/savepoints/SKILL.md` |

When Savepoints triggers fire, agents must read the **installed** router under `node_modules`, not the hub `skills/` source tree. Consumer copy-paste templates live under [`templates/consumer/`](templates/consumer/). Manual behavioral verification: [`skills/savepoints/verification.md`](skills/savepoints/verification.md) and [`docs/adoption-verification-record.md`](docs/adoption-verification-record.md).

## Discipline

- Pre-commit runs `npm test` and `npm run verify`; do not bypass hooks.
- Keep changes focused; do not add product scaffolding (frameworks, databases, deploy pipelines) unless the task requires it.
- Commit in small, logical steps with clear messages.
