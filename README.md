# @multipliers-dev/savepoints-lite

Instruction-only npm package for append-only **session Savepoints**: a router skill detects meaningful work, builds provider-neutral records, and delegates to provider skills. Version **2.0.0** ships a **Notion** provider that writes through the consumer’s existing **Notion MCP**. Destination configuration is **explicit** — integration instruction context, optional consumer `.agents`, or unconfigured packaged defaults (no maintainer database id in the tarball).

There is no executable runtime, custom MCP server, local spool, or Savepoints learning capture (`emit-learning`). For durable learnings and lifecycle hooks, see [multipliers-dev/savepoints](https://github.com/multipliers-dev/savepoints).

## What you get

| Piece | Role |
| --- | --- |
| Router skill | When to Savepoint, schema, provider selection, delegation, tier-1 `destination` handoff |
| Notion provider skill | Destination resolution (3 tiers), Notion property mapping, MCP create, bounded confirmation |
| `schema.md` + defaults YAML | Protocol; router `storage.provider`; packaged Notion defaults without `data_source_id` |

Full skill index: [skills/README.md](./skills/README.md).

## Install

```bash
npm install @multipliers-dev/savepoints-lite --save-dev
```

Use a committed lockfile and `npm ci` in CI for reproducible skill versions.

Installing the package does **not** automatically activate Savepoints. Activation is a **committed Savepoints Lite section in root `AGENTS.md`** (runtime logging contract); Claude Code loads the same file via `CLAUDE.md` (`@AGENTS.md`). See the [adoption guide](./docs/adopt.md) for install, destination configuration, merge steps, and verification.

## Prerequisites

- **Node.js 22+**
- **Authenticated Notion MCP** in the agent host when using the default Notion provider
- A **configured Notion Savepoints destination** (`data_source_id`) via integration context, [`.agents/savepoints-notion.yml`](./templates/consumer/savepoints-notion.yml.example), or your distribution layer (e.g. team marketplace wrapper)

## Installed skill paths

After `npm install` or `npm ci`:

```text
node_modules/@multipliers-dev/savepoints-lite/skills/savepoints/SKILL.md
node_modules/@multipliers-dev/savepoints-lite/skills/savepoints-notion/SKILL.md
```

Agents must read skills from this install root. **Do not** vendor or copy skill files into the consumer repo.

## Privacy and reliability

- **Privacy:** Session Savepoints append rows to **your** Notion database (title, repository, agent, session id when known, and narrative sections). The package ships **no** credentials and **no** maintainer destination ids. Notion access is entirely through the host’s authenticated Notion MCP.
- **Reliability:** Best-effort, instruction-only appends; **fail open** on write failure (no retry queue). Bounded async confirmation only inside the provider skill. Missing or invalid destination → no MCP write; primary work continues.

## Maintenance

Public [npm](https://www.npmjs.com/package/@multipliers-dev/savepoints-lite) package and [GitHub](https://github.com/multipliers-dev/savepoints-lite) source. No implied SLA. Report issues via GitHub. Maintainer adoption history lives in the repository only ([adoption verification record on GitHub](https://github.com/multipliers-dev/savepoints-lite/blob/main/docs/adoption-verification-record.md) — not in the npm tarball).

## Documentation

- [docs/adopt.md](./docs/adopt.md) — installation, activation, destination tiers, verification
- [docs/architecture.md](./docs/architecture.md) — router vs provider boundaries, Savepoint protocol, configuration precedence, append outcomes

## License

MIT — see [LICENSE](./LICENSE).
