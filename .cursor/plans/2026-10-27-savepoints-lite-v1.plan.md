---
name: Savepoints Lite v1
overview: npm-first instruction package (@multipliers-dev/savepoints-lite) shipping router + Notion provider skills; consumers install via npm, activate once (Cursor rule / CLAUDE.md / AGENTS.md), delegate to existing Notion MCP — no marketplace, no runtime, no custom MCP server.
todos:
  - id: protocol-core
    content: "PR 1: @multipliers-dev/savepoints-lite package (skills, defaults, schema), npm verify script, hub AGENTS.md/CI/pre-commit without typecheck — no adopt.md link, no Savepoints activation"
    status: pending
  - id: adopt-and-verify
    content: "PR 2 (after operator npm publish): docs/adopt.md, fixtures/consumer/, templates/consumer/, activation, manual Cursor/Claude verification via pinned registry dependency"
    status: pending
  - id: plan-closure
    content: "Docs-only PR: verify vs plan, record deviations, # Shipped, archive plan"
    status: pending
isProject: false
---

# Savepoints Lite v1 — implementation plan

## Goals and non-goals

**In scope:** Append-only session logging via an **npm-distributed** router skill ([`skills/savepoints/SKILL.md`](skills/savepoints/SKILL.md)) that delegates to provider skills (`savepoints-notion` in v1), using the consumer’s **existing Notion MCP** — instruction-only, no executable persistence runtime.

**Out of scope:** Everything in the product brief (read/recovery, queues, Savepoints capture hooks, custom MCP server, local spool, summarization, metrics) and **§ Scope exclusions** below. **Deferred:** `savepoints-postgres`, connection management, schema migrations, dynamic provider discovery, multi-provider writes, Cursor marketplace packaging.

