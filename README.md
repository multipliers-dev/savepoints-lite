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

Requires **Node.js 22+**. Use a committed lockfile and `npm ci` in CI for reproducible skill versions.

**npm install does not activate Savepoints.** Skills are not auto-registered with Cursor or Claude. Consumer activation (rules, `AGENTS.md` / `CLAUDE.md` pointing at the installed router path) ships in a **future adoption release** after the package is published to npm. This repository is publication-ready for docs and tarball layout; **Cursor/Claude behavioral integration is not verified yet.**

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

## Architecture and releases

- [docs/architecture.md](./docs/architecture.md) — router vs provider boundaries, Savepoint protocol, configuration precedence, append outcomes, v1 exclusions
- [docs/publishing.md](./docs/publishing.md) — operator release process, verify steps, provenance, postpublish checks

## Hub development (this repository)

| Command | Purpose |
| --- | --- |
| `npm test` | Package and skill invariant tests |
| `npm run verify` | Skill tree + `npm pack --dry-run` tarball checks |
| `npm run verify:git-hooks` | Confirm Husky shims are runnable in this checkout |

## License

MIT — see [package.json](./package.json).
