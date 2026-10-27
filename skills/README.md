# Savepoints Lite skills

Shipped inside `@multipliers-dev/savepoints-lite` under `skills/`.

| Path | Role |
| --- | --- |
| [savepoints/SKILL.md](./savepoints/SKILL.md) | Router — events, Savepoint build, provider resolve, delegate |
| [savepoints/schema.md](./savepoints/schema.md) | Canonical Savepoint contract |
| [savepoints/defaults.yml](./savepoints/defaults.yml) | `storage.provider` |
| [savepoints-notion/SKILL.md](./savepoints-notion/SKILL.md) | Notion MCP persistence (v1) |
| [savepoints-notion/defaults.yml](./savepoints-notion/defaults.yml) | `destination.data_source_id` |

Consumers install via npm and activate via root `AGENTS.md` (Claude Code: `CLAUDE.md` `@AGENTS.md`); see [docs/adopt.md](../docs/adopt.md). Skills are read from `node_modules/@multipliers-dev/savepoints-lite/skills/` — do not vendor copies.
