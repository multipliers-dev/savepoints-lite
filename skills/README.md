# Savepoints Lite skills

Shipped inside `@multipliers-dev/savepoints-lite` under `skills/`.

| Path | Role |
| --- | --- |
| [savepoints/SKILL.md](./savepoints/SKILL.md) | Router — events, Savepoint build, provider resolve, `validation.post_write` (integration → `.agents` → defaults), tier-1 `destination` handoff, delegate |
| [savepoints/schema.json](./savepoints/schema.json) | Machine-readable field requiredness (validators) |
| [savepoints/schema.md](./savepoints/schema.md) | Semantics, derivation, append behaviour |
| [savepoints/defaults.yml](./savepoints/defaults.yml) | `storage.provider`; `validation.post_write: false` |
| [savepoints-notion/SKILL.md](./savepoints-notion/SKILL.md) | Notion MCP persistence (v1) — 3-tier destination; optional post-write validate/repair |
| [savepoints-notion/mapping.json](./savepoints-notion/mapping.json) | Canonical Notion property mapping |
| [savepoints-notion/defaults.yml](./savepoints-notion/defaults.yml) | Packaged tier 3 (no `destination.data_source_id` in `@2.x`) |
| [bin/savepoints-lite-validate.mjs](./bin/savepoints-lite-validate.mjs) | Self-contained optional CLI (built into the published package; no consumer deps) |

Optional CLI: `skills/bin/savepoints-lite-validate.mjs` (also npm bin `savepoints-lite-validate`) — deterministic persisted-property check; no Notion credentials. Lives under `skills/` so marketplace vendor sync can copy it with the canonical skill tree.

Standalone consumers install via npm and activate via root `AGENTS.md` (Claude Code: `CLAUDE.md` `@AGENTS.md`); see [docs/adopt.md](../docs/adopt.md). Optional overrides: [templates/consumer/savepoints-notion.yml.example](../templates/consumer/savepoints-notion.yml.example), [templates/consumer/savepoints-lite.yml.example](../templates/consumer/savepoints-lite.yml.example). Do not hand-vendor skills into consumer repos for standalone use — [Cursor Team Marketplace](https://github.com/multipliers-dev/cursor-team-marketplace) commits a vendor copy under `plugins/team-harness/vendor/savepoints-lite/` for plugin install.

## Privacy

Session Savepoints write narrative fields to the consumer’s configured Notion data source. The package does not ship credentials or maintainer database ids. Authentication is host-owned Notion MCP.

## Reliability

Default path is instruction-only, same-turn append; fail open without a retry queue; bounded async confirmation in the Notion provider. Opt-in `validation.post_write` adds deterministic property checks after confirmed create.
