# Adoption guide

How to install `@multipliers-dev/savepoints-lite` in a consumer repository, configure a Notion destination, activate agents, and verify behavior.

## What ships in the npm package

`@multipliers-dev/savepoints-lite@2.1.0` ships router + Notion provider skills, `schema.json` / `schema.md`, Notion `mapping.json`, defaults YAML, optional self-contained `skills/bin/savepoints-lite-validate.mjs` CLI (npm bin `savepoints-lite-validate`), consumer templates, shipped docs, and `LICENSE`. Default behaviour is instruction-only persistence; enable `validation.post_write` via integration instruction context or `.agents/savepoints-lite.yml`. Maintainer-only evidence ([adoption verification record on GitHub](https://github.com/multipliers-dev/savepoints-lite/blob/main/docs/adoption-verification-record.md)) is **not** in the npm package.

Pin an **exact** semver and commit the lockfile. Use `npm ci` in CI.

```bash
npm install @multipliers-dev/savepoints-lite@2.1.0 --save-dev --save-exact
```

npm is the single source of truth for installed **skill** file versions — **do not** vendor or copy router/provider skills from this package into your repo.

## Notion destination (`destination.data_source_id`)

`@2.1.0` does **not** ship a maintainer Notion database id in packaged defaults. You must supply a valid `data_source_id` through one of these tiers (provider resolves in order).

**Distribution layer (optional):** anything *outside* this npm package that (1) delivers the skill tree to the agent host and/or (2) injects labelled config (`destination`, optional `validation.post_write`) into the router’s instruction context when delegating. Standalone consumers usually skip this and use **tier 2**. The public example is [Cursor Team Marketplace](https://github.com/multipliers-dev/cursor-team-marketplace) `team-harness`: it vendors `plugins/team-harness/vendor/savepoints-lite/` and a `/savepoints` wrapper that maps Cursor User Rules → tier-1 `destination` (see § External integrations below).

| Tier | Source | When it applies |
| --- | --- | --- |
| 1 (highest) | Labelled YAML in the calling integration’s **instruction/delegation context** (router → Notion provider handoff) | A distribution layer (e.g. [Cursor Team Marketplace](https://github.com/multipliers-dev/cursor-team-marketplace) `/savepoints` wrapper) passes `destination` when delegating |
| 2 | Consumer [`.agents/savepoints-notion.yml`](../templates/consumer/savepoints-notion.yml.example) | Tier 1 **absent** for that delegation — **typical standalone npm path** |
| 3 | Packaged `skills/savepoints-notion/defaults.yml` | Never supplies an id in `@2.x` |

**Tier 1 block** (provider-neutral; reuse in wrappers and external integrations):

```yaml
destination:
  data_source_id: "<NOTION_DATA_SOURCE_ID>"
```

**Tier 2:** copy [templates/consumer/savepoints-notion.yml.example](../templates/consumer/savepoints-notion.yml.example) to `.agents/savepoints-notion.yml` and set your Notion data source id.

**Missing valid destination:** fail open — no Notion MCP write; primary work continues. **Tier 1 present but invalid:** fail open **without** falling back to tier 2 or 3.

## Prerequisites

- **Node.js 22+**
- **Authenticated Notion MCP** in the agent host
- **Configured destination** per the table above

## Installation does not activate Savepoints

`npm install` does **not** register skills with Cursor or Claude native discovery. Consumers need **one-time activation** that makes **session logging** an immediate obligation — **when** to record (including at least one Savepoint per engineering session when logging is available), **what** each entry should capture, and **where** the installed logging workflow lives under `node_modules`.

### Activation templates (in the tarball)

| File | Role |
| --- | --- |
| [`templates/consumer/AGENTS.md.snippet`](../templates/consumer/AGENTS.md.snippet) | Runtime session-log contract — merge into root `AGENTS.md` |
| [`templates/consumer/CLAUDE.md.snippet`](../templates/consumer/CLAUDE.md.snippet) | Claude Code import hook (`@AGENTS.md`) only |
| [`templates/consumer/savepoints-notion.yml.example`](../templates/consumer/savepoints-notion.yml.example) | Optional `.agents/savepoints-notion.yml` template |
| [`templates/consumer/savepoints-lite.yml.example`](../templates/consumer/savepoints-lite.yml.example) | Optional `.agents/savepoints-lite.yml` (`storage.provider`, `validation.post_write`) |

After `npm ci`, templates live under `node_modules/@multipliers-dev/savepoints-lite/templates/consumer/`.

Activation is **one shared runtime contract** in root `AGENTS.md`. Claude Code loads that contract through `CLAUDE.md` (`@AGENTS.md`). Cursor uses the committed `AGENTS.md` section directly — no parallel Savepoints-specific Cursor rule.

The **primary agent** owns the session log for the whole session, including work done by subagents.

### Cursor

1. Install and pin `@multipliers-dev/savepoints-lite`.
2. Merge `AGENTS.md.snippet` into root `AGENTS.md`.
3. Configure destination (tier 1 integration context and/or `.agents/savepoints-notion.yml`).
4. Configure and authorize **Notion MCP** in Cursor.

### Claude Code

1. Same package install and `AGENTS.md` merge as Cursor.
2. Ensure root `CLAUDE.md` imports `AGENTS.md` with `@AGENTS.md`.
3. Configure destination and **Notion MCP**.

### Ongoing logging authorization (opt-in)

The merged `AGENTS.md.snippet` **Session log** section is the canonical standing-instruction wording for standalone consumers. It expresses the same expectations as team-harness User Rules, adapted for repo-local activation and the `node_modules` router path — without requiring a marketplace wrapper or global User Rules.

| Case | Behavior |
| --- | --- |
| **Normal operation, logging authorized** | Savepoints Lite session-log section committed in root `AGENTS.md`. **Every engineering session must produce at least one Savepoint** when logging is available; additional Savepoints after completed work, decisions, task switches, and errors or resolutions are expected — not capped at a minimum beyond one per session. Do not batch unrelated work into one entry to reduce volume. Log during work and **before stopping or handing off** completed work (including Open PR only boundaries). Record without per-entry authorization, subject to Notion MCP permissions. Fail open on write failure or unavailable logging. |
| **Normal operation, not authorized or unclear** | Package install or Notion MCP alone is **not** consent. Do not write to Notion. |
| **Manual verification** | Behavioral checklist ([`skills/savepoints/verification.md`](../skills/savepoints/verification.md)) requires **explicit operator authorization for that verification session** — separate from routine logging when activation is in place. |

Each Savepoint must capture what was done, decisions (and rationale), open threads, and errors (what happened and how they were handled). `.agents/savepoints-lite.yml` may override `storage.provider` and `validation.post_write`; it is **not** the logging opt-in mechanism.

### Optional post-write validation

Packaged default: `validation.post_write: false`. Enable via (1) integration delegation context `validation.post_write: true` (highest), or (2) `.agents/savepoints-lite.yml`. When enabled, after a confirmed Notion create the provider skill reads back the page and runs `skills/bin/savepoints-lite-validate.mjs` against persisted properties, then may attempt one repair. Requires Node.js ≥ 22 when enabled; if Node or the CLI cannot run, report **verification unavailable** and keep the confirmed create as `success`. The CLI does not call Notion and does not require Notion credentials. Unit tests cover the validator; they do **not** prove agents invoke it.

## Router skill path (after install)

```text
node_modules/@multipliers-dev/savepoints-lite/skills/savepoints/SKILL.md
```

Notion provider:

```text
node_modules/@multipliers-dev/savepoints-lite/skills/savepoints-notion/SKILL.md
```

Activated agents must read the **installed** router under `node_modules`, not a git `skills/` tree.

## Hub dogfooding (package repository)

The hub publishes release-candidate semver from workspace `package.json` while pinning the **registry** devDependency to the latest **published** version until a post-publish follow-up PR bumps the pin (see [publishing.md](./publishing.md)). Hub activation uses root `AGENTS.md` and `CLAUDE.md` (`@AGENTS.md`).

## Optional router override

| File | Overrides |
| --- | --- |
| `.agents/savepoints-lite.yml` | `storage.provider`; `validation.post_write` (when integration context omits validation) |

## Verification

### Automated

- Consumer: `npm ci` and lockfile pin at repo root.
- Hub: `npm ci`, `npm test`, `npm run verify`, `npm run validate:plans`.

### Manual

[`skills/savepoints/verification.md`](../skills/savepoints/verification.md) — real Cursor and Claude sessions; operator authorization for deliberate failure simulations.

## External integrations (provider-neutral)

Distribution layers (wrappers and non-Cursor hosts — see § Notion destination) should pass the tier-1 `destination` block in instruction context when delegating to the Savepoints router, and carry it unchanged to the Notion provider. They may also pass `validation.post_write` in the same handoff so consumers need not commit `.agents/savepoints-lite.yml` solely to enable checks. The public npm package stays host-agnostic — convention in skills, not a programmatic API.

### [Cursor Team Marketplace](https://github.com/multipliers-dev/cursor-team-marketplace)

**Available now:** [team-harness](https://github.com/multipliers-dev/cursor-team-marketplace) **1.16.0+** (marketplace [PR #78](https://github.com/multipliers-dev/cursor-team-marketplace/pull/78)) distributes published Savepoints Lite **`@2.1.0`** as a vendored skill tree under `plugins/team-harness/vendor/savepoints-lite/` (including optional `skills/bin/savepoints-lite-validate.mjs`) plus a `/savepoints` wrapper that maps Cursor User Rules → tier-1 `destination` and, when configured, `validation.post_write`. Canonical skills still do not read User Rules.

**Install / configure** (plugin path — no consumer `npm install` of this package required):

1. Install or refresh the **team-harness** plugin from the [Cursor Team Marketplace](https://github.com/multipliers-dev/cursor-team-marketplace).
2. Put standing session-log instructions and `savepoints_lite.destination.data_source_id` in global Cursor **User Rules** (engineering invariants). Optionally set `savepoints_lite.validation.post_write`.
3. Connect **Notion MCP** with write access to that data source.

Operator setup, copy-ready User Rules generation, and troubleshooting live in the marketplace guide: [`plugins/team-harness/docs/savepoints-integration.md`](https://github.com/multipliers-dev/cursor-team-marketplace/blob/main/plugins/team-harness/docs/savepoints-integration.md).

After a Savepoints Lite release that changes the published `skills/` inventory, marketplace maintainers bump the pin and re-sync the vendor tree in that repository (`npm run sync:savepoints-vendor`). Do not implement those marketplace edits from this package repository.

## Learn more

- [docs/architecture.md](./architecture.md) — layers, precedence, append contract
- [skills/README.md](../skills/README.md) — skill index

The package does not certify Cursor or Claude integration until manual verification scenarios pass for your host and configuration.
