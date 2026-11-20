---
name: savepoints
description: Router for append-only session Savepoints — detect work events, build provider-neutral records, delegate to configured storage provider skills.
---

# Savepoints (router)

Instruction-only router shipped in `@multipliers-dev/savepoints-lite`. Recognizes meaningful work, builds a Savepoint per [schema.md](./schema.md), resolves `storage.provider`, loads the matching **provider skill from the same npm package install**, and surfaces the provider outcome. The router **never** calls Notion/Postgres MCP or documents provider-specific property schemas.

**Installed path (consumer):** `node_modules/@multipliers-dev/savepoints-lite/skills/savepoints/SKILL.md`

`node_modules` must exist (after `npm install` / `npm ci`).

## When to Savepoint (same turn)

Require a Savepoint **in the same turn** when any of these occur:

- A coherent unit of work completes (feature slice, fix, doc pass, verification run).
- A significant decision is made (architecture, scope, tradeoff).
- The agent switches tasks or the user changes direction.
- An error is hit or resolved **in the primary task** (tooling, build, test, user-visible failure) — record under **Errors** in the Savepoint for that work event.

**Anti-patterns:** session-end only, “remember to savepoint at the end,” debouncing, consolidating multiple events into one record.

## Build the Savepoint

Follow [schema.md](./schema.md) for field semantics and metadata derivation. Omit empty `content` sections.

## Configuration resolution

### `storage.provider`

Resolve in two steps (static; no dynamic discovery):

1. Start from package [defaults.yml](./defaults.yml) next to this skill (same install root as this router).
2. If consumer `.agents/savepoints-lite.yml` exists, its `storage.provider` **overrides** the packaged default.

| Precedence | Location | Overrides |
| --- | --- | --- |
| 1 (highest) | Consumer `.agents/savepoints-lite.yml` (optional) | `storage.provider` |
| 2 (default) | Package [defaults.yml](./defaults.yml) | `notion` |

### `validation.post_write`

Resolve in **three** tiers (static; no dynamic discovery). An absent key at a tier falls through — do **not** invent `true` or `false` when the key is missing.

| Tier | Source | When it applies |
| --- | --- | --- |
| 1 (highest) | Labelled `validation` in the **integration instruction/delegation context** | Calling distribution layer (e.g. [Cursor Team Marketplace](https://github.com/multipliers-dev/cursor-team-marketplace) `/savepoints` wrapper) supplied `validation.post_write` for this Savepoint |
| 2 | Consumer `.agents/savepoints-lite.yml` (optional) | Tier 1 **absent** for this delegation |
| 3 (default) | Package [defaults.yml](./defaults.yml) | `validation.post_write: false` |

**Tier 1 block** (same handoff channel as destination; provider-neutral):

```yaml
validation:
  post_write: true
```

Package default:

```yaml
storage:
  provider: notion
validation:
  post_write: false
```

Example consumer file: [`templates/consumer/savepoints-lite.yml.example`](../../templates/consumer/savepoints-lite.yml.example).

Carry the **resolved** `validation.post_write` flag into the provider instruction context (so the Notion provider knows whether to run optional post-write CLI validation). The router still does **not** call Notion MCP or the validator CLI, and does **not** read Cursor User Rules.

**Misconfiguration (after resolution):** report in chat when the resolved `storage.provider` is empty/missing, or not supported in v1 (`notion` only). Do not treat “no consumer override file” or “no integration validation block” as misconfiguration. Do not guess or fall back to another provider.

## Provider resolution (v1)

| `storage.provider` | Provider skill (same package install) |
| --- | --- |
| `notion` | `../savepoints-notion/SKILL.md` relative to this router skill directory |

From the consumer install root:

`node_modules/@multipliers-dev/savepoints-lite/skills/savepoints-notion/SKILL.md`

Load and follow that provider skill for persistence. Unknown provider → misconfiguration; stop delegation.

## Install root (standalone npm and marketplace vendor)

The **package-equivalent install root** is the directory that contains `skills/savepoints/` and `skills/savepoints-notion/` (and, when built/published, `skills/bin/savepoints-lite-validate.mjs`). Typical layouts:

| Distribution | Install root |
| --- | --- |
| Standalone npm | `node_modules/@multipliers-dev/savepoints-lite/` |
| [Cursor Team Marketplace](https://github.com/multipliers-dev/cursor-team-marketplace) vendor | `plugins/team-harness/vendor/savepoints-lite/` (plugin cache equivalent) |

Load provider skills and the optional validator from **this** install root — never from an unrelated consumer-repo path, and do not assume the consumer repository has Savepoints Lite in `node_modules`.

## Integration handoff (tier 1)

When the calling distribution layer (host `AGENTS.md`, [Cursor Team Marketplace](https://github.com/multipliers-dev/cursor-team-marketplace) `/savepoints` wrapper, or other delegation context) supplies labelled YAML in the **instruction/delegation context**, the router may receive:

```yaml
destination:
  data_source_id: "<NOTION_DATA_SOURCE_ID>"
validation:
  post_write: true
```

- **`destination`:** on delegation to the Notion provider, **carry this block unchanged**. The router does **not** call Notion MCP, read Cursor User Rules, or resolve `data_source_id` itself.
- **`validation.post_write`:** apply the three-tier resolution above; carry the **resolved** boolean into the provider context (not a second User Rules read).

Either key may be omitted independently. Missing `validation` falls through to consumer `.agents` then packaged defaults.

## Delegation steps

1. Assemble the Savepoint per [schema.md](./schema.md).
2. Resolve `storage.provider` and `validation.post_write` from config (tables above).
3. Read the matching provider `SKILL.md` from the **same** install root as this router.
4. Pass the Savepoint to the provider skill together with any tier-1 `destination` block from the integration context (unchanged) and the resolved `validation.post_write` flag; let the provider perform MCP writes and bounded confirmation.
5. Handle the provider outcome (`success` | `failure` | `unconfirmed`).

The router **must not** document Notion page properties, Postgres table schemas, or MCP tool parameters.

## Outcomes and user reporting

| Outcome | Router behavior |
| --- | --- |
| `success` | Continue primary work; optional brief confirmation only if useful. When opt-in post-write validation ran, the provider may report issues after `success` (missing persisted property, contract mismatch, verification unavailable, repair confirmation unknown) — that is **not** a failed append and must **not** trigger another Savepoint |
| `failure` | One-sentence report (tool name + error summary); **no retry queue**; continue primary work |
| `unconfirmed` | One-sentence report (“queued — not confirmed”); continue primary work |

**Anti-loop:** A **failed `append`** (MCP unavailable, auth error, create error, or unconfirmed async) is **not** an error event that triggers another Savepoint. Report the persistence failure in chat and continue. Do **not** chain “write failed → new Savepoint to log the failure → write failed again.” Only a **later, independent** work trigger may attempt another `append`.

Do not disable subsequent Savepoint attempts in the same session after a failure.

## Forbidden (router)

- Inlining Notion property names, SQL, or MCP tool parameters
- Performing provider MCP calls directly
- Session-end batching, debouncing, or deduplicating events
- Claiming persistence without provider `success` (or provider-defined confirmed async)
