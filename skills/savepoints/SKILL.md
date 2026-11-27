---
name: savepoints
description: Router for append-only session Savepoints — detect work events, build provider-neutral records, delegate to configured storage provider skills.
---

# Savepoints (router)

Instruction-only router shipped in `@multipliers-dev/savepoints-lite`. Recognizes meaningful work, builds a Savepoint per [schema.md](./schema.md), resolves `storage.provider`, loads the matching **provider skill from the same install root**, and surfaces the provider outcome. The router **never** calls Notion/Postgres MCP or documents provider-specific property schemas.

## Install root

The **package-equivalent install root** contains `skills/savepoints/`, `skills/savepoints-notion/`, and `skills/bin/savepoints-lite-validate.mjs`. Provider skills, schema, mapping, defaults, and the optional validator all resolve from it — never from an unrelated consumer-repo path.

| Distribution | Install root |
| --- | --- |
| Standalone npm | `node_modules/@multipliers-dev/savepoints-lite/` (after `npm install` / `npm ci`) |
| [Cursor Team Marketplace](https://github.com/multipliers-dev/cursor-team-marketplace) vendor | `plugins/team-harness/vendor/savepoints-lite/` (plugin cache equivalent) — no consumer `node_modules` or npm install required |

## When to Savepoint (same turn)

Require a Savepoint **in the same turn** when any of these occur:

- A coherent unit of work completes (feature slice, fix, doc pass, verification run).
- A significant decision is made (architecture, scope, tradeoff).
- The agent switches tasks or the user changes direction.
- An error is hit or resolved **in the primary task** (tooling, build, test, user-visible failure) — record under **Errors** in the Savepoint for that work event.

**Anti-patterns:** session-end only, “remember to savepoint at the end,” debouncing, consolidating multiple events into one record.

## Build the Savepoint

Follow [schema.md](./schema.md) for field semantics. In short: `repository` is `owner/repo` from `git remote get-url origin` in the checkout where the work happened (a bare folder name only when no `origin` exists); `title` is `owner/repo — short verb phrase` in plain text, e.g. `multipliers-dev/portfolio — Implemented authentication`. Omit empty `content` sections.

## Configuration resolution

### `storage.provider`

Static; no dynamic discovery. Consumer `.agents/savepoints-lite.yml` (optional) `storage.provider` overrides the package [defaults.yml](./defaults.yml) value (`notion`).

### `validation.post_write`

Resolve in **three** tiers (static; no dynamic discovery). An absent key at a tier falls through — do **not** invent `true` or `false` when the key is missing.

| Tier | Source | When it applies |
| --- | --- | --- |
| 1 (highest) | Labelled `validation` in the **integration instruction/delegation context** | Calling distribution layer (e.g. the [Cursor Team Marketplace](https://github.com/multipliers-dev/cursor-team-marketplace) `/savepoints` wrapper) supplied it for this Savepoint |
| 2 | Consumer `.agents/savepoints-lite.yml` (optional) | Tier 1 **absent** |
| 3 (default) | Package [defaults.yml](./defaults.yml) | `validation.post_write: false` |

```yaml
validation:
  post_write: true
```

Example consumer file: [`templates/consumer/savepoints-lite.yml.example`](../../templates/consumer/savepoints-lite.yml.example).

When the resolved value is `true`, optional post-write verification is available for each append and is the agent's call; carry the resolved boolean to the provider. The router still does **not** call Notion MCP or the validator CLI, and does **not** read Cursor User Rules.

**Misconfiguration (after resolution):** report in chat when the resolved `storage.provider` is empty/missing or not supported in v1 (`notion` only). Do not treat a missing consumer file or missing integration `validation` block as misconfiguration. Do not guess another provider.

## Provider resolution (v1)

| `storage.provider` | Provider skill (same install root) |
| --- | --- |
| `notion` | `../savepoints-notion/SKILL.md` relative to this router skill directory (npm example: `node_modules/@multipliers-dev/savepoints-lite/skills/savepoints-notion/SKILL.md`) |

Unknown provider → misconfiguration; stop delegation.

## Integration handoff (tier 1)

A calling distribution layer (host `AGENTS.md`, marketplace wrapper, or other delegation context) may supply labelled YAML in the instruction context:

```yaml
destination:
  data_source_id: "<NOTION_DATA_SOURCE_ID>"
validation:
  post_write: true
```

- **`destination`:** on delegation to the Notion provider, **carry this block unchanged**. The router does **not** call Notion MCP, read Cursor User Rules, or resolve `data_source_id` itself.
- **`validation.post_write`:** apply the tiers above and carry the **resolved** boolean (not a second User Rules read).

Either key may be omitted independently.

## Delegation steps

1. Assemble the Savepoint per [schema.md](./schema.md).
2. Resolve `storage.provider` and `validation.post_write`.
3. Read the matching provider `SKILL.md` from the **same** install root.
4. Pass the Savepoint, any tier-1 `destination` block (unchanged), and the resolved `validation.post_write` flag to the provider; let it perform MCP writes and bounded confirmation.
5. Handle the provider outcome (`success` | `failure` | `unconfirmed`).

## Outcomes and user reporting

| Outcome | Router behavior |
| --- | --- |
| `success` | Continue primary work; optional brief confirmation only if useful. If the provider reports verification findings after `success` (missing persisted property, contract mismatch, repository warning, verification unavailable, repair confirmation unknown), that is **not** a failed append and must **not** trigger another Savepoint |
| `failure` | One-sentence report (tool name + error summary); **no retry queue**; continue primary work |
| `unconfirmed` | One-sentence report (“queued — not confirmed”); continue primary work |

**Anti-loop:** A **failed `append`** (MCP unavailable, auth error, create error, or unconfirmed async) is **not** an error event that triggers another Savepoint. Report it in chat and continue; do **not** chain “write failed → new Savepoint to log the failure.” Only a **later, independent** work trigger may attempt another `append`. Do not disable later Savepoint attempts in the session after a failure.

## Forbidden (router)

- Inlining Notion property names, SQL, or MCP tool parameters
- Performing provider MCP calls directly
- Session-end batching, debouncing, or deduplicating events
- Claiming persistence without provider `success` (or provider-defined confirmed async)
