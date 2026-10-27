# @multipliers-dev/savepoints-lite

Instruction-only npm package for append-only **session Savepoints**: a router skill detects meaningful work, builds provider-neutral records, and delegates to provider skills. Version 1 ships a **Notion** provider that writes through the consumer’s existing **Notion MCP**.

There is no executable runtime, custom MCP server, local spool, or Savepoints learning capture (`emit-learning`). For durable learnings and lifecycle hooks, see [multipliers-dev/savepoints](https://github.com/multipliers-dev/savepoints).

## What you get

| Piece | Role |
| --- | --- |
| Router skill | When to Savepoint, schema, provider selection, delegation |
| Notion provider skill | Notion property mapping, MCP create, bounded confirmation |
| `schema.md` + defaults YAML | Protocol and shared database defaults |

Full skill index: [skills/README.md](./skills/README.md).

## Install

```bash
npm install @multipliers-dev/savepoints-lite --save-dev
```

Use a committed lockfile and `npm ci` in CI for reproducible skill versions.

Installing the package does **not** automatically activate Savepoints. Activation is a **committed Savepoints Lite section in root `AGENTS.md`** (runtime logging contract); Claude Code loads the same file via `CLAUDE.md` (`@AGENTS.md`). See the [adoption guide](./docs/adopt.md) for install, merge steps, and verification.

## Prerequisites

- **Node.js 22+**
- **Authenticated Notion MCP** in the agent host when using the default Notion provider

## Installed skill paths

After `npm install` or `npm ci`:

```text
node_modules/@multipliers-dev/savepoints-lite/skills/savepoints/SKILL.md
node_modules/@multipliers-dev/savepoints-lite/skills/savepoints-notion/SKILL.md
```

Agents must read skills from this install root. **Do not** vendor or copy skill files into the consumer repo.

## Documentation

- [docs/adopt.md](./docs/adopt.md) — installation, `AGENTS.md` activation, Claude import, verification
- [docs/architecture.md](./docs/architecture.md) — router vs provider boundaries, Savepoint protocol, configuration precedence, append outcomes, v1 exclusions

## License

MIT — see [LICENSE](./LICENSE).
