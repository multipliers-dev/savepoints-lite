---
name: Savepoints Lite v1
overview: Implement Savepoints Lite as a router skill (events + Savepoint contract + provider resolution) delegating to provider skills (savepoints-notion in v1), thin always-on activation, split router/provider defaults, per-event fail-open append, and a protocol file verifier — no custom MCP server or executable runtime.
todos:
  - id: protocol-core
    content: "PR 1: savepoints router (SKILL.md, schema.md, defaults.yml) + savepoints-notion provider skill, alwaysApply rule, AGENTS/CLAUDE/README, plugin manifests, bootstrap slim + verify-protocol-files.sh"
    status: pending
  - id: adopt-and-verify
    content: "PR 2: docs/adopt.md, README adoption link, templates/consumer/, skills/savepoints/verification.md manual checklists"
    status: pending
  - id: plan-closure
    content: "Docs-only PR: # Shipped, archive plan, mark plan-closure completed"
    status: pending
isProject: false
---

# Savepoints Lite v1 — implementation plan

## Goals and non-goals

**In scope:** Append-only session logging via a **router skill** that delegates to **provider skills** (Notion MCP in v1), triggered by agent instructions (not lifecycle hooks), distributable as a **Cursor plugin** with canonical entry [`skills/savepoints/SKILL.md`](skills/savepoints/SKILL.md) (router).

**Out of scope:** Everything listed in the product brief (read/recovery, queues, hooks, custom MCP server, local spool, summarization, metrics). **Also deferred for v1:** `savepoints-postgres` (or other) provider skill, connection management, schema migrations, storage discovery, multi-provider writes.

