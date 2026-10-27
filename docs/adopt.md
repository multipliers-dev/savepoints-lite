# Adoption guide

How to install `@multipliers-dev/savepoints-lite` in a consumer repository and what is supported in the current release.

## Prerequisites

- **Node.js 22+**
- **Authenticated Notion MCP** in the agent host (default Notion provider)

## Install the package

Add a **pinned** semver dependency and commit the lockfile. Use `npm ci` in CI and reproducible environments.

```bash
npm install @multipliers-dev/savepoints-lite@1.0.0 --save-dev
```

Example `package.json` dependency (exact version recommended for production adoption):

```json
"@multipliers-dev/savepoints-lite": "1.0.0"
```

npm is the single source of truth for installed skill file versions — do not vendor or copy skills from this package into your repo.

## Installation does not activate Savepoints

`npm install` does **not** register skills with Cursor or Claude native discovery. Agents will not use Savepoints until the consumer repo includes **activation** instructions (for example a Cursor rule, or pointers in `AGENTS.md` / `CLAUDE.md`) that tell them **when** to read the router skill and **where** it lives under `node_modules`.

**In `@multipliers-dev/savepoints-lite@1.0.0`:** copy-paste activation templates and step-by-step host setup are **not** included in this package yet. Behavioral verification (manual Cursor/Claude checks that delegation and Notion writes work end-to-end) is **not** complete for this release.

## Router skill path (after install)

Point activation at the installed router skill:

```text
node_modules/@multipliers-dev/savepoints-lite/skills/savepoints/SKILL.md
```

The Notion provider skill (same package):

```text
node_modules/@multipliers-dev/savepoints-lite/skills/savepoints-notion/SKILL.md
```

`node_modules` must exist in the agent execution environment after `npm install` or `npm ci`.

## Optional configuration overrides

Consumers may override defaults without copying packaged YAML:

| File | Overrides |
| --- | --- |
| `.agents/savepoints-lite.yml` | `storage.provider` only |
| `.agents/savepoints-notion.yml` | `destination.data_source_id` only |

Absent override files are normal — package defaults apply.

## Learn the architecture

Protocol, router vs provider boundaries, append outcomes, and v1 exclusions:

- [docs/architecture.md](./architecture.md)

Skill index: [skills/README.md](../skills/README.md) (under the package install root).

## What a later release will add

A follow-on adoption slice will expand this guide with **activation templates**, a **consumer fixture**, manual verification checklists, and documented results for Cursor and Claude. Until then, treat integration as **documented but not yet verified** in those hosts.
