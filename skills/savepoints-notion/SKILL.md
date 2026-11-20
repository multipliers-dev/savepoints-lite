---
name: savepoints-notion
description: Notion provider for Savepoints — map Savepoint to Notion properties and body, write via Notion MCP, bounded async confirmation.
---

# Savepoints — Notion provider

Accepts a Savepoint from the **router** (`skills/savepoints/SKILL.md`). Does **not** decide when Savepoints are created.

**Installed path (consumer):** `node_modules/@multipliers-dev/savepoints-lite/skills/savepoints-notion/SKILL.md`

## Input

Provider-neutral Savepoint per router [schema.md](../savepoints/schema.md).

Optional tier-1 `destination` block from the router handoff (integration instruction context):

```yaml
destination:
  data_source_id: "<NOTION_DATA_SOURCE_ID>"
```

## Configuration resolution

Resolve `destination.data_source_id` in **three** tiers (static; no dynamic discovery). Do **not** read Cursor User Rules or other host-specific rule stores.

| Tier | Source | When it applies |
| --- | --- | --- |
| 1 (highest) | Labelled `destination` in the **router delegation / instruction context** | Integration supplied a `destination` block for this Savepoint |
| 2 | Consumer `.agents/savepoints-notion.yml` (optional) | Tier 1 **absent** for this delegation |
| 3 | Package [defaults.yml](./defaults.yml) next to this skill under `node_modules` | Never supplies an id in `@2.0.0` — file retained for relative references only |

**Tier 2 shape** (overrides packaged defaults when tier 1 is absent):

```yaml
destination:
  data_source_id: "YOUR_NOTION_DATA_SOURCE_ID"
```

Example consumer file: [`templates/consumer/savepoints-notion.yml.example`](../../templates/consumer/savepoints-notion.yml.example).

**Resolution order:** tier 1 → tier 2 → tier 3. Only the **resolved** value after applicable tiers is authoritative.

**Missing valid destination** (no usable `data_source_id` after applicable tiers): do **not** call Notion MCP. Return **`failure`** to the router (configuration prevented persistence — not a confirmed write). The router reports briefly if useful and **continues primary work** (fail open).

**Tier 1 present but invalid** (empty, malformed UUID, or otherwise unusable): **fail open without fallback** to tier 2 or tier 3 — do not silently use `.agents` or packaged defaults. Return **`failure`** without Notion MCP.

**Misconfiguration (after resolution):** when a Savepoint was requested for persistence but cannot be written because configuration is invalid — resolved `destination.data_source_id` empty, missing, or unusable for the target data source, or tier 1 invalid with no fallback — report briefly in chat, return **`failure`**, do not call Notion MCP.

## Notion mapping

**Authoritative mapping:** [mapping.json](./mapping.json) next to this skill (same install). Requiredness for validation comes from [../savepoints/schema.json](../savepoints/schema.json) — do **not** maintain a parallel required-field list.

Discover property names and types with `notion-fetch` on the target data source when mapping or when a create error indicates schema mismatch. Property names are case-sensitive.

Use exact `property` names from `mapping.json` in the `properties` map. Pass Savepoint string fields as JavaScript strings (not arrays or rich-text objects) unless `notion-create-pages` or a create error explicitly requires another shape for this data source. Omit `session_id` / `Session ID` when unknown. Do **not** set system `Created`.

**Body:** Notion-flavored Markdown sections for non-empty `content` keys (`what_was_done`, `decisions_made`, `open_threads`, `errors`). Read the Notion markdown spec once when first composing page body. Do not duplicate `title` in page `content` — the title lives in `Name`.

**Parent:** `parent`: `{ "type": "data_source_id", "data_source_id": "<resolved destination.data_source_id>" }` (UUID with or without dashes).

## MCP write and confirmation

- Use the consumer’s authenticated **Notion MCP** (`notion-create-pages`).
- **Require synchronous create:** set `allow_async: false` on **every** `notion-create-pages` call when the tool accepts that parameter.
- **Async fallback only:** if the tool rejects `allow_async: false` or does not support the parameter, retry **once** with the tool’s required/default async shape for the same Savepoint — not a second create. If the first call might have persisted (indeterminate write), do **not** issue another create; return `unconfirmed` and report in chat.
- Distinguish **parameter retry** (unsupported `allow_async: false` → one async-shaped retry of the same logical write) from **write confirmation** (polling an async task). Never use a second create to “fix” an indeterminate first create.
- When the accepted call is async: poll at most **two** follow-ups (e.g. `notion-get-async-task` or equivalent), then stop.
- Use `notion-fetch` for property mismatch or tool-required discovery, and for **same-append** post-write verification below — **not** as a session preflight before create.

