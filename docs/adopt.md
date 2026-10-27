# Adoption guide

How to install `@multipliers-dev/savepoints-lite` in a consumer repository, activate agents, and verify behavior.

## What ships where

Three surfaces matter for adoption. Do not confuse them.

| Surface | What it is | Adoption assets |
| --- | --- | --- |
| **Published npm `@1.0.0` (immutable)** | The version on the public registry today. Hub dogfooding pins this exact release. | Router + Notion provider skills, `schema.md`, defaults YAML, `README.md`, `LICENSE`, and `docs/adopt.md`, `docs/architecture.md`, `docs/publishing.md` — **12 files** in `node_modules/@multipliers-dev/savepoints-lite/`. |
| **This GitHub repository (e.g. PR #8)** | Maintainer source and hub activation. Templates and checklists live here before the next npm release. | [`templates/consumer/`](../templates/consumer/), [`skills/savepoints/verification.md`](../skills/savepoints/verification.md), [`docs/adoption-verification-record.md`](./adoption-verification-record.md) (maintainer record only — **not** shipped to npm). |
| **Next npm release (after `1.0.0`)** | Future publish from `main` when maintainers cut a new semver. | Will add `templates/**` and `skills/savepoints/verification.md` to the installable tarball. Will **not** include `docs/adoption-verification-record.md` (repository maintainer evidence only). |

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

| Installed version | Template source | Paths |
| --- | --- | --- |
| **`@1.0.0` (registry)** | GitHub repository — templates are **not** in the published tarball | Copy from [multipliers-dev/savepoints-lite `templates/consumer/`](https://github.com/multipliers-dev/savepoints-lite/tree/main/templates/consumer) (or the branch you track, e.g. PR #8) into your consumer repo |
| **Future release** (includes `templates/**`) | Installed package | `node_modules/@multipliers-dev/savepoints-lite/templates/consumer/` |

| Surface | Action |
| --- | --- |
| **Cursor** | Copy `savepoints-lite.mdc` from the template source above → your repo `.cursor/rules/` (`alwaysApply: true`) |
| **AGENTS.md** | Merge the `AGENTS.md.snippet` content (preserve your existing instructions) |
| **CLAUDE.md** | Add `@AGENTS.md` so Claude imports shared activation — do not duplicate Savepoints prose (see below) |

Activation files must be **thin** — they describe the session-log triggers and point at the installed router skill path; they do not duplicate router/provider protocol in [architecture.md](./architecture.md).

The **primary agent** owns the session log for the whole session, including work done by subagents. Subagents in isolated worktrees are not required to install the package or write Savepoints; when delegated work returns, the parent records it using its own `node_modules` router and Notion MCP.

### Claude Code and an existing `CLAUDE.md`

Many repositories already have a root `CLAUDE.md` with Claude-specific instructions. **Do not replace that file** with the template snippet alone.

- **New repo / no `CLAUDE.md` yet:** create `CLAUDE.md` containing only `@AGENTS.md` (same content as `CLAUDE.md.snippet` in the template source above).
- **Existing `CLAUDE.md`:** **merge** — keep your current content and add a line `@AGENTS.md` (typically near the top) so Claude loads the shared Savepoints section from `AGENTS.md`. Remove any duplicate Savepoints paragraphs from `CLAUDE.md` after merge.

Savepoints activation prose lives in `AGENTS.md` only; `CLAUDE.md` is the import hook.

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

The `multipliers-dev/savepoints-lite` hub installs the **published** `@1.0.0` package as an exact devDependency and activates Savepoints at the repository root (Cursor rule, `AGENTS.md`, `CLAUDE.md`). Activation templates for external consumers are maintained in this repository under `templates/consumer/` until the next npm release ships them. Maintainer verification history: [`docs/adoption-verification-record.md`](./adoption-verification-record.md) (GitHub only).

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

Real Cursor and Claude Code sessions per the verification checklist. **Notion writes to the production Savepoints database require explicit operator authorization** for each run.

| Checklist location | When to use |
| --- | --- |
| GitHub [`skills/savepoints/verification.md`](../skills/savepoints/verification.md) | `@1.0.0` and while adopting from the repository (PR #8) |
| `node_modules/@multipliers-dev/savepoints-lite/skills/savepoints/verification.md` | After a published version that includes that file |

Record outcomes in your PR description; hub maintainers also update [`docs/adoption-verification-record.md`](./adoption-verification-record.md) (repository only). Put Notion page URLs in the PR description — not committed secrets.

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
| `templates/consumer/` activation stubs | No — use GitHub | Yes | Planned |
| `skills/savepoints/verification.md` manual checklist | No — use GitHub | Yes | Planned |
| `docs/adoption-verification-record.md` | No | Yes (maintainers) | No |

The package does not certify Cursor or Claude integration until manual verification scenarios are **Passed** for your host and checkout (or explicitly waived by the operator with rationale).
