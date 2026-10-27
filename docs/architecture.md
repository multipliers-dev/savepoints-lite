# Savepoints Lite architecture

`@multipliers-dev/savepoints-lite` is an **instruction-only** npm package: router and provider **skills** (Markdown) plus default YAML. There is no executable persistence runtime, custom MCP server, or local spool.

Contrast with [multipliers-dev/savepoints](https://github.com/multipliers-dev/savepoints): full Savepoints optimizes **durable learnings** (five-check rubric, lifecycle hooks, Postgres). Lite optimizes **activity and session narrative** with immediate appends and no lifecycle automation.

```mermaid
flowchart TB
    subgraph Consumer["Consumer repository"]
        Activation["AGENTS.md (+ CLAUDE.md import)"]
        Package["npm dependency"]
        AgentsYml[".agents/savepoints-notion.yml (optional)"]
    end

    subgraph Integration["Integration / marketplace layer (optional)"]
        Tier1["destination in instruction context"]
    end

    subgraph Installed["Installed package (node_modules)"]
        direction LR
        Schema["Schema + defaults"]
        Router["Savepoints router"]
        Provider["Notion provider"]
    end

    subgraph External["External services"]
        MCP["Authenticated Notion MCP"]
        Database["Consumer Notion Savepoints database"]
    end

    Package -.->|"Installs"| Installed
    Integration -->|"Tier 1 handoff"| Router
    Activation -->|"Loads skill"| Router
    AgentsYml -.->|"Tier 2 when tier 1 absent"| Provider
    Schema -.->|"Protocol + config"| Router
    Router -->|"Delegates append + destination"| Provider
    Provider -->|"notion-create-pages"| MCP
    MCP -->|"Creates record"| Database
```

**Distribution** (dashed): one install step places packaged skills and defaults under `node_modules` — install alone does not activate Savepoints.

**Execution** (solid): consumer-owned agent instructions load the installed router; the router decides when to create Savepoints and assembles provider-neutral records; the configured provider persists through the consumer’s existing Notion MCP when a valid destination is resolved.

## Layer model

| Layer | Responsibility |
| --- | --- |
| **Consumer activation** | Root `AGENTS.md` session-log section; Claude Code via `CLAUDE.md` (`@AGENTS.md`). [`docs/adopt.md`](./adopt.md). |
| **Integration (optional)** | Tier-1 `destination.data_source_id` in instruction/delegation context — marketplace wrappers, CI agents, etc. |
| **Router** [`skills/savepoints/SKILL.md`](../skills/savepoints/SKILL.md) | Event detection, Savepoint assembly, `storage.provider`, carry tier-1 `destination` unchanged, load provider skill, handle outcomes. **No** Notion MCP. |
| **Provider** [`skills/savepoints-notion/SKILL.md`](../skills/savepoints-notion/SKILL.md) | Resolve destination (3 tiers), map Savepoint → Notion, MCP write, bounded confirmation. **Does not** decide when to Savepoint or read User Rules. |
| **Distribution** | npm package only — consumers must not vendor skills. |
| **Runtime** | None — persistence uses the consumer’s **Notion MCP**. |

**Design principle:** Router owns **what** and **when**; static config and integration context select **where**; provider skills own **how** to persist.

## Savepoint protocol

Canonical field contract: [`skills/savepoints/schema.md`](../skills/savepoints/schema.md).

Each meaningful work trigger produces **one new record** — no updates, dedupe, or batching across events.

## Configuration precedence

Static resolution only — no environment variables in v2.

**Router** — `storage.provider`:

| Precedence | Location | Overrides |
| --- | --- | --- |
| 1 (highest) | Consumer `.agents/savepoints-lite.yml` (optional) | `storage.provider` only |
| 2 (default) | Package [`skills/savepoints/defaults.yml`](../skills/savepoints/defaults.yml) | `notion` in v1 |

**Notion provider** — `destination.data_source_id`:

| Tier | Location | When |
| --- | --- | --- |
| 1 | Integration **instruction/delegation context** (`destination` YAML block) | Supplied for this delegation |
| 2 | Consumer `.agents/savepoints-notion.yml` (optional) | Tier 1 absent |
| 3 | Package [`skills/savepoints-notion/defaults.yml`](../skills/savepoints-notion/defaults.yml) | No id in `@2.0.0` |

**Fail open:** no valid id after applicable tiers → no MCP write. **Tier 1 invalid:** fail open without tier 2/3 fallback.

Unsupported or missing `storage.provider` after router resolution → report misconfiguration; do not guess.

Auth stays with each provider’s MCP (Notion MCP for v1).

## Append contract (behavioral)

```text
append(savepoint) → success | failure | unconfirmed
```

- **Same turn:** triggers require a Savepoint in the **same agent turn** as the work event.
- **Per event:** one trigger → one Savepoint → one delegation. **No retry queue.**

### Notion persistence (v1)

Authoritative behavior: [`skills/savepoints-notion/SKILL.md`](../skills/savepoints-notion/SKILL.md).

- **Synchronous-first:** `allow_async: false` when supported.
- **Bounded async:** at most **two** poll follow-ups, then `unconfirmed`.
- **Three outcomes:** `success`, `failure`, `unconfirmed` — do not claim persistence on `unconfirmed`.

### Failure handling and anti-loop

On `failure` or `unconfirmed`: one-sentence report, resume primary work. A **failed append** is **not** a new work event.

## Privacy and reliability

- **Privacy:** Append-only rows in the consumer’s Notion data source (metadata + narrative sections). No credentials or maintainer destination ids in the package.
- **Reliability:** Best-effort, instruction-only; fail open; no background workers or local spool.

## Maintenance

Public npm + GitHub; no implied SLA. Maintainer verification history: [adoption verification record on GitHub](https://github.com/multipliers-dev/savepoints-lite/blob/main/docs/adoption-verification-record.md) (repository only, not in tarball).

## v1 / v2 exclusions

Out of scope:

- Read/recovery flows, queues, `emit-learning`, custom MCP server, local spool
- `savepoints-postgres` provider (future)
- Host User Rules as configuration source

Manual checklist: [`skills/savepoints/verification.md`](../skills/savepoints/verification.md).

## Skill index

[`skills/README.md`](../skills/README.md).
