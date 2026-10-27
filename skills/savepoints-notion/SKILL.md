---
name: savepoints-notion
description: Notion provider for Savepoints — map Savepoint to Notion properties and body, write via Notion MCP, bounded async confirmation.
---

# Savepoints — Notion provider

Accepts a Savepoint from the **router** (`skills/savepoints/SKILL.md`). Does **not** decide when Savepoints are created.

**Installed path (consumer):** `node_modules/@multipliers-dev/savepoints-lite/skills/savepoints-notion/SKILL.md`

## Input

Provider-neutral Savepoint per router [schema.md](../savepoints/schema.md).

## Configuration resolution

Read `destination.data_source_id` with this precedence:

| Precedence | Location | Overrides |
| --- | --- | --- |
| 1 (highest) | Consumer `.agents/savepoints-notion.yml` | `destination.data_source_id` only |
| 2 (default) | Package [defaults.yml](./defaults.yml) under `node_modules` | Shared Savepoints database |

Default package value:

```yaml
destination:
  data_source_id: "822cbc89-7c89-4863-af3a-2fe0cd8ab56e"
```

Shared Notion database id for humans: `05e4c804-1380-4ea2-8eb6-30027aa05fe4`. Do **not** change Notion schema unless `notion-fetch` proves incompatibility.

## Notion mapping

Verified against the shared Savepoints data source (`collection://822cbc89-7c89-4863-af3a-2fe0cd8ab56e`) via `notion-fetch` on database `05e4c804-1380-4ea2-8eb6-30027aa05fe4`. Property names are case-sensitive.

| Savepoint field | Notion property | Notion type | Set on create? | `notion-create-pages` `properties` value |
| --- | --- | --- | --- | --- |
| `title` | `Name` | `title` | yes | Plain string (SQLite `TEXT` for this data source) |
| `repository` | `Repository` | `text` | yes | Plain string |
| `agent` | `Agent` | `text` | yes | Plain string |
| `session_id` | `Session ID` | `text` | when known | Plain string; **omit** this key when `session_id` is unknown |
| — | `Created` | `created_time` | no | System-managed (`readOnly`); **do not** set |

Use exact property names in the `properties` map. Pass Savepoint string fields as JavaScript strings (not arrays or rich-text objects) unless `notion-create-pages` or a create error explicitly requires another shape for this data source.

**Body:** Notion-flavored Markdown sections for non-empty `content` keys (`what_was_done`, `decisions_made`, `open_threads`, `errors`). Read the Notion markdown spec once when first composing page body. Do not duplicate `title` in page `content` — the title lives in `Name`.

**Parent:** `parent`: `{ "type": "data_source_id", "data_source_id": "<resolved destination.data_source_id>" }` (UUID with or without dashes).

## MCP write and confirmation

- Use the consumer’s authenticated **Notion MCP** (e.g. `notion-create-pages`).
- Prefer synchronous create (`allow_async: false` when the tool supports it).
- When async is unavoidable: at most **two** poll follow-ups, then return `unconfirmed` if still not terminal.
- Use `notion-fetch` **only** on property mismatch or tool-required discovery — not a session preflight.

Return to the router:

```text
success | failure | unconfirmed
```

- `success` — create confirmed (sync success or async reached succeeded).
- `failure` — tool error, auth failure, or terminal async failure.
- `unconfirmed` — queued or polling exhausted without confirmation.

Never imply persistence on queue alone.

## Forbidden (provider)

- Event detection or trigger logic (router only)
- Modifying or deleting previous Savepoint rows
- Retry queues or background workers
