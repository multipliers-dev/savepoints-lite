# @multipliers-dev/savepoints-lite

npm package for append-only **session Savepoints**: a router skill detects meaningful work, builds provider-neutral records, and delegates to provider skills. Version **2.1.0** ships a **Notion** provider that writes through the consumer’s existing **Notion MCP**. Default path is **instruction-only** create/confirm; optional deterministic post-write validation (`validation.post_write`) uses a self-contained in-package CLI under `skills/bin/` (works for standalone npm and marketplace vendor copies). Destination and optional validation preference are **explicit** — integration instruction context, optional consumer `.agents`, or packaged defaults (no maintainer database id in the tarball).

There is no custom MCP server, local spool, or Savepoints learning capture (`emit-learning`). For durable learnings and lifecycle hooks, see [multipliers-dev/savepoints](https://github.com/multipliers-dev/savepoints).

## What you get

| Piece | Role |
| --- | --- |
| Router skill | When to Savepoint, schema, provider selection, `validation.post_write` (integration → `.agents` → defaults), delegation, tier-1 `destination` handoff |
| Notion provider skill | Destination resolution (3 tiers), mapping via `mapping.json`, MCP create, bounded confirmation; optional same-append validate/repair |
| `schema.json` / `schema.md` + defaults YAML | Machine-readable requiredness + semantics; `storage.provider`; `validation.post_write: false` by default |
| `skills/bin/savepoints-lite-validate.mjs` | Optional deterministic property check (npm bin `savepoints-lite-validate`; no Notion credentials) |

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
- A **configured Notion Savepoints destination** (`data_source_id`) via [`.agents/savepoints-notion.yml`](./templates/consumer/savepoints-notion.yml.example) (typical standalone path), or via a **distribution layer** — an optional host outside this package that delivers skills and/or injects destination config at call time. The public example is [Cursor Team Marketplace](https://github.com/multipliers-dev/cursor-team-marketplace) `team-harness` (vendored skills + `/savepoints` wrapper). See [docs/adopt.md](./docs/adopt.md) § Notion destination.

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

## Documentation

- [docs/adopt.md](./docs/adopt.md) — installation, activation, destination tiers, verification
- [docs/architecture.md](./docs/architecture.md) — router vs provider boundaries, Savepoint protocol, configuration precedence, append outcomes

## License

MIT — see [LICENSE](./LICENSE).
