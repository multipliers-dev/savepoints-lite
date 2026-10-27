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

Read `storage.provider` with this precedence (static; no dynamic discovery):

| Precedence | Location | Overrides |
| --- | --- | --- |
| 1 (highest) | Consumer `.agents/savepoints-lite.yml` | `storage.provider` only |
| 2 (default) | Package [defaults.yml](./defaults.yml) next to this skill under `node_modules` | `notion` for v1 |

If `storage.provider` is missing or not supported in v1 (`notion` only), report misconfiguration in chat; do not guess or fall back to another provider.

Default package value:

```yaml
storage:
  provider: notion
```

## Provider resolution (v1)

| `storage.provider` | Provider skill (same package install) |
| --- | --- |
| `notion` | `../savepoints-notion/SKILL.md` relative to this router skill directory |

From the consumer install root:

`node_modules/@multipliers-dev/savepoints-lite/skills/savepoints-notion/SKILL.md`

Load and follow that provider skill for persistence. Unknown provider → misconfiguration; stop delegation.

## Delegation steps

1. Assemble the Savepoint per [schema.md](./schema.md).
2. Resolve `storage.provider` from config (table above).
3. Read the matching provider `SKILL.md` from the **same** `@multipliers-dev/savepoints-lite` install.
4. Pass the Savepoint to the provider skill; let the provider perform MCP writes and bounded confirmation.
5. Handle the provider outcome (`success` | `failure` | `unconfirmed`).

The router **must not** document Notion page properties, Postgres table schemas, or MCP tool parameters.

## Outcomes and user reporting

| Outcome | Router behavior |
| --- | --- |
| `success` | Continue primary work; optional brief confirmation only if useful |
| `failure` | One-sentence report (tool name + error summary); **no retry queue**; continue primary work |
| `unconfirmed` | One-sentence report (“queued — not confirmed”); continue primary work |

**Anti-loop:** A **failed `append`** (MCP unavailable, auth error, create error, or unconfirmed async) is **not** an error event that triggers another Savepoint. Report the persistence failure in chat and continue. Do **not** chain “write failed → new Savepoint to log the failure → write failed again.” Only a **later, independent** work trigger may attempt another `append`.

Do not disable subsequent Savepoint attempts in the same session after a failure.

## Forbidden (router)

- Inlining Notion property names, SQL, or MCP tool parameters
- Performing provider MCP calls directly
- Session-end batching, debouncing, or deduplicating events
- Claiming persistence without provider `success` (or provider-defined confirmed async)