**Contrast with [`multipliers-dev/savepoints`](https://github.com/multipliers-dev/savepoints):** Full Savepoints optimizes for *durable learnings* (five-check rubric, `emit-learning`, lifecycle hooks, Postgres submit workers). Lite optimizes for *activity/session narrative* with **immediate appends** and **no lifecycle/host automation** — with a **router → provider skill** split so *what* to record, *where* (provider selection), and *how* (MCP writes) stay separated.

---

## Architecture

```mermaid
flowchart TB
  subgraph consumer [Consumer repository]
    NpmDep["npm dependency @multipliers-dev/savepoints-lite"]
    Activation["One-time activation rule / CLAUDE.md / AGENTS.md"]
    NodeModules["node_modules/.../skills/"]
  end
  subgraph hosts [Agent hosts]
    Cursor["Cursor"]
    Claude["Claude Code"]
  end
  subgraph pkg [Published package contents]
    RouterSkill["savepoints/SKILL.md router"]
    Schema["schema.md"]
    RouterDefaults["defaults.yml"]
    NotionSkill["savepoints-notion/SKILL.md"]
    NotionDefaults["provider defaults.yml"]
  end
  subgraph external [External]
    NotionMCP["Notion MCP authenticated"]
    NotionDB["Shared Savepoints database"]
  end
  NpmDep --> NodeModules
  NodeModules --> pkg
  Cursor --> Activation
  Claude --> Activation
  Activation --> RouterSkill
  RouterSkill --> Schema
  RouterSkill --> RouterDefaults
  RouterSkill -->|"storage.provider"| NotionSkill
  NotionSkill --> NotionDefaults
  NotionSkill --> NotionMCP
  NotionMCP --> NotionDB
```

| Layer | v1 responsibility |
| --- | --- |
| **Activation** | Triggers, “read **router** skill,” fail-open |
| **Router** [`skills/savepoints/`](skills/savepoints/) | Event detection, build Savepoint, read `storage.provider`, **load and invoke** matching provider skill, handle `success` / `failure` / `unconfirmed` — **no** Notion properties or SQL |
| **Provider** [`skills/savepoints-notion/`](skills/savepoints-notion/) | Map Savepoint → Notion, MCP write, bounded async confirmation, return outcome — **does not** decide when to Savepoint |
| **Future** `skills/savepoints-postgres/` | Postgres MCP mapping only (not shipped in v1) |
| **Distribution** | [`@multipliers-dev/savepoints-lite`](package.json) npm package — **no** Cursor marketplace; consumers **must not** vendor/copy skills |
| **Runtime** | None — package ships instructions and defaults only |

**Design principle:** Router owns **what** and **when**; provider selection is static config; provider skills own **how** to persist. Consumer activation points agents at the **installed** router `SKILL.md` under `node_modules`. Do **not** set `disable-model-invocation: true` on router or v1 provider skills.

**Installed paths (consumer):**

```text
node_modules/@multipliers-dev/savepoints-lite/skills/savepoints/SKILL.md
node_modules/@multipliers-dev/savepoints-lite/skills/savepoints-notion/SKILL.md
```

Router and provider skills must reference **package-relative** paths from that install root. **`node_modules` must exist** in the agent execution environment (after `npm install` / `npm ci`).

**npm does not register skills** with Cursor or Claude native discovery — activation templates (slice 2) tell agents **when** to read the router and **where** the installed file lives.

**Provider resolution (v1):** `storage.provider: notion` → load provider skill from the same package install. Unknown or missing provider → report misconfiguration; **no** dynamic discovery or fallback provider.

**Caveat:** Routing is **instruction-based** — behavioral verification (slice 2) must confirm delegation to `savepoints-notion`, reads from `node_modules`, and Notion MCP writes.

---

## Savepoint protocol (provider-neutral)

Document in [`schema.md`](skills/savepoints/schema.md); router [`SKILL.md`](skills/savepoints/SKILL.md) references it. Independent of Notion, Postgres, or any single MCP.

### Canonical Savepoint fields

Provider-neutral contract ([`schema.md`](skills/savepoints/schema.md)). No additional required metadata beyond these fields:

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

Example:

```yaml
title: "multipliers-dev/portfolio — Implemented authentication"
repository: multipliers-dev/portfolio
agent: Cursor Agent

content:
  what_was_done: Added authentication middleware
  decisions_made: Selected JWT authentication
  open_threads: Token rotation
```

### Metadata derivation (protocol)

| Field | Source |
| --- | --- |
| `title` | Short event label: `{repository} — {verb phrase}` |
| `repository` | `owner/repo` from `git remote get-url origin`, else workspace folder name |
| `agent` | Best available host label; never invent vendor names |
| `session_id` | Host-provided id only; do not fabricate |

### Content sections (protocol)

Map to persisted body under **provider skill** formatting rules. Omit empty sections:

- `what_was_done`
- `decisions_made`
- `open_threads`
- `errors`

Each trigger produces **one new record** — no updates, dedupe, or batching.

### `append` contract (behavioral, not code)

After the router assembles a Savepoint, it **delegates** to the resolved provider skill. The provider returns an outcome; the router surfaces it to the user when needed:

```text
append(savepoint) → success | failure | unconfirmed
```

**Router:** invoke provider skill with the Savepoint; do not perform MCP calls itself.

**Provider skill** must:

- Create a **new** record without modifying previous records.
- Preserve Savepoint content and metadata per provider mapping.
- Confirm persistence when the provider supports it (`success`); otherwise return `unconfirmed`.
- On `failure`, return `failure` so the router can report in chat without blocking primary work.

**Per event, not per session:** Each work trigger → one Savepoint → one provider delegation. No session-wide latch after failure. **No retry queue.**

---

## Router and provider skills

### Package layout (published under `skills/`)

Shipped inside `@multipliers-dev/savepoints-lite` (see **npm distribution**):

```
skills/
├── savepoints/                    # Router
│   ├── SKILL.md
│   ├── defaults.yml               # storage.provider only
│   └── schema.md
├── savepoints-notion/             # Provider (v1)
│   ├── SKILL.md
│   └── defaults.yml               # destination.data_source_id
└── README.md
```

**Future:** `skills/savepoints-postgres/` — not in v1. Add only a new provider skill + defaults; router `schema.md` unchanged.

### Router [`skills/savepoints/SKILL.md`](skills/savepoints/SKILL.md)

Responsible for:

1. Recognizing meaningful work events (trigger contract below).  
2. Building a provider-neutral Savepoint per [`schema.md`](skills/savepoints/schema.md).  
3. Reading `storage.provider` from router [`defaults.yml`](skills/savepoints/defaults.yml).  
4. **Loading the matching provider skill** from the **same npm package install** (e.g. `notion` → `../savepoints-notion/SKILL.md` relative to router skill path) and delegating persistence.  
5. Handling the provider outcome (`success` / `failure` / `unconfirmed`) and anti-loop failure reporting.

The router **must not** document Notion page properties, Postgres table schemas, or MCP tool parameters.

### Provider [`skills/savepoints-notion/SKILL.md`](skills/savepoints-notion/SKILL.md)

Responsible for:

- Accepting a Savepoint from the router (does **not** decide when Savepoints are created).  
- Loading provider [`defaults.yml`](skills/savepoints-notion/defaults.yml) for destination.  
- Translating the Savepoint into Notion properties and page body.  
- Calling Notion MCP (`notion-create-pages`, etc.).  
- Bounded async confirmation (`allow_async: false` by default; at most **two** poll follow-ups).  
- Returning `success` | `failure` | `unconfirmed` to the router.

| Topic | Contents |
| --- | --- |
| Destination | `parent.data_source_id` = `destination.data_source_id` from provider defaults |
| Property mapping | `title` → `Name`; `repository` → `Repository`; `agent` → `Agent`; `session_id` → `Session ID` (omit when unknown) |
| Body | Notion-flavored Markdown sections; read markdown spec once when first composing |
| Schema fetch | `notion-fetch` **only** on property mismatch or tool-required discovery — not a session preflight |

Shared Notion database id for humans: `05e4c804-1380-4ea2-8eb6-30027aa05fe4`. Do **not** change Notion schema unless fetch proves incompatibility.

### Configuration (split)

**Router** ([`skills/savepoints/defaults.yml`](skills/savepoints/defaults.yml)):

```yaml
storage:
  provider: notion
```

**Notion provider** ([`skills/savepoints-notion/defaults.yml`](skills/savepoints-notion/defaults.yml)):

```yaml
destination:
  data_source_id: "822cbc89-7c89-4863-af3a-2fe0cd8ab56e"
```

**Resolution order** (static; no dynamic discovery):

| Precedence | Location | Overrides |
| --- | --- | --- |
| 1 (highest) | Consumer repo [`.agents/savepoints-lite.yml`](.agents/savepoints-lite.yml) | `storage.provider` only |
| 2 | Consumer repo [`.agents/savepoints-notion.yml`](.agents/savepoints-notion.yml) | Notion `destination.data_source_id` only |
| 3 (default) | Package [`skills/savepoints/defaults.yml`](skills/savepoints/defaults.yml) and [`skills/savepoints-notion/defaults.yml`](skills/savepoints-notion/defaults.yml) under `node_modules` | Shared Savepoints database |

Consumers **need not** copy default YAML — install npm package only unless overriding provider or destination. Hub repo does not commit live `.agents/*.yml` (templates ship in slice 2).

**Unsupported `storage.provider`:** report misconfiguration; do not guess or fall back.

No env vars for v1. Auth remains with each provider’s MCP (Notion MCP for v1).

### Future: `savepoints-postgres`

New provider skill + `defaults.yml` only; router provider map gains `postgres` → `savepoints-postgres/SKILL.md`. Router `schema.md` and event logic should not require changes.

### Trigger contract (immediate writes)

The skill must require a Savepoint **in the same turn** when any of these occur:

- A coherent unit of work completes (feature slice, fix, doc pass, verification run).  
- A significant decision is made (architecture, scope, tradeoff).  
- The agent switches tasks or user changes direction.  
- An error is hit or resolved **in the primary task** (tooling, build, test, user-visible failure) — record under **Errors** in the Savepoint for that work event.

**Explicit anti-patterns:** session-end only, “remember to savepoint at the end,” debouncing, consolidating multiple events into one page.

### Failure behavior

On create error or unconfirmed async: one-sentence user-visible report (tool name + error summary, or “queued — not confirmed”), **no retry queue**, resume primary task. **Do not** disable subsequent Savepoint attempts in the same session.

**Anti-loop (failed Savepoint writes):** A **failed `append`** (provider MCP unavailable, auth error, create error, or unconfirmed async) is **not** an error event that triggers another Savepoint. Report the persistence failure in chat and continue the primary task. Do **not** chain “write failed → new Savepoint to log the failure → write failed again.” Only a **later, independent** work trigger may attempt another `append`.

---

## Skill structure

See **Router and provider skills** above. Summary:

| Path | Role |
| --- | --- |
| [`skills/savepoints/SKILL.md`](skills/savepoints/SKILL.md) | Router — events, Savepoint build, provider resolve, delegate |
| [`skills/savepoints/schema.md`](skills/savepoints/schema.md) | Canonical Savepoint contract |
| [`skills/savepoints/defaults.yml`](skills/savepoints/defaults.yml) | `storage.provider` |
| [`skills/savepoints-notion/SKILL.md`](skills/savepoints-notion/SKILL.md) | Notion MCP persistence (v1) |
| [`skills/savepoints-notion/defaults.yml`](skills/savepoints-notion/defaults.yml) | `destination.data_source_id` |
| [`skills/savepoints/verification.md`](skills/savepoints/verification.md) | Manual checklists — **adopt-and-verify only** |
| [`skills/README.md`](skills/README.md) | Index of router + providers |

**Router `SKILL.md` sections (suggested):** purpose; triggers; `schema.md` reference; metadata derivation; provider resolution table; delegation steps; outcomes and anti-loop; forbidden (provider MCP details).

**Provider `savepoints-notion/SKILL.md` sections (suggested):** input Savepoint contract; load provider defaults; Notion mapping; MCP write + bounded confirmation; return outcome; forbidden (event detection).

---

## npm distribution

Follow [`@multipliers-dev/plan-validator`](https://www.npmjs.com/package/@multipliers-dev/plan-validator) publishing conventions (standalone repo; instruction-only package differs from plan-validator’s compiled `dist/` + `bin`):

| Concern | Plan |
| --- | --- |
| **Name** | `@multipliers-dev/savepoints-lite` (replace hub placeholder name; **not** `private`) |
| **`private`** | Remove `"private": true` or set `"private": false` before first publish |
| **Versioning** | Semantic versioning; bump on publish |
| **`publishConfig`** | `access: public`, `provenance: true` (match plan-validator scoped public package) |
| **`files`** | Ship `skills/**`, package `README.md`, and any packaged config templates — **no** `bin`, **no** compiled runtime |
| **`engines`** | Node `>=22` (align with plan-validator floor) |
| **Install** | Consumer `devDependency` (or `dependency`): declare an **exact semver** in `package.json` (e.g. `"@multipliers-dev/savepoints-lite": "1.0.0"`) — not a floating range for production adoption |
| **Verify publish** | `npm pack --dry-run` (and/or `prepack` script) asserts expected paths land in tarball |
| **Reproducibility** | **npm is the single source of truth** for installed skill file versions: committed **lockfile**, `npm ci` in CI and reproducible environments, **Renovate** (or equivalent) PRs to bump the dependency — **no** separate skill-copy or skill-update mechanism; **activation text unchanged** across version bumps (stable `node_modules` path pattern) |

**Out of scope:** installation CLI, bootstrap script, executable Savepoints runtime, custom MCP server.

**Publication verification (protocol-core):** CI/local script confirms tarball contains router + Notion provider skills and default YAML. **npm publish to the registry is an operator step after protocol-core merges** — not part of the implementation PR unless explicitly authorized.

### Publication and adoption sequence

```text
protocol-core merges to main
    → operator publishes @multipliers-dev/savepoints-lite@<version> to npm
    → adopt-and-verify starts (consumer pins that published version)
```

| Phase | What is validated |
| --- | --- |
| **protocol-core** | Package is publishable; `npm pack` / dry-run proves tarball contents |
| **Between slices (optional)** | Local `npm pack` + `file:` or packed tarball install for **early smoke** only — does **not** satisfy adoption verification |
| **adopt-and-verify** | [`fixtures/consumer/`](fixtures/consumer/) and manual agent checks use the **published registry version** pinned in `package.json` + lockfile (`npm ci`) |

Do **not** treat `file:` workspace links as the acceptance path for slice 2; they may help developers before the first publish, but slice 2 must confirm the real npm distribution path.

---

## Agent activation (consumer; slice 2)

npm install alone does **not** enable Savepoints. One-time **activation** per consumer repo (templates in slice 2). Activation files are **thin** — they must **not** duplicate the full protocol.

Establish only:

1. **When** the router must be consulted (same triggers as router skill).  
2. **Where** the installed router lives: `node_modules/@multipliers-dev/savepoints-lite/skills/savepoints/SKILL.md`.  
3. **That** the agent must follow the router and the configured provider skill from the same package.

| Surface | Mechanism |
| --- | --- |
| **Cursor** | Commit [`templates/consumer/.cursor/rules/savepoints-lite.mdc`](templates/consumer/.cursor/rules/savepoints-lite.mdc) → consumer `.cursor/rules/` (`alwaysApply: true`) |
| **Claude Code** | Short [`CLAUDE.md`](CLAUDE.md) pointer (preserve existing content; **append** Savepoints section) |
| **Other agents** | [`AGENTS.md`](AGENTS.md) pointer where applicable (preserve existing content) |

Document in [`docs/adopt.md`](docs/adopt.md) (slice 2): pinned registry dependency + lockfile + `npm ci`, Renovate-friendly updates, `node_modules` requirement, Notion MCP prerequisite, optional `.agents` overrides, **no skill vendoring**, npm does not auto-register native skill discovery.

**Hub repo (`savepoints-lite`):** optional **hub dogfooding** (this repository installing the published package + activation) is separate from [`fixtures/consumer/`](fixtures/consumer/) — see **Consumer fixture**. Slice 1 updates hub **Commands / CI / pre-commit** docs in [`AGENTS.md`](AGENTS.md) (and [`CLAUDE.md`](CLAUDE.md) if present) when removing the placeholder app; slice 1 does **not** add Savepoints activation templates or Savepoints-specific `AGENTS.md` / `CLAUDE.md` sections (deferred to adopt-and-verify).

### Consumer fixture (`fixtures/consumer/` — adopt-and-verify)

Disposable minimal consumer checkout used **only** for manual behavioral verification (not production adoption docs):

| Aspect | Plan |
| --- | --- |
| **Location** | [`fixtures/consumer/`](fixtures/consumer/) — minimal `package.json`, lockfile, activation copied from [`templates/consumer/`](templates/consumer/) |
| **vs hub** | **Separate** from hub dogfooding on the package repo root; fixture simulates an external consumer |
| **Dependency** | Pinned **published** `@multipliers-dev/savepoints-lite@<version>` from the npm registry (not `file:`) |
| **Paths** | Manual checks confirm canonical skills under `fixtures/consumer/node_modules/@multipliers-dev/savepoints-lite/skills/` |
| **Agents** | Manual Cursor and Claude Code sessions run **in or against** the fixture per [`verification.md`](skills/savepoints/verification.md) |
| **Notion** | Rows in the shared production database **only** with explicit operator authorization |
| **CI** | Optional layout checks only (e.g. fixture has lockfile + dependency pin); **no** agent behavior in CI |

Keep fixture minimal — no extra services, scripts, or frameworks beyond install + activation stubs.

---

## Reliability (v1 — preserved)

Append-only; one Savepoint per meaningful completed event; immediate writes (no session-end batching); no local fallback, retry queue, deduplication, or retrieval; no custom MCP; no executable logging runtime; fail-open on persistence failure; never claim persistence without confirmation; **failed Savepoint write must not trigger another Savepoint**; prefer synchronous MCP create with **bounded** async polling (at most two follow-ups, then `unconfirmed`).

---

## Scope exclusions (v1)

Do not implement: PostgreSQL provider; SQLite storage; custom MCP server; custom logging runtime; installation CLI; **Savepoints activity-capture hooks or lifecycle handlers** (see **Repository bootstrap** — unrelated repo Git/Husky/Cursor bootstrap hooks stay); background workers; local queue/spool; multiple simultaneous providers; retrieval or dashboards; Cursor marketplace / plugin packaging; provider registry runtime; TypeScript adapter interfaces beyond the behavioral `append` contract.

---

## Repository bootstrap (hub)

Current [`src/index.ts`](src/index.ts) is a placeholder (`console.log("ready")`). v1 has **no runtime**.

**Proposed changes:**

| Remove / change | Rationale |
| --- | --- |
| Remove `src/`, `tsx`, `typescript`, `tsconfig.json` (if unused), `dev`/`start` scripts | No executable product code; **no** `tsc` / `npm run typecheck` in planned repo state |
| Repurpose [`package.json`](package.json) as publishable **`@multipliers-dev/savepoints-lite`** | `"name"`, remove `"private": true` (or `"private": false`), `files`, `publishConfig`, semver |
| **`npm run verify`** | Package + skill validation: skills tree, defaults, [`npm pack --dry-run`](scripts/verify-package-contents.sh) tarball expectations (via [`scripts/verify-package-contents.sh`](scripts/verify-package-contents.sh) or equivalent) |
| **`npm test`** | Automated checks for package/skill invariants (e.g. Vitest exercising verifier assertions) — **not** a TypeScript app compile |
| [`.husky/pre-commit`](.husky/pre-commit) + [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | Replace `npm run typecheck` with `npm run verify` (keep `npm test`); update in **protocol-core** same PR as script removal |
| Update [`AGENTS.md`](AGENTS.md) (and [`CLAUDE.md`](CLAUDE.md) if present) | Remove obsolete `dev`/`start`/TypeScript commands; document `npm test`, `npm run verify`, `verify:git-hooks`; preserve unrelated instructions; **no** Savepoints activation section yet |
| Update [`README.md`](README.md) (slice 1) | Minimal package purpose + Notion MCP prerequisite — **no** `docs/adopt.md` link until slice 2 |
| **Remove** (if present after bootstrap) | `.cursor-plugin/`, root `plugin.json` — marketplace distribution out of scope |

**Planned hub scripts (post protocol-core):**

| Script | Purpose |
| --- | --- |
| `npm test` | Automated package/skill validation tests |
| `npm run verify` | Pack contents + skill tree verification (`npm pack --dry-run`) |
| `npm run verify:git-hooks` | Unchanged — hook availability |
| `prepare` | Unchanged — Husky install |

**Keep unchanged unless required:** [`.cursor/hooks.json`](.cursor/hooks.json), [`.cursor/environment.json`](.cursor/environment.json), Husky / `prepare` / pre-commit **machinery** — v1 does **not** add **Savepoints activity-capture** hooks (no `observe`, `stop`, `beforeSubmitPrompt`, or similar for logging). **Do not remove** existing repository development hooks (e.g. Husky shims, `ensure-hooks`, team-harness bootstrap). **Do** update pre-commit **recipe** to match `npm test` + `npm run verify` when TypeScript is removed.

---

## Implementation slices (merge-safe)

Two implementation PRs + docs closure. Each slice is **merge-safe on its own** — no cross-slice links to files that do not exist yet on `main`.

## Slice — protocol-core

**Recommended authority:** Open PR only

**Rationale:**

- Ships the npm instruction package and skills without consumer adoption docs or activation templates.

**Agent instruction:** Do not merge. Stop after opening the PR.

**Goal:** Publishable `@multipliers-dev/savepoints-lite` package (`name`, public scoped `publishConfig`, semver, `files`) with router + Notion provider skills, provider-neutral `schema.md`, split defaults, `npm run verify` (`npm pack --dry-run`), and `npm test`. Remove placeholder TypeScript app and **all** `typecheck`/`tsc` usage. Update hub [`AGENTS.md`](AGENTS.md), [`.husky/pre-commit`](.husky/pre-commit), [`.github/workflows/ci.yml`](.github/workflows/ci.yml), and minimal README (no `docs/adopt.md` link). Remove plugin/marketplace manifests if present. **npm publish** remains operator-authorized after merge.

**Not in this slice:** `docs/adopt.md`, `verification.md`, `fixtures/consumer/`, consumer activation templates, Savepoints activation in hub `AGENTS.md` / `CLAUDE.md`.

**Acceptance:**

- `npm test` and `npm run verify` pass; **no** `typecheck` script or `tsc` in repo  
- `package.json`: `"name": "@multipliers-dev/savepoints-lite"`, not private, `publishConfig.access: public`  
- Pack verifier / dry-run passes; router + Notion provider files present  
- `AGENTS.md` commands match scripts; pre-commit and CI run `npm test` then `npm run verify`  
- `README.md` has **no** `docs/adopt.md` reference (grep / verifier)  
- Merge-safe on `main` alone  

## Slice — adopt-and-verify

**Recommended authority:** Open PR only

**Rationale:**

- Consumer adoption, activation, and behavioral verification depend on a **published** npm package from slice 1.

**Prerequisite (operator, between PRs):** After **protocol-core** merges, publish `@multipliers-dev/savepoints-lite@<version>` to the npm registry before opening adopt-and-verify.

**Agent instruction:** Do not merge. Stop after opening the PR.

**Goal:** `docs/adopt.md`, README adoption link (same PR), `templates/consumer/`, [`fixtures/consumer/`](fixtures/consumer/) with **pinned registry dependency** + lockfile, `verification.md`, optional hub dogfooding activation (separate from fixture), documented manual Cursor/Claude verification in the fixture (Notion writes only with authorization).

**Acceptance:**

- `docs/adopt.md` and README link land in **one** PR  
- [`fixtures/consumer/`](fixtures/consumer/) installs published version (not `file:`); documents semver pin + `npm ci` / Renovate pattern  
- Manual verification uses fixture `node_modules` skill paths; distinct from hub dogfooding if both are documented  
- Checklists cover provider delegation, `node_modules` paths, persistence honesty, anti-loop  
- Fixture documented; CI may validate fixture layout only (not agent behavior)  

## Slice — plan-closure

**Recommended authority:** Open PR only

**Rationale:**

- Docs-only archival after implementation merges.

**Agent instruction:** Do not merge. Stop after opening the PR.

**Goal:** Verify implementation against this plan, record accepted deviations in `# Shipped`, archive plan, mark `plan-closure` completed.

**Acceptance:**

- Prerequisite implementation PRs merged to `main`  
- Plan moved to `.cursor/plans/archive/` with closure note  
- Do **not** auto-merge implementation PRs from this slice  

---

## Verification

### Automatable (CI / local)

| Check | Mechanism |
| --- | --- |
| Hub package skills + defaults | `npm run verify` (`npm pack --dry-run` + skill tree; protocol-core; extend in adopt-and-verify for docs/fixture layout if needed) |
| Hub invariants | `npm test` (protocol-core) |
| `storage.provider: notion` in router defaults; Notion `data_source_id` in provider defaults | grep/assert in respective `defaults.yml` |
| No Savepoints capture hooks | script asserts `.cursor/hooks.json` has no savepoints-lite / Savepoints-logging hook entries; **does not** forbid existing Husky or unrelated bootstrap hooks |

**Do not** build an “agent compliance test framework.”

### Manual (real agent sessions — required for behavioral claims)

Use [`skills/savepoints/verification.md`](skills/savepoints/verification.md):

| # | Scenario | Pass criteria |
| --- | --- | --- |
| 1 | **Discoverability** | Fresh Cursor chat in [`fixtures/consumer/`](fixtures/consumer/); agent follows activation + reads router from fixture `node_modules` without user saying “use savepoints” |
| 1b | **node_modules path** | Agent opens `fixtures/consumer/node_modules/@multipliers-dev/savepoints-lite/skills/savepoints/SKILL.md` (not vendored copy) |
| 2 | **Implicit logging** | Complete a small doc edit; **≥1** Notion row appears without user reminder |
| 3 | **Metadata** | Row has correct `Repository`, `Agent`, sensible `Name`; `Session ID` only if host provided |
| 4 | **Content** | Body includes appropriate sections; empty sections omitted |
| 5 | **Multi-write** | Same session: decision + completed task → **≥2** rows |
| 6 | **Fail-open per event** | With MCP unavailable, agent finishes task and reports write failure; after MCP is available again in the **same session**, a later trigger still produces a row |
| 6b | **Persistence honesty** | Agent does not claim “saved to Notion” unless sync create succeeded or bounded async poll reached `succeeded` |
| 6c | **No Savepoint-on-failure loop** | After a failed Savepoint write, agent reports in chat only; does not immediately open another Savepoint solely to record that failure |
| 7 | **Claude Code** | Repeat 2–5 in Claude with same DB |
| 8 | **No Savepoints capture hooks** | Logging works via instructions + activation only — no new Savepoints lifecycle hooks; existing repo Husky/bootstrap hooks unchanged |
| 9 | **Provider delegation** | With default config, router delegates to `savepoints-notion` skill (Notion MCP); router text does not inline Notion property/SQL steps |

Record manual run date + Notion page URLs in PR description or verification checklist (not committed secrets).

---

## Compatibility limits and open decisions

| Topic | Limitation / decision |
| --- | --- |
| **Enforcement** | Instructions + `alwaysApply` rule are **best-effort**; models can still skip writes — v1 accepts this by design (**no Savepoints capture hooks**; repo dev hooks unaffected). |
| **npm vs activation** | `npm install` alone does **not** enable logging; consumers need activation templates + Notion MCP (`docs/adopt.md`). |
| **Cloud Agents** | Rely on `AGENTS.md` (+ optional future `.cursor/CLOUD.md` one-pager); rules may load but must not assume hook delivery. |
| **Session ID** | Inconsistent across hosts; optional by design. |
| **Router vs provider** | Instruction-only routing; verify delegation via manual checklist (row 9) and adopt doc. |
| **Notion MCP variance** | Document in `savepoints-notion/SKILL.md`; tool names may differ by client. |
| **PostgreSQL / multi-provider** | Deferred — `savepoints-postgres` skill only; no dual-write in v1. |
| **Async creates** | Prefer `allow_async: false`; when async is unavoidable, **bounded** poll (no indefinite wait); then success, terminal failure, or unconfirmed — never imply persistence on queue alone. |
| **Skill name** | **Decision:** use `savepoints` (slash `/savepoints`) vs `savepoints-lite` — recommend **`savepoints`** for ergonomics with repo name `savepoints-lite` disambiguating the product. |
| **npm publish** | Operator publishes after protocol-core merges; adopt-and-verify pins that registry version + lockfile. Optional local `npm pack` smoke before publish does not replace registry validation. |

---

## Recommended execution authority

| Slice | Recommended authority | Agent instruction |
| --- | --- | --- |
| protocol-core | Open PR only | Do not merge. Stop after opening the PR. |
| adopt-and-verify | Open PR only | Do not merge. Stop after opening the PR. |
| plan-closure | Open PR only | Do not merge. Stop after opening the PR. |

Repo default: **Open PR only** — implement and open the PR; do not merge unless explicitly granted.

---

## Agent prompts (copy/paste for Cursor)

### protocol-core

```text
@.cursor/plans/2026-10-27-savepoints-lite-v1.plan.md

Implement slice protocol-core only. Do not start adopt-and-verify or plan-closure.

Authority: Open PR only — implement and open the PR; do not merge.

Topology: start from latest origin/main; branch represents only this slice; PR base must be main.

Deliverables: per plan — @multipliers-dev/savepoints-lite package (name, public publishConfig, skills, defaults, schema), npm run verify + npm test, update AGENTS.md/CI/pre-commit (remove typecheck/tsc); minimal README without docs/adopt.md link; no activation templates; no plugin/marketplace. Mark protocol-core completed in plan frontmatter in this PR.

Verification: npm test && npm run verify. No typecheck. Do not publish to npm or create Notion test rows unless explicitly asked.
```

### adopt-and-verify

```text
@.cursor/plans/2026-10-27-savepoints-lite-v1.plan.md

Implement slice adopt-and-verify only. Prerequisites: protocol-core merged; operator has published @multipliers-dev/savepoints-lite@<version> to npm. Do not archive the plan.

Authority: Open PR only — implement and open the PR; do not merge.

Topology: start from latest origin/main; branch represents only this slice; PR base must be main.

Deliverables: docs/adopt.md, README link, templates/consumer/, fixtures/consumer/ (pinned published dep), verification.md, optional hub dogfooding activation; manual Cursor/Claude checks in fixture documented. Mark adopt-and-verify completed in plan frontmatter in this PR.

Verification: npm test && npm run verify; manual checklist in fixtures/consumer/; no production Notion writes in CI without authorization.
```

### plan-closure

```text
@.cursor/plans/2026-10-27-savepoints-lite-v1.plan.md

Execute only plan-closure.

Authority: Open PR only — docs-only archive PR; do not merge.

Topology: start from latest origin/main; branch represents only this slice; PR base must be main.

Prerequisites: protocol-core and adopt-and-verify merged to main.

Deliverables: verify implementation vs plan, record deviations in # Shipped, archive plan, mark plan-closure completed.

Verification: prerequisite PRs merged; do not auto-merge implementation PRs.
```
