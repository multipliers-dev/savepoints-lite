---
name: savepoints-notion
description: Notion provider for Savepoints — map Savepoint to Notion properties and body, write via Notion MCP, bounded async confirmation, optional post-write verification.
---

# Savepoints — Notion provider

Accepts a Savepoint from the **router** (`skills/savepoints/SKILL.md`). Does **not** decide when Savepoints are created.

**Install root:** the directory containing `skills/savepoints-notion/` — npm `node_modules/@multipliers-dev/savepoints-lite/` or marketplace `…/vendor/savepoints-lite/`. Schema, mapping, and the optional validator resolve from it; the consumer repo needs no `node_modules`.

## Post-write verification and repair (optional)

When the router's resolved `validation.post_write` is `true`, you **may** verify a confirmed append. Decide each append on its own; skipping is acceptable and does not change the outcome. It tends to be worthwhile after a first or complex write to a repo, a freshly discovered schema, an earlier gap in this session, or an operator request. When the flag is `false` or absent, do not invoke the CLI. Use the flag from the router handoff; do **not** re-read Cursor User Rules (if the handoff omits it: consumer `.agents/savepoints-lite.yml`, then packaged `false`).

To verify, only after create is confirmed `success`:

1. `notion-fetch` the created page (page id/url from the create result).
2. Run the CLI on the fetch result (replace `/path/to/install-root` with the install root; no `--stdin`, no `|| true`):

```bash
node /path/to/install-root/skills/bin/savepoints-lite-validate.mjs <<'EOF'
<properties>
{...paste the properties block from the notion-fetch result...}
</properties>
EOF
```

A saved fetch result also works with `< file`; `--input '<json>'` and `--stdin` remain valid. If you validate, use the **persisted** properties from the fetch — **never** the values you just sent to create. Structured Notion `title` / `rich_text` shapes are accepted as fetched; do not hand-flatten. The CLI reads [../savepoints/schema.json](../savepoints/schema.json) and [mapping.json](./mapping.json) itself.

3. Read the JSON: `ok`, `issues[].kind` (`missing_persisted_property`, `unsupported_property_shape`, `contract_mismatch`, `invalid_input`), and advisory `warnings` (`repository_format`).

**Repair (best effort, once):** only for `missing_persisted_property` where the Savepoint for this append already has a usable value — one `notion-update-page` setting only those mapped properties. Never invent. Never repair on verification unavailable, `unsupported_property_shape`, `contract_mismatch`, or a warning; report a warning once. Then re-fetch and re-validate once; if that re-check fails, report **repair confirmation unknown** (with page id/url) and do not assert remaining gaps.

**Verification unavailable:** read-back failed or has no usable page id/url, Node.js is missing, the CLI file cannot run, or it exits 2. Report **verification unavailable** briefly; do not claim fields are missing, do not append `|| true`, do not repair, and do not install a runtime or alter the consumer repo.

**Fail-open:** the page already exists, so verification results never change the outcome from `success`. Report anything unresolved in one short chat line (with page id/url when known). Bounds: no second create, one repair, no retry loop, no edits to other rows; the CLI never calls Notion.

## Input

Provider-neutral Savepoint per router [schema.md](../savepoints/schema.md).

Optional tier-1 `destination` block from the router handoff:

```yaml
destination:
  data_source_id: "<NOTION_DATA_SOURCE_ID>"
```

## Configuration resolution

Resolve `destination.data_source_id` in three tiers (static; no dynamic discovery). Do **not** read Cursor User Rules or other host-specific rule stores.

| Tier | Source | When it applies |
| --- | --- | --- |
| 1 (highest) | Labelled `destination` in the router delegation context | Integration supplied it for this Savepoint |
| 2 | Consumer `.agents/savepoints-notion.yml` (optional) | Tier 1 **absent** |
| 3 | Package [defaults.yml](./defaults.yml) | Never supplies an id in `@2.x` |

Tier 2 shape (example: [`templates/consumer/savepoints-notion.yml.example`](../../templates/consumer/savepoints-notion.yml.example)):

```yaml
destination:
  data_source_id: "YOUR_NOTION_DATA_SOURCE_ID"
```

Order: tier 1 → tier 2 → tier 3; only the **resolved** value is authoritative.

**No valid destination** (none usable after applicable tiers, or the resolved id is empty/unusable for the data source): do **not** call Notion MCP. Return **`failure`** to the router, which reports briefly if useful and **continues primary work** (fail open).

**Tier 1 present but invalid** (empty, malformed UUID, or unusable): **fail open without fallback** to tier 2 or 3 — return **`failure`** without Notion MCP.

## Notion mapping

**Authoritative mapping:** [mapping.json](./mapping.json). Requiredness comes from [../savepoints/schema.json](../savepoints/schema.json) — keep no parallel required-field list.

Discover property names and types with `notion-fetch` on the target data source when mapping or when a create error indicates schema mismatch. Property names are case-sensitive; use the exact `property` names from `mapping.json`. Pass string fields as JavaScript strings (not arrays or rich-text objects) unless `notion-create-pages` or a create error requires another shape. Omit `session_id` / `Session ID` when unknown. Do **not** set system `Created`.

**Body:** Notion-flavored Markdown sections for non-empty `content` keys (`what_was_done`, `decisions_made`, `open_threads`, `errors`). Read the Notion markdown spec once when first composing a body. Do not duplicate `title` in the body — it lives in `Name`.

**Parent:** `{ "type": "data_source_id", "data_source_id": "<resolved destination.data_source_id>" }` (UUID with or without dashes).

## MCP write and confirmation

- Use the consumer’s authenticated **Notion MCP** (`notion-create-pages`).
- Set `allow_async: false` on **every** `notion-create-pages` call when the tool accepts it.
- If the tool rejects `allow_async: false` or lacks the parameter, retry **once** with its required/default async shape for the same Savepoint — not a second create. If the first call might have persisted (indeterminate write), do **not** create again; return `unconfirmed` and report in chat.
- When the accepted call is async: poll at most **two** follow-ups (e.g. `notion-get-async-task`), then stop. Never use a second create to “fix” an indeterminate first create.
- `notion-fetch` is for property mismatch or tool-required discovery and for the optional verification above — **not** a session preflight before create.

Return to the router:

```text
success | failure | unconfirmed
```

- `success` — persistence **confirmed** after a write was attempted and succeeded (synchronous create succeeded, or async polling reached a terminal succeeded state).
- `failure` — configuration prevented persistence (missing or invalid destination; no MCP write attempted), or a write was attempted and failed terminally (tool error, auth failure, terminal async failure with no confirmed row).
- `unconfirmed` — a write was attempted but confirmation remains uncertain (async unresolved after bounded polling, or the first create might have persisted and a duplicate create was refused).

Never imply persistence on queue alone or on an unconfirmed async task.

## Forbidden (provider)

- Event detection or trigger logic (router only)
- Modifying or deleting rows **other than** the single same-append repair above
- Retry queues, background workers, or duplicate create attempts when the first write may already exist
- Reading host User Rules or other undocumented stores for `destination.data_source_id`
