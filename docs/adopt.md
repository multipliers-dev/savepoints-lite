# Adoption guide

How to install `@multipliers-dev/savepoints-lite` in a consumer repository, activate agents, and verify behavior.

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

npm is the single source of truth for installed skill file versions — **do not** vendor or copy skills from this package into your repo.

### Renovate / dependency bumps

Let Renovate (or equivalent) open PRs that bump the pinned version and refresh the lockfile. Activation text stays stable — agents always resolve:

`node_modules/@multipliers-dev/savepoints-lite/skills/savepoints/SKILL.md`

Re-run manual checks in [`skills/savepoints/verification.md`](../skills/savepoints/verification.md) after major upgrades if behavior changes.

## Installation does not activate Savepoints

`npm install` does **not** register skills with Cursor or Claude native discovery. Consumers need **one-time activation** that tells agents **when** to read the router and **where** it lives under `node_modules`.

Copy-paste templates ship in the package under `templates/consumer/` (also present in this hub repository for packaging).

| Surface | Action |
| --- | --- |
| **Cursor** | Copy `templates/consumer/.cursor/rules/savepoints-lite.mdc` → `.cursor/rules/` (`alwaysApply: true`) |
| **AGENTS.md** | Merge `templates/consumer/AGENTS.md.snippet` (preserve existing instructions) |
| **CLAUDE.md** | Use `@AGENTS.md` import only (`templates/consumer/CLAUDE.md.snippet`) — do not duplicate Savepoints prose |

Activation files must be **thin** — they reference triggers and the installed router path; they do not duplicate the full protocol in [architecture.md](./architecture.md).

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

The `multipliers-dev/savepoints-lite` hub installs the **published** `@1.0.0` package as an exact devDependency and activates Savepoints at the repository root (Cursor rule, `AGENTS.md`, `CLAUDE.md`). This is **required** for maintainers validating adoption — see [`docs/adoption-verification-record.md`](./adoption-verification-record.md).

## Optional configuration overrides

| File | Overrides |
| --- | --- |
| `.agents/savepoints-lite.yml` | `storage.provider` only |
| `.agents/savepoints-notion.yml` | `destination.data_source_id` only |

Absent override files are normal — package defaults apply.

## Verification

Automated: `npm ci` and lockfile pin at the consumer repo root; hub maintainers also run a **temporary** registry install outside the repo (see [`skills/savepoints/verification.md`](../skills/savepoints/verification.md) § A).

Manual: [`skills/savepoints/verification.md`](../skills/savepoints/verification.md) — real Cursor and Claude Code sessions. **Notion writes to the production Savepoints database require explicit operator authorization** for each run. Record outcomes in [`docs/adoption-verification-record.md`](./adoption-verification-record.md) and Notion URLs in the PR description.

Do **not** add Savepoints lifecycle hooks or executable persistence logic for v1 — instruction + activation only.

## Learn the architecture

Protocol, router vs provider boundaries, append outcomes, and v1 exclusions:

- [docs/architecture.md](./architecture.md)

Skill index: [skills/README.md](../skills/README.md) (under the package install root).

## Integration support in `@multipliers-dev/savepoints-lite@1.0.0`

| Included | Notes |
| --- | --- |
| Router and Notion provider skills, schema, defaults | Installed via npm |
| `templates/consumer/` activation stubs | Copy into consumer repos |
| `skills/savepoints/verification.md` manual checklist | Required before claiming host integration |
| Recorded behavioral verification | See [`docs/adoption-verification-record.md`](./adoption-verification-record.md) — hub dogfooding for this package repo |

The package does not certify Cursor or Claude integration until manual verification scenarios are **Passed** for your host and checkout (or explicitly waived by the operator with rationale).
