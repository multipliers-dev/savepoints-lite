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

Resolve `destination.data_source_id` in two steps (static; no dynamic discovery):

1. Start from package [defaults.yml](./defaults.yml) next to this skill under `node_modules`.
2. If consumer `.agents/savepoints-notion.yml` exists and sets `destination.data_source_id`, that value **overrides** the package default.

An absent `.agents/savepoints-notion.yml` is normal — use the packaged default. Only the **resolved** value after step 2 is authoritative.

| Precedence | Location | Overrides |
| --- | --- | --- |
| 1 (highest) | Consumer `.agents/savepoints-notion.yml` (optional) | `destination.data_source_id` only |
| 2 (default) | Package [defaults.yml](./defaults.yml) | Shared Savepoints database |

Package default:

```yaml
destination:
  data_source_id: "822cbc89-7c89-4863-af3a-2fe0cd8ab56e"
```

**Misconfiguration (after resolution):** report in chat when the resolved `destination.data_source_id` is empty, missing, or invalid for the target data source. Do not treat “no consumer override file” as misconfiguration.

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

- Use the consumer’s authenticated **Notion MCP** (`notion-create-pages`).
- **Require synchronous create:** set `allow_async: false` on **every** `notion-create-pages` call when the tool accepts that parameter.
- **Async fallback only:** if the tool rejects `allow_async: false` or does not support the parameter, retry **once** with the tool’s required/default async shape for the same Savepoint — not a second create. If the first call might have persisted (indeterminate write), do **not** issue another create; return `unconfirmed` and report in chat.
- Distinguish **parameter retry** (unsupported `allow_async: false` → one async-shaped retry of the same logical write) from **write confirmation** (polling an async task). Never use a second create to “fix” an indeterminate first create.
- When the accepted call is async: poll at most **two** follow-ups (e.g. `notion-get-async-task` or equivalent), then stop.
- Use `notion-fetch` **only** on property mismatch or tool-required discovery — not a session preflight.

Return to the router:

```text
success | failure | unconfirmed
```

- `success` — persistence **confirmed** (synchronous create succeeded, or async polling reached a terminal succeeded state).
- `failure` — tool error, auth failure, or terminal async failure with no confirmed row.
- `unconfirmed` — async operation still unresolved after bounded polling, or the first create might have persisted and a duplicate create was refused.

Never imply persistence on queue alone or on an unconfirmed async task.

## Forbidden (provider)

- Event detection or trigger logic (router only)
- Modifying or deleting previous Savepoint rows
- Retry queues, background workers, or duplicate create attempts when the first write may already exist
