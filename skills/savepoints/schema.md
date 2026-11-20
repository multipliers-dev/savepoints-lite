# Savepoint protocol (provider-neutral)

Canonical contract for a single append-only session log record. Providers map these fields to their storage (Notion, Postgres, etc.); the router assembles Savepoints and delegates persistence.

## Machine-readable source of truth

**Requiredness and field inventory** for validation live in [schema.json](./schema.json) next to this file. Do **not** treat the YAML illustration below as a second required-field list — keep [schema.json](./schema.json) authoritative for validators and opt-in post-write checks. This document owns semantics, derivation, and append behaviour.

## Required and optional fields

Illustration (mirrors [schema.json](./schema.json)):

```yaml
title: string
repository: string
agent: string
session_id: optional string  # omit when unknown

content:
  what_was_done: optional string
  decisions_made: optional string
  open_threads: optional string
  errors: optional string
```

No additional required metadata beyond these fields.

## Example

```yaml
title: "multipliers-dev/portfolio — Implemented authentication"
repository: multipliers-dev/portfolio
agent: Cursor Agent

content:
  what_was_done: Added authentication middleware
  decisions_made: Selected JWT authentication
  open_threads: Token rotation
```

## Metadata derivation

| Field | Source |
| --- | --- |
| `title` | Short event label: `{repository} — {verb phrase}` |
| `repository` | `owner/repo` from `git remote get-url origin`, else workspace folder name |
| `agent` | Best available host label; never invent vendor names |
| `session_id` | Host-provided id only; do not fabricate |

## Content sections

Map to persisted body under **provider skill** formatting rules. Omit empty sections:

- `what_was_done`
- `decisions_made`
- `open_threads`
- `errors`

Each trigger produces **one new record** — no cross-event updates, deduplication, or batching.

## Append contract (behavioral)

After the router assembles a Savepoint, it delegates to the resolved provider skill. The provider returns an outcome:

```text
append(savepoint) → success | failure | unconfirmed
```

**Router:** invoke the provider skill with the Savepoint; do not perform provider MCP calls itself.

**Provider skill** must:

- Create a **new** record. Do **not** modify records from earlier appends.
- Preserve Savepoint content and metadata per provider mapping.
- Confirm persistence when the provider supports it (`success`); otherwise return `unconfirmed`.
- On `failure`, return `failure` so the router can report in chat without blocking primary work.
- **Same-append only (optional, when `validation.post_write` is enabled):** after a **confirmed** create, read back that record, run the package’s deterministic validator against persisted properties ([schema.json](./schema.json) + provider mapping), and attempt **at most one** repair of **that** record using values already on the Savepoint — never invent. Unresolved gaps, contract mismatches, or unavailable verification do **not** change a confirmed create to `failure`. Never create a second record to “fix” the first. When validation is disabled (default), skip this step.

**Per event, not per session:** Each work trigger → one Savepoint → one provider delegation. No session-wide latch after failure. **No retry queue.**
