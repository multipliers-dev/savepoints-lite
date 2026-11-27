# @multipliers-dev/savepoints-lite

Append-only **session Savepoints** for AI coding agents: when meaningful work happens, agents record what was done, decisions, open threads, and errors into **your** Notion database.

Version **2.2.0** ships a router skill and a **Notion** provider that writes through the host’s authenticated **Notion MCP**. Default path is instruction-only create/confirm. Optional deterministic post-write validation (`validation.post_write`) can inspect persisted properties and attempt **at most one** repair of the newly created record.

There is no custom MCP server, local spool, or automated learning capture (`emit-learning`).

## How it works

```text
Agent → router skill → Notion provider skill → Notion MCP → your Notion database
```

1. The **router** decides when to Savepoint and builds a provider-neutral record.
2. The **Notion provider** resolves destination, maps fields, and creates a page via Notion MCP.
3. Optionally, when `validation.post_write` is enabled, a self-contained CLI checks persisted properties and may repair the new row once. Validation is **opt-in** and **fail-open** if the CLI or a compatible Node runtime is unavailable (the confirmed create still counts as success).

Installing the package or plugin does **not** by itself activate agent logging. Activation is a separate step (User Rules for marketplace, or root `AGENTS.md` for standalone npm).

## Design principle: deterministic capabilities, flexible orchestration

Savepoints Lite separates invocation and verification into independently usable capabilities. The orchestration between them is intentionally left to the consumer.

Agents can invoke verification at their discretion, while adopters requiring stronger guarantees can integrate their own hooks, automation or host-specific lifecycle mechanisms.

Savepoints Lite is responsible for making its capabilities discoverable, intuitive, reliable and portable. It is not responsible for enforcing when or how frequently those capabilities are invoked.

This separation allows consumers to choose their own reliability, execution and cost trade-offs without introducing vendor-specific dependencies into the core implementation.

## Adoption paths

Two supported ways to get the skills into the agent host:

### Cursor Team Marketplace

Best when you already use (or can install) the multipliers-dev **team-harness** plugin.

1. Install or refresh **team-harness** **1.17.0+** (ships Savepoints Lite **`@2.2.0`**) from [Cursor Team Marketplace](https://github.com/multipliers-dev/cursor-team-marketplace).
2. Configure session logging and the Notion destination in Cursor **User Rules** (engineering invariants).
3. Use your existing authenticated **Notion MCP**.

No `@multipliers-dev/savepoints-lite` npm dependency is required in consumer repositories. Ordinary marketplace Notion MCP persistence does **not** require Node.js in the consumer repo or host runtime.

Full setup: [marketplace savepoints-integration.md](https://github.com/multipliers-dev/cursor-team-marketplace/blob/main/plugins/team-harness/docs/savepoints-integration.md). Overview in this repo: [docs/adopt.md](./docs/adopt.md) § Cursor Team Marketplace.

### Standalone npm

Best when you want a pinned package install in a specific repository.

1. Install and pin `@multipliers-dev/savepoints-lite` (exact semver + lockfile; use `npm ci` in CI).
2. Activate logging by merging the session-log contract into root `AGENTS.md` (and `CLAUDE.md` `@AGENTS.md` where applicable).
3. Configure [`.agents/savepoints-notion.yml`](./templates/consumer/savepoints-notion.yml.example) (or an integration-supplied destination).
4. Use authenticated **Notion MCP**.

Requires **Node.js 22+** for package install and for optional executable validation. Full setup: [docs/adopt.md](./docs/adopt.md).

```bash
npm install @multipliers-dev/savepoints-lite@2.2.0 --save-dev --save-exact
```

## What you get

| Piece | Role |
| --- | --- |
| Router skill | When to Savepoint, schema, provider selection, `validation.post_write`, delegation, tier-1 `destination` handoff |
| Notion provider skill | Destination resolution (3 tiers), mapping via `mapping.json`, MCP create, bounded confirmation; optional same-append validate/repair |
| `schema.json` / `schema.md` + defaults YAML | Machine-readable requiredness + semantics; `storage.provider`; `validation.post_write: false` by default |
| `skills/bin/savepoints-lite-validate.mjs` | Optional deterministic property check (npm bin `savepoints-lite-validate`; no Notion credentials) |

Full skill index: [skills/README.md](./skills/README.md).

After standalone install, skills live under `node_modules/@multipliers-dev/savepoints-lite/skills/`. Marketplace consumers load the vendored package-equivalent tree from the plugin — do **not** hand-copy skill files into consumer repos.

## Runtime notes

| Concern | Standalone npm | Marketplace (team-harness) |
| --- | --- | --- |
| Skill delivery | Pinned npm package under `node_modules` | Vendored copy under the installed plugin |
| Activation | Root `AGENTS.md` session-log section | Cursor User Rules + `/savepoints` wrapper |
| Notion persistence | Authenticated Notion MCP | Same |
| Node.js 22+ | Required for install; required when opt-in validation runs | Not required for ordinary MCP create/confirm; required only if validation runs |
| Validation | Opt-in, fail-open | Same |

## Privacy and reliability

- **Privacy:** Session Savepoints append rows to **your** Notion database (title, repository, agent, session id when known, and narrative sections). The package ships **no** credentials and **no** maintainer destination ids. Notion access is entirely through the host’s authenticated Notion MCP.
- **Reliability:** Best-effort, instruction-only appends; **fail open** on write failure (no retry queue). Bounded async confirmation only inside the provider skill. Missing or invalid destination → no MCP write; primary work continues.

## Documentation

- [docs/adopt.md](./docs/adopt.md) — installation, activation, destination tiers, verification
- [docs/architecture.md](./docs/architecture.md) — router vs provider boundaries, Savepoint protocol, configuration precedence, append outcomes

## License

MIT — see [LICENSE](./LICENSE).
