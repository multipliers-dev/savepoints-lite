# Savepoints Lite — manual behavioral verification

Instruction-only routing cannot be fully asserted in CI. Use this checklist after **activation** and a pinned registry install (`npm ci` at the consumer repo root).

Record page URLs in the PR description or [`docs/adoption-verification-record.md`](../../docs/adoption-verification-record.md) — not committed secrets.

Record each scenario as **Passed**, **Failed**, or **Not run** (with date and evidence where available).

## Authorization (do not confuse these)

| Mode | When | Agent behavior |
| --- | --- | --- |
| **Ongoing session logging** | Activation complete in the repo (Cursor rule + `AGENTS.md` session log). Hub: committed activation. | After each session-log trigger, invoke the installed router and attempt persistence **without** asking for separate authorization before every entry, subject to Notion MCP permissions. Fail open; do not claim writes without provider confirmation. |
| **Not opted in** | No activation or operator consent unclear | Do not write to Notion; fail open without claiming persistence. |
| **Manual verification session** | Operator explicitly authorizes running **this checklist** (required before deliberate failure simulations and other non-routine test writes) | Proceed with the scenario under test; record evidence. **Does not** suspend ongoing logging during ordinary work when activation opt-in already applies. **Does not** mean “skip logging until the operator authorizes each row.” |

Installing the npm package or connecting Notion MCP alone does **not** establish ongoing logging opt-in.

## Preconditions

- Pinned `@multipliers-dev/savepoints-lite@1.0.0` (or documented release) in `package.json` + committed lockfile.
- `npm ci` completed at **hub repo root**; router exists at `node_modules/@multipliers-dev/savepoints-lite/skills/savepoints/SKILL.md`.
- Authenticated Notion MCP in the agent host (for persistence scenarios).
- Activation present: Cursor rule (`alwaysApply: true`), plus `AGENTS.md` / `CLAUDE.md` pointers — **ongoing logging opt-in** for hub dogfooding.
- **No** new Savepoints lifecycle hooks (logging via instructions only).
- **Verification session:** operator has authorized running checklist scenarios that write to production Notion or simulate failures (especially scenarios **9–11**).

## A. Registry portability (not agent behaviour)

Run **outside** the repository in a temporary directory (not committed):

1. `npm install @multipliers-dev/savepoints-lite@1.0.0` from the public registry (not `file:`).
2. Confirm router, Notion provider, `schema.md`, and both `defaults.yml` under `node_modules/@multipliers-dev/savepoints-lite/`.
3. Confirm the install does not depend on local repository files.
4. Remove the temp directory.

Record outcome in [`docs/adoption-verification-record.md`](../../docs/adoption-verification-record.md).

## B. Hub dogfooding (real agent sessions)

Run at the **Savepoints Lite hub repository root** (`multipliers-dev/savepoints-lite`). **Required** for adopt-and-verify acceptance.

| # | Scenario | Pass criteria |
| --- | --- | --- |
| 1 | **Discoverability** | Fresh Cursor chat; agent follows activation without an explicit “use savepoints” reminder |
| 2 | **Installed router** | Agent reads `node_modules/@multipliers-dev/savepoints-lite/skills/savepoints/SKILL.md` — **not** git `skills/` as the consumer router |
| 3 | **Provider delegation** | Router delegates to installed `savepoints-notion` skill (Notion MCP); router does not inline Notion property steps |
| 4 | **Primary-agent implicit logging** | Parent completes meaningful work **without** an explicit Savepoints reminder → parent reads installed router, delegates to provider, attempts a Notion record when **ongoing logging is opted in** (hub: committed activation) — no separate per-entry authorization |
| 5 | **Delegated-work logging** | Subagent in an **isolated worktree** completes ordinary development work (prompt does **not** mention Savepoints) → when results return to the **parent**, parent records the subagent's reported outcome (same router/provider path; entry reflects delegated work). **Do not** treat subagent-local Savepoint absence as pass/fail — only parent behavior after handoff counts |
| 6 | **Metadata** | Row has correct `Repository`, `Agent`, sensible `Name`; `Session ID` only if host provided |
| 7 | **Content** | Body includes appropriate sections; empty sections omitted |
| 8 | **Multi-write** | Separate meaningful events → separate records (≥2 in one session when applicable) |
| 9 | **Fail-open** | **Verification session authorized.** Notion MCP failure does not block primary work; later independent event can still produce a record after recovery |
| 10 | **Persistence honesty** | Agent does not report success on `unconfirmed` writes |
| 11 | **Anti-loop** | Failed write does not recursively trigger more Savepoints |
| 12 | **No capture hooks** | Logging via instructions + activation only; [`.cursor/hooks.json`](../../.cursor/hooks.json) unchanged for Savepoints capture |
| 13 | **Claude Code** | Repeat applicable scenarios (2–11) in Claude Code at hub root (activation opt-in + verification session authorization when required) |

**Do not** claim `npm test` or CI proves this table.
