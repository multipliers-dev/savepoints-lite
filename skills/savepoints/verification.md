# Savepoints Lite — manual behavioral verification

Instruction-only routing cannot be fully asserted in CI. Use this checklist after consumer **activation** and a pinned registry install (`npm ci`).

**Notion writes:** production Savepoints database rows require **explicit operator authorization** for each manual run. Record page URLs in the PR description or [`docs/adoption-verification-record.md`](../../docs/adoption-verification-record.md) — not committed secrets.

## Preconditions

- Pinned `@multipliers-dev/savepoints-lite@1.0.0` (or documented release) in `package.json` + committed lockfile.
- `npm ci` completed; router exists at `node_modules/@multipliers-dev/savepoints-lite/skills/savepoints/SKILL.md`.
- Authenticated Notion MCP in the agent host (for persistence scenarios).
- Activation present: Cursor rule (`alwaysApply: true`), plus `AGENTS.md` / `CLAUDE.md` pointers as applicable.
- **No** new Savepoints lifecycle hooks (logging via instructions only).

## Standalone consumer fixture (`fixtures/consumer/`)

Run agent sessions **in or against** the fixture directory unless noted.

| # | Scenario | Pass criteria |
| --- | --- | --- |
| 1 | **Discoverability** | Fresh Cursor chat; agent follows activation and reads router from fixture `node_modules` without user saying “use savepoints” |
| 1b | **node_modules path** | Agent opens `fixtures/consumer/node_modules/@multipliers-dev/savepoints-lite/skills/savepoints/SKILL.md` (not vendored copy) |
| 2 | **Implicit logging** | Complete a small doc edit; ≥1 Notion row appears without user reminder (operator authorized) |
| 3 | **Metadata** | Row has correct `Repository`, `Agent`, sensible `Name`; `Session ID` only if host provided |
| 4 | **Content** | Body includes appropriate sections; empty sections omitted |
| 5 | **Multi-write** | Same session: decision + completed task → ≥2 rows |
| 6 | **Fail-open per event** | With MCP unavailable, agent finishes task and reports write failure; after MCP is available again, a later trigger still produces a row |
| 6b | **Persistence honesty** | Agent does not claim “saved to Notion” unless sync create succeeded or bounded async poll reached `succeeded` |
| 6c | **No Savepoint-on-failure loop** | After a failed Savepoint write, agent reports in chat only; does not immediately open another Savepoint solely to record that failure |
| 7 | **Claude Code** | Repeat 2–5 in Claude with same DB (operator authorized) |
| 8 | **No Savepoints capture hooks** | Logging works via instructions + activation only; existing repo Husky/bootstrap hooks unchanged |
| 9 | **Provider delegation** | Router delegates to `savepoints-notion`; router text does not inline Notion property steps |

## Hub dogfooding (`multipliers-dev/savepoints-lite` repository root)

**Required** for adopt-and-verify acceptance — not optional. Repeat scenarios **1**, **1b**, **8**, and **9** at the hub root with hub activation files. Scenarios **2–7** require operator-authorized Notion writes in the hub context.

| # | Scenario | Pass criteria |
| --- | --- | --- |
| H1 | **Hub discoverability** | Fresh Cursor chat at repo root; agent uses hub `.cursor/rules/savepoints-lite.mdc` and reads router from **hub** `node_modules/@multipliers-dev/savepoints-lite/skills/savepoints/SKILL.md` |
| H1b | **Not source skills/** | Agent does **not** treat `skills/savepoints/SKILL.md` in the git tree as the activation router path |
| H2–H7 | **Hub persistence** | Same as fixture rows 2–7 when operator authorizes Notion writes against the hub checkout |
| H8 | **Hooks unchanged** | [`.cursor/hooks.json`](../../.cursor/hooks.json) still has no Savepoints capture hooks |
| H9 | **Delegation** | Same as fixture row 9 |

Record results in [`docs/adoption-verification-record.md`](../../docs/adoption-verification-record.md).