## Post-write verification and repair (optional)

**When enabled:** packaged [../savepoints/defaults.yml](../savepoints/defaults.yml) sets `validation.post_write: false`. Consumer `.agents/savepoints-lite.yml` may set `validation.post_write: true` (see [../../templates/consumer/savepoints-lite.yml.example](../../templates/consumer/savepoints-lite.yml.example)). Resolve like `storage.provider`: defaults, then consumer override.

**When disabled (default):** skip this entire section — instruction-only create/confirm; do **not** invoke the validator CLI.

**When enabled**, run **only** after create outcome is confirmed `success` (skip for `failure` / `unconfirmed`). Fail-open: the page already exists; verification issues are reported and do **not** change the outcome to `failure`. Outcomes remain `success | failure | unconfirmed` only. Complete these steps **before** returning to the router.

**Roles:** this provider owns MCP create/read/update; the optional CLI owns deterministic property checks; the agent interprets CLI output, performs at most one repair, and reports.

1. **Read back** the created page once (`notion-fetch` by page id/url from the create result when available).
   - If read-back fails or no usable page id/url is available: report **verification unavailable** (include page id/url when known); do **not** claim fields are missing; do **not** run the CLI or repair; return `success`.
2. **Validate (CLI):** from the package install root, run `savepoints-lite-validate` (bin of `@multipliers-dev/savepoints-lite`) with `--package-root` pointing at that install and JSON on stdin or `--input`:
   ```json
   { "persisted": { "<Notion property>": "<value>", "...": "..." }, "page_id": "<optional>" }
   ```
   Pass the fetched property map (not the Savepoint YAML). The CLI loads [../savepoints/schema.json](../savepoints/schema.json) and [mapping.json](./mapping.json) — do not re-derive required fields in prose.
   - Interpret structured `issues[].kind`: `missing_persisted_property`, `contract_mismatch`, `invalid_input`.
   - On CLI usage/runtime failure (exit 2 / cannot run): report **verification unavailable**; do not invent diagnostics; return `success`.
3. **Repair (best effort, once):** only for CLI `missing_persisted_property` issues where the Savepoint for this append already has a usable value. One `notion-update-page` setting **only** those mapped properties from that Savepoint. Never invent. Never repair on verification unavailable or `contract_mismatch`. If that update fails terminally, report it (with page id/url when known) without retrying and without changing the confirmed create outcome from `success`.
4. **Re-verify** with one fetch + one CLI run after a repair attempt that appeared to succeed.
   - If post-repair read-back or CLI fails: report **repair confirmation unknown** (with page id/url when known); do **not** assert remaining gaps as verified missing; return `success`.
   - If re-check succeeds with issues: report remaining kinds; if clean, finish quietly.
5. **Report** unresolved issues in one short chat line (include page id/url when known), using precise labels from CLI kinds plus **verification unavailable** / **repair confirmation unknown**. Still return `success` for the confirmed create.

**Bounds:** no second create; single repair attempt; no retry loop; do not modify other Savepoint rows; validator never calls Notion.

Return to the router:

```text
success | failure | unconfirmed
```

- `success` — persistence **confirmed** only after a write was attempted and succeeded (synchronous create succeeded, or async polling reached a terminal succeeded state).
- `failure` — configuration prevented persistence (missing or invalid destination; no MCP write attempted), or a write was attempted and failed terminally (tool error, auth failure, terminal async failure with no confirmed row).
- `unconfirmed` — a write was attempted but confirmation remains uncertain (async still unresolved after bounded polling, or the first create might have persisted and a duplicate create was refused).

Never imply persistence on queue alone or on an unconfirmed async task.

## Forbidden (provider)

- Event detection or trigger logic (router only)
- Modifying or deleting Savepoint rows **other than** the single same-append repair above
- Retry queues, background workers, or duplicate create attempts when the first write may already exist
- Reading host User Rules or other undocumented stores for `destination.data_source_id`