**Contrast with [`multipliers-dev/savepoints`](https://github.com/multipliers-dev/savepoints):** Full Savepoints optimizes for *durable learnings* (five-check rubric, `emit-learning`, lifecycle hooks, Postgres submit workers). Lite optimizes for *activity/session narrative* with **immediate appends** and **no lifecycle/host automation** — with a **router → provider skill** split so *what* to record, *where* (provider selection), and *how* (MCP writes) stay separated.

---

## Architecture

```mermaid
flowchart TB
  subgraph hosts [Agent hosts]
    Cursor["Cursor"]
    Claude["Claude Code"]
    Other["Other agents"]
  end
  subgraph activation [Always-on activation]
    Rule[".cursor/rules/savepoints-lite.mdc"]
    AgentsDoc["AGENTS.md / CLAUDE.md"]
  end
  subgraph router [Router skill savepoints]
    RouterSkill["SKILL.md"]
    Schema["schema.md"]
    RouterDefaults["defaults.yml provider only"]
  end
  subgraph providersSkills [Provider skills]
    NotionSkill["savepoints-notion SKILL.md v1"]
    PgSkill["savepoints-postgres future"]
  end
  subgraph mcp [Provider MCP]
    NotionMCP["Notion MCP"]
    PgMCP["Postgres MCP future"]
  end
  Cursor --> Rule
  Claude --> AgentsDoc
  Other --> AgentsDoc
  Rule --> RouterSkill
  AgentsDoc --> RouterSkill
  RouterSkill --> Schema
  RouterSkill --> RouterDefaults
  RouterSkill -->|"resolve provider"| NotionSkill
  RouterSkill -.->|"future"| PgSkill
  NotionSkill --> NotionMCP
  PgSkill -.-> PgMCP
  NotionMCP --> NotionDB["Notion Savepoints database"]
  PgMCP -.-> Postgres["PostgreSQL future"]
```

| Layer | v1 responsibility |
| --- | --- |
| **Activation** | Triggers, “read **router** skill,” fail-open |
| **Router** [`skills/savepoints/`](skills/savepoints/) | Event detection, build Savepoint, read `storage.provider`, **load and invoke** matching provider skill, handle `success` / `failure` / `unconfirmed` — **no** Notion properties or SQL |
| **Provider** [`skills/savepoints-notion/`](skills/savepoints-notion/) | Map Savepoint → Notion, MCP write, bounded async confirmation, return outcome — **does not** decide when to Savepoint |
| **Future** `skills/savepoints-postgres/` | Postgres MCP mapping only (not shipped in v1) |
| **Runtime** | None — agents follow instructions; no router code |

**Design principle:** Router owns **what** and **when**; provider selection is config-only; provider skills own **how** to persist. Activation points at the **router** only. Do **not** set `disable-model-invocation: true` on router or v1 provider skills.

**Provider resolution (v1):** `storage.provider: notion` → read and follow [`skills/savepoints-notion/SKILL.md`](skills/savepoints-notion/SKILL.md). Unknown provider → report misconfiguration; do not guess.

**Caveat:** Routing is **instruction-based**, not code — **behavioral** verification must confirm agents delegate to the configured provider skill rather than inlining Notion steps in the router.

| Component | Inline-adapter plan | Router + provider skills |
| --- | --- | --- |
| `skills/savepoints/SKILL.md` | Protocol + delegate to `adapters/notion.md` | Router only |
| `skills/savepoints/schema.md` | (in SKILL) | Canonical Savepoint contract |
| `skills/savepoints/defaults.yml` | `adapter` + destination | `storage.provider` only |
| `skills/savepoints-notion/` | `adapters/notion.md` | Provider `SKILL.md` + destination `defaults.yml` |
| PostgreSQL | Future markdown adapter | Future `savepoints-postgres` skill |
| v1 behavior | Notion appends | Unchanged |

---

## Savepoint protocol (provider-neutral)

Document in [`schema.md`](skills/savepoints/schema.md); router [`SKILL.md`](skills/savepoints/SKILL.md) references it. Independent of Notion, Postgres, or any single MCP.

### Canonical Savepoint shape

Illustrative structure agents assemble before calling `append` (field names are protocol vocabulary, not a runtime schema):

```yaml
savepoint:
  title: "Implemented authentication"
  repository: "multipliers-dev/portfolio"
  agent: "Cursor Agent"
  session_id: null  # optional; omit when unknown

  content:
    what_was_done: "Added authentication middleware"
    decisions_made: "Selected JWT authentication"
    open_threads: "Token rotation"
    errors: null  # omit section when empty
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

### Repository layout (v1)

```
skills/
├── savepoints/                    # Router
│   ├── SKILL.md
│   ├── defaults.yml               # storage.provider only
│   └── schema.md                  # Savepoint contract (shared reference)
├── savepoints-notion/             # Provider (v1)
│   ├── SKILL.md
│   └── defaults.yml               # destination.data_source_id
└── README.md
```

**Future:** `skills/savepoints-postgres/SKILL.md` (+ provider `defaults.yml`) — not in v1.

Plugin [`"skills": "./skills"`](.cursor-plugin/plugin.json) discovers **both** router and provider skills.

### Router [`skills/savepoints/SKILL.md`](skills/savepoints/SKILL.md)

Responsible for:

1. Recognizing meaningful work events (trigger contract below).  
2. Building a provider-neutral Savepoint per [`schema.md`](skills/savepoints/schema.md).  
3. Reading `storage.provider` from router [`defaults.yml`](skills/savepoints/defaults.yml).  
4. **Loading the matching provider skill** (e.g. `notion` → `savepoints-notion/SKILL.md`) and delegating persistence.  
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

**Resolution order:**

1. Bundled router + provider defaults (above).  
2. Optional consumer [`.agents/savepoints-lite.yml`](.agents/savepoints-lite.yml) — override `storage.provider` only (template documents shape; hub repo does not commit a live file).  
3. Optional consumer [`.agents/savepoints-notion.yml`](.agents/savepoints-notion.yml) (or documented equivalent) — override Notion `destination` only when needed.

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

## Activation and distribution

### In-repo activation (this repository)

| File | Role |
| --- | --- |
| [`.cursor/rules/savepoints-lite.mdc`](.cursor/rules/savepoints-lite.mdc) | `alwaysApply: true` — short contract: triggers, “read **router** skill (`savepoints`) before write,” fail-open |
| [`AGENTS.md`](AGENTS.md) | Savepoints Lite section: mandatory logging behavior, link to skill, Cloud reminder (no hooks) |
| [`CLAUDE.md`](CLAUDE.md) | `@AGENTS.md` or equivalent one-line import for Claude Code |

**Why always-on rule:** Cursor plugins distribute **skills**, not project rules ([editorial-workflow](https://github.com/multipliers-dev/editorial-workflow) / [renovate-workflow](https://github.com/multipliers-dev/renovate-workflow) ship `"skills": "./skills"` only). Continuous behavior requires a **committed** `alwaysApply` rule in each repo that should log (including this repo).

### Plugin / marketplace (distribution)

Follow renovate’s dual manifest pattern:

| File | Role |
| --- | --- |
| [`plugin.json`](plugin.json) | Agent Plugins 1.0 portable manifest (name, version, repo metadata) |
| [`.cursor-plugin/marketplace.json`](.cursor-plugin/marketplace.json) | Single-plugin marketplace for “Add from GitHub” |
| [`.cursor-plugin/plugin.json`](.cursor-plugin/plugin.json) | `"skills": "./skills"` |

**Consumer adoption** (new [`docs/adopt.md`](docs/adopt.md), modeled on [renovate-workflow/docs/adopt.md](https://github.com/multipliers-dev/renovate-workflow/blob/main/docs/adopt.md)):

1. Import `https://github.com/multipliers-dev/savepoints-lite` as marketplace; install **savepoints-lite** plugin.  
2. Copy [`templates/consumer/.cursor/rules/savepoints-lite.mdc`](templates/consumer/.cursor/rules/savepoints-lite.mdc) into the consumer repo (or merge equivalent prose).  
3. **Only if overriding provider or destination:** copy templates → `.agents/savepoints-lite.yml` (router `storage.provider`) and/or `.agents/savepoints-notion.yml` (Notion destination) — not required for default adopters.  
4. Add a short pointer in consumer `AGENTS.md` / `CLAUDE.md`.  
5. Ensure the MCP for the configured provider is connected (Notion MCP when `storage.provider: notion`).

**Not in v1:** Listing inside `cursor-team-marketplace` (optional follow-up PR there).

### Claude Code portability

- **Router + provider skills** ship together.  
- Adoption doc: install plugin if supported, else vendor `skills/savepoints/` and `skills/savepoints-notion/` and replicate always-on instruction via `CLAUDE.md` + `AGENTS.md`.  
- Verification item: one real task in Claude Code → confirm row in shared Notion DB.

---

## Bootstrap slimming (why change the template)

Current [`src/index.ts`](src/index.ts) is a placeholder (`console.log("ready")`). v1 has **no runtime**.

**Proposed changes:**

| Remove / change | Rationale |
| --- | --- |
| Remove `src/`, `tsx`, `typescript`, `dev`/`start` scripts | No executable product code |
| Replace with [`scripts/verify-protocol-files.sh`](scripts/verify-protocol-files.sh) | CI/pre-commit guard: router + `savepoints-notion` skill trees, manifests parse; `storage.provider: notion`; Notion `data_source_id` in provider defaults |
| [`package.json`](package.json) scripts: `test` + `typecheck` → both run verifier (keeps Husky/CI contract without a fake TS app) | Preserves team-harness hook story with minimal churn |
| Update [`README.md`](README.md) | Product description and Notion MCP prerequisite only — **no** link to `docs/adopt.md` until that file exists in adopt-and-verify |

**Keep unchanged unless required:** [`.cursor/hooks.json`](.cursor/hooks.json), [`.cursor/environment.json`](.cursor/environment.json), Husky prepare scripts — Lite explicitly does **not** add Savepoints hooks.

---

## Implementation slices (merge-safe)

Recommended **two implementation PRs** + docs closure. Each slice is **merge-safe on its own** — no cross-slice links to files that do not exist yet on `main`.

### Slice `protocol-core` (Open PR only)

**Deliverables:**

- Router: `skills/savepoints/SKILL.md`, `schema.md`, `defaults.yml`  
- Provider: `skills/savepoints-notion/SKILL.md`, `defaults.yml`  
- `skills/README.md` — **not** `verification.md` or `savepoints-postgres` (slice 2 / future)  
- Override template only (e.g. `.agents/savepoints-lite.template.yml` or under `templates/consumer/`) — **no** committed `.agents/savepoints-lite.yml` in this repo  
- `.cursor/rules/savepoints-lite.mdc`  
- `AGENTS.md`, `CLAUDE.md`, [`README.md`](README.md) — product overview and Notion MCP prerequisite; **do not** link to [`docs/adopt.md`](docs/adopt.md) (file does not exist until slice 2)  
- `plugin.json`, `.cursor-plugin/*`  
- Bootstrap slim + `scripts/verify-protocol-files.sh`  

**Acceptance:**

- `npm test` and `npm run typecheck` pass (verifier only)  
- `verify-protocol-files.sh` checks protocol-core artifacts only (router + `savepoints-notion` skills, plugin manifests, rule) — **must not** require `verification.md` or `docs/adopt.md`  
- Root `README.md` contains **no** reference to `docs/adopt.md` (grep / verifier assertion acceptable)  
- No new hooks beyond existing git-hook stack  

### Slice `adopt-and-verify` (Open PR only)

**Deliverables:**

- [`docs/adopt.md`](docs/adopt.md) **created in this slice** (first appearance in repo)  
- **Same PR:** update root [`README.md`](README.md) to add an adoption section linking to [`docs/adopt.md`](docs/adopt.md) (relative path, e.g. `[docs/adopt.md](docs/adopt.md)`) — link lands in the **same commit** as the adopt doc so the slice stays merge-safe  
- [`templates/consumer/`](templates/consumer/) (rule snippet + optional AGENTS.md fragment)  
- [`skills/savepoints/verification.md`](skills/savepoints/verification.md) **created here** with checklists; update `SKILL.md` to link it  

**Acceptance:**

- Adopt doc describes Cursor + Claude paths  
- `README.md` links to `docs/adopt.md` and the target file exists in this PR  
- Manual verification section clearly labeled  
- Extend `verify-protocol-files.sh` to require `verification.md` and `docs/adopt.md` in this slice (optional tightening)  

### `plan-closure` (docs-only, after slices merge)

- `# Shipped` note, archive plan under `.cursor/plans/archive/`, mark `plan-closure` completed.

---

## Verification

### Automatable (CI / local)

| Check | Mechanism |
| --- | --- |
| Skill + plugin artifacts exist | `scripts/verify-protocol-files.sh` (protocol-core scope; add `verification.md` in adopt-and-verify) |
| JSON manifests parse | same script (`node -e` or `python -m json.tool`) |
| `storage.provider: notion` in router defaults; Notion `data_source_id` in provider defaults | grep/assert in respective `defaults.yml` |
| No accidental hook additions | script asserts `.cursor/hooks.json` has no savepoints-specific hooks |

**Do not** build an “agent compliance test framework.”

### Manual (real agent sessions — required for behavioral claims)

Use [`skills/savepoints/verification.md`](skills/savepoints/verification.md):

| # | Scenario | Pass criteria |
| --- | --- | --- |
| 1 | **Discoverability** | Fresh Cursor chat in `savepoints-lite`; agent loads rule/skill without user saying “use savepoints” |
| 2 | **Implicit logging** | Complete a small doc edit; **≥1** Notion row appears without user reminder |
| 3 | **Metadata** | Row has correct `Repository`, `Agent`, sensible `Name`; `Session ID` only if host provided |
| 4 | **Content** | Body includes appropriate sections; empty sections omitted |
| 5 | **Multi-write** | Same session: decision + completed task → **≥2** rows |
| 6 | **Fail-open per event** | With MCP unavailable, agent finishes task and reports write failure; after MCP is available again in the **same session**, a later trigger still produces a row |
| 6b | **Persistence honesty** | Agent does not claim “saved to Notion” unless sync create succeeded or bounded async poll reached `succeeded` |
| 6c | **No Savepoint-on-failure loop** | After a failed Savepoint write, agent reports in chat only; does not immediately open another Savepoint solely to record that failure |
| 7 | **Claude Code** | Repeat 2–5 in Claude with same DB |
| 8 | **No hooks** | Confirm logging still works with only instructions (no new lifecycle hooks) |
| 9 | **Provider delegation** | With default config, router delegates to `savepoints-notion` skill (Notion MCP); router text does not inline Notion property/SQL steps |

Record manual run date + Notion page URLs in PR description or verification checklist (not committed secrets).

---

## Compatibility limits and open decisions

| Topic | Limitation / decision |
| --- | --- |
| **Enforcement** | Instructions + `alwaysApply` rule are **best-effort**; models can still skip writes — v1 accepts this by design (no hooks). |
| **Plugin vs rule** | Installing the plugin alone does **not** enable continuous logging; consumers must add the rule (document loudly in `docs/adopt.md`). |
| **Cloud Agents** | Rely on `AGENTS.md` (+ optional future `.cursor/CLOUD.md` one-pager); rules may load but must not assume hook delivery. |
| **Session ID** | Inconsistent across hosts; optional by design. |
| **Router vs provider** | Instruction-only routing; verify delegation via manual checklist (row 9) and adopt doc. |
| **Notion MCP variance** | Document in `savepoints-notion/SKILL.md`; tool names may differ by client. |
| **PostgreSQL / multi-provider** | Deferred — `savepoints-postgres` skill only; no dual-write in v1. |
| **Async creates** | Prefer `allow_async: false`; when async is unavoidable, **bounded** poll (no indefinite wait); then success, terminal failure, or unconfirmed — never imply persistence on queue alone. |
| **Skill name** | **Decision:** use `savepoints` (slash `/savepoints`) vs `savepoints-lite` — recommend **`savepoints`** for ergonomics with repo name `savepoints-lite` disambiguating the product. |
| **cursor-team-marketplace** | **Deferred:** optional third PR to add marketplace entry after v1 proven. |

---

## Recommended execution authority

| Slice | Recommended authority | Agent instruction |
| --- | --- | --- |
| Plan review (this PR) | Plan-only PR | Do not begin implementation slices. Stop after opening the PR. |
| `protocol-core` | Open PR only | Do not merge. Stop after opening the PR. |
| `adopt-and-verify` | Open PR only | Do not merge. Stop after opening the PR. |
| `plan-closure` | Open PR only | Do not merge. Stop after opening the PR. |

---

## Agent prompts (copy/paste for Cursor)

### protocol-core

```text
@.cursor/plans/2026-10-27-savepoints-lite-v1.plan.md

Implement slice protocol-core only. Do not start adopt-and-verify or plan-closure.

Authority: Open PR only — implement and open the PR; do not merge.

Topology: start from latest origin/main; branch represents only this slice; PR base must be main.

Deliverables: per plan — router skill (SKILL.md, schema.md, defaults.yml), savepoints-notion provider skill, override templates, alwaysApply rule → router, AGENTS.md/CLAUDE.md, plugin manifests, bootstrap slim, verify-protocol-files.sh, README without docs/adopt.md link. Mark protocol-core completed in plan frontmatter in this PR.

Verification: npm test && npm run typecheck. Do not create Notion test rows unless explicitly asked.
```

### adopt-and-verify

```text
@.cursor/plans/2026-10-27-savepoints-lite-v1.plan.md

Implement slice adopt-and-verify only. Prerequisite: protocol-core merged. Do not archive the plan.

Authority: Open PR only — implement and open the PR; do not merge.

Topology: start from latest origin/main; branch represents only this slice; PR base must be main.

Deliverables: docs/adopt.md (new), README.md adoption link to docs/adopt.md in the same PR, templates/consumer/, skills/savepoints/verification.md. Mark adopt-and-verify completed in plan frontmatter in this PR.

Verification: npm test && npm run typecheck; manual checklist documented (no required Notion writes in CI).
```

### plan-closure

```text
@.cursor/plans/2026-10-27-savepoints-lite-v1.plan.md

Execute only plan-closure.

Authority: Open PR only — docs-only archive PR; do not merge.

Prerequisites: protocol-core and adopt-and-verify merged to main.

Deliverables: # Shipped note, move plan to .cursor/plans/archive/, mark plan-closure completed.

Verification: confirm prerequisite PRs merged.
```
