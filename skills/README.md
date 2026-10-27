# Savepoints Lite skills

Shipped inside `@multipliers-dev/savepoints-lite` under `skills/`.

| Path | Role |
| --- | --- |
| [savepoints/SKILL.md](./savepoints/SKILL.md) | Router — events, Savepoint build, provider resolve, tier-1 `destination` handoff, delegate |
| [savepoints/schema.md](./savepoints/schema.md) | Canonical Savepoint contract |
| [savepoints/defaults.yml](./savepoints/defaults.yml) | `storage.provider` |
| [savepoints-notion/SKILL.md](./savepoints-notion/SKILL.md) | Notion MCP persistence (v1) — 3-tier `destination.data_source_id` resolution |
| [savepoints-notion/defaults.yml](./savepoints-notion/defaults.yml) | Packaged tier 3 (no `destination.data_source_id` in `@2.0.0`) |

Consumers install via npm and activate via root `AGENTS.md` (Claude Code: `CLAUDE.md` `@AGENTS.md`); see [docs/adopt.md](../docs/adopt.md). Optional Notion destination override: [templates/consumer/savepoints-notion.yml.example](../templates/consumer/savepoints-notion.yml.example). Skills are read from `node_modules/@multipliers-dev/savepoints-lite/skills/` — do not vendor copies.

## Privacy

Session Savepoints write narrative fields to the consumer’s configured Notion data source. The package does not ship credentials or maintainer database ids. Authentication is host-owned Notion MCP.

## Reliability

Instruction-only, same-turn append semantics; fail open without a retry queue; bounded async confirmation in the Notion provider only.
