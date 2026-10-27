# Adoption guide

How to install `@multipliers-dev/savepoints-lite` in a consumer repository, activate agents, and verify behavior.

## What ships where

Three surfaces matter for adoption. Do not confuse them.

| Surface | What it is | Adoption assets |
| --- | --- | --- |
| **Published npm `@1.0.0` (immutable)** | The version on the public registry today. Hub dogfooding pins this exact release. | Router + Notion provider skills, `schema.md`, defaults YAML, `README.md`, `LICENSE`, and `docs/adopt.md`, `docs/architecture.md`, `docs/publishing.md` — **12 files** in `node_modules/@multipliers-dev/savepoints-lite/`. |
| **This GitHub repository (e.g. PR #8)** | Maintainer source and hub activation. Templates and checklists live here before the next npm release. | [`templates/consumer/`](../templates/consumer/AGENTS.md.snippet), [`skills/savepoints/verification.md`](../skills/savepoints/verification.md), [adoption verification record on GitHub](https://github.com/multipliers-dev/savepoints-lite/blob/main/docs/adoption-verification-record.md) (maintainer only — **not** shipped to npm). |
| **Next npm release (after `1.0.0`)** | Future publish from `main` when maintainers cut a new semver. | Will add `templates/consumer/` (`AGENTS.md.snippet`, `CLAUDE.md.snippet`), `skills/savepoints/verification.md`, and related paths to the installable tarball. Will **not** include `docs/adoption-verification-record.md` (repository maintainer evidence only). |

Changing the workspace `package.json` `files` allowlist in git does **not** change the immutable registry artifact `@1.0.0`. Consumers on `@1.0.0` only receive the 12-file layout until they upgrade to a newer published version.

## Prerequisites

- **Node.js 22+**
- **Authenticated Notion MCP** in the agent host (default Notion provider)

## Install the package

Add a **pinned** semver dependency and commit the lockfile. Use `npm ci` in CI and reproducible environments.

```bash
npm install @multipliers-dev/savepoints-lite@1.0.0 --save-dev --save-exact
```

Example `package.json` dependency (exact version recommended):

```json
"@multipliers-dev/savepoints-lite": "1.0.0"
```

npm is the single source of truth for installed **skill** file versions — **do not** vendor or copy router/provider skills from this package into your repo.

### Renovate / dependency bumps

Let Renovate (or equivalent) open PRs that bump the pinned version and refresh the lockfile. Activation text stays stable — agents always resolve:

`node_modules/@multipliers-dev/savepoints-lite/skills/savepoints/SKILL.md`

After upgrading past `1.0.0`, re-run manual checks from the installed checklist path (see [Verification](#verification)).

## Installation does not activate Savepoints

`npm install` does **not** register skills with Cursor or Claude native discovery. Consumers need **one-time activation** that makes **session logging** an immediate obligation — **when** to record, **what** each entry should capture, and **where** the installed logging workflow lives under `node_modules` (not the full protocol — that stays in the router skill).

### Where to get activation templates

| Installed version | Template source |
| --- | --- |
| **`@1.0.0` (registry)** | [GitHub `templates/consumer/`](https://github.com/multipliers-dev/savepoints-lite/tree/main/templates/consumer) — templates are **not** in the published tarball |
| **Future release** (includes `templates/**`) | `node_modules/@multipliers-dev/savepoints-lite/templates/consumer/` after `npm ci` |

Canonical files (copy from the source for your version; do not duplicate their prose in consumer docs):

| File | Role |
| --- | --- |
| [`templates/consumer/AGENTS.md.snippet`](../templates/consumer/AGENTS.md.snippet) | Runtime session-log contract — merge into root `AGENTS.md` |
| [`templates/consumer/CLAUDE.md.snippet`](../templates/consumer/CLAUDE.md.snippet) | Claude Code import hook (`@AGENTS.md`) only |

Activation is **one shared runtime contract** in root `AGENTS.md`. Claude Code loads that same contract through `CLAUDE.md` (`@AGENTS.md`). Cursor uses the committed `AGENTS.md` section directly — no parallel Savepoints-specific Cursor rule.

Activation text must be **thin** — session-log triggers and the installed router path only; router/provider protocol stays in [architecture.md](./architecture.md).

The **primary agent** owns the session log for the whole session, including work done by subagents. Subagents in isolated worktrees are not required to install the package or write Savepoints; when delegated work returns, the parent records it using its own `node_modules` router and Notion MCP.

### Cursor

1. Install and pin `@multipliers-dev/savepoints-lite` (see [Install the package](#install-the-package)).
2. Merge [`AGENTS.md.snippet`](../templates/consumer/AGENTS.md.snippet) into the repository root `AGENTS.md` (preserve your existing instructions).
3. Configure and authorize **Notion MCP** in Cursor.

Ongoing logging opt-in is the committed `AGENTS.md` session-log section (same text as Claude Code uses).

### Claude Code

1. Complete the same package install and `AGENTS.md` merge steps as Cursor.
2. Ensure root [`CLAUDE.md`](../templates/consumer/CLAUDE.md.snippet) imports `AGENTS.md` with `@AGENTS.md` (merge into an existing `CLAUDE.md` when needed — see below).
3. Configure and authorize **Notion MCP** in Claude Code.

### Ongoing logging authorization (opt-in)

| Case | Behavior |
| --- | --- |
| **Normal operation, logging authorized** | Savepoints Lite session-log section committed in root `AGENTS.md` (Claude Code: loaded via `CLAUDE.md` `@AGENTS.md`). Record after meaningful work, decisions, task switches, and errors **without** asking for separate authorization before each entry, subject to Notion MCP host permissions. Fail open on write failure; do not claim persistence without provider confirmation. |
| **Normal operation, not authorized or unclear** | Package install or Notion MCP connection alone is **not** consent. Do not write to Notion; complete activation or obtain explicit consent; otherwise fail open without claiming persistence. |
| **Manual verification** | Running the behavioral checklist ([`skills/savepoints/verification.md`](../skills/savepoints/verification.md)) — deliberate test writes, failure simulations, and other non-routine checks — requires **explicit operator authorization for that verification session**. That gate does **not** replace activation opt-in and does **not** require per-entry authorization during ordinary development when activation is already in place. |

`.agents/savepoints-lite.yml` and `.agents/savepoints-notion.yml` override provider routing only; they are **not** the ongoing-logging opt-in mechanism.

Savepoints activation prose lives in `AGENTS.md` only; `CLAUDE.md` is the import hook. **Do not replace** an existing `CLAUDE.md` with only `@AGENTS.md` — merge the import line instead (see [Claude Code](#claude-code)).

## Router skill path (after install)

```text
node_modules/@multipliers-dev/savepoints-lite/skills/savepoints/SKILL.md
```

Notion provider (same package):

```text
node_modules/@multipliers-dev/savepoints-lite/skills/savepoints-notion/SKILL.md
```

`node_modules` must exist in the agent execution environment after `npm install` or `npm ci`.

**Important:** Even when developing the package from a git checkout, activated agents must read the **installed** router under `node_modules`, not the repository `skills/` source tree.

## Hub dogfooding (package repository)

The `multipliers-dev/savepoints-lite` hub installs the **published** `@1.0.0` package as an exact devDependency and activates Savepoints via root `AGENTS.md` and `CLAUDE.md` (`@AGENTS.md`). Consumer templates live under `templates/consumer/` until the next npm release ships them. Maintainer verification history: [adoption verification record on GitHub](https://github.com/multipliers-dev/savepoints-lite/blob/main/docs/adoption-verification-record.md) (not in the npm tarball).

## Optional configuration overrides

| File | Overrides |
| --- | --- |
| `.agents/savepoints-lite.yml` | `storage.provider` only |
| `.agents/savepoints-notion.yml` | `destination.data_source_id` only |

Absent override files are normal — package defaults apply.

## Verification

### Automated

- Consumer repo: `npm ci` and lockfile pin at the repo root.
- Hub maintainers: temporary registry install outside the repo (checklist § A in [`skills/savepoints/verification.md`](../skills/savepoints/verification.md) on the GitHub repo, or the same path under `node_modules/.../skills/savepoints/verification.md` after a release that ships it).

### Manual

Real Cursor and Claude Code sessions per the verification checklist. **Verification-session authorization** (explicit operator consent to run deliberate checklist scenarios, especially failure simulations) is separate from **ongoing session logging** authorized by activation — see [Ongoing logging authorization](#ongoing-logging-authorization-opt-in).

| Checklist location | When to use |
| --- | --- |
| GitHub [`skills/savepoints/verification.md`](../skills/savepoints/verification.md) | `@1.0.0` and while adopting from the repository (PR #8) |
| `node_modules/@multipliers-dev/savepoints-lite/skills/savepoints/verification.md` | After a published version that includes that file |

Record outcomes in your PR description; hub maintainers also update the [adoption verification record on GitHub](https://github.com/multipliers-dev/savepoints-lite/blob/main/docs/adoption-verification-record.md). Put Notion page URLs in the PR description — not committed secrets.

Do **not** add Savepoints lifecycle hooks or executable persistence logic for v1 — instruction + activation only.

## Learn the architecture

Protocol, router vs provider boundaries, append outcomes, and v1 exclusions:

- [docs/architecture.md](./architecture.md)

Skill index: [skills/README.md](../skills/README.md) (under the package install root).

## Integration support summary

| Capability | `@1.0.0` on npm | GitHub repository | Next npm release |
| --- | --- | --- | --- |
| Router + Notion provider skills, schema, defaults | Yes | Yes (source) | Yes |
| `docs/adopt.md`, `docs/architecture.md`, `docs/publishing.md` | Yes | Yes | Yes |
| `templates/consumer/` (`AGENTS.md.snippet`, `CLAUDE.md.snippet`) | No — use GitHub | Yes | Planned |
| `skills/savepoints/verification.md` manual checklist | No — use GitHub | Yes | Planned |
| `docs/adoption-verification-record.md` | No | Yes (maintainers) | No |

The package does not certify Cursor or Claude integration until manual verification scenarios are **Passed** for your host and checkout (or explicitly waived by the operator with rationale).
