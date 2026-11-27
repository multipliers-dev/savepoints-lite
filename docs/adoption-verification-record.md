# Adoption verification record (adopt-and-verify)

Durable record of automated checks and manual agent behavioral runs. Status values: **Pass**, **Fail**, **Not run**, **Inconclusive**. Link Notion page URLs in the GitHub PR description when recording verification evidence — not in this file. **Ongoing session logging** opt-in is committed hub activation; **verification-session authorization** applies to deliberate checklist runs (see `skills/savepoints/verification.md` § Authorization).

## Post-write verification hardening adoption (2026-11-27)

Evidence for published Savepoints Lite **`@2.2.0`** distributed via team-harness **1.17.0** (plan archive: [`.cursor/plans/archive/2026-11-27-post-write-verification-hardening.plan.md`](../.cursor/plans/archive/2026-11-27-post-write-verification-hardening.plan.md)). The smoke gate judges whether the optional verification tooling is discoverable and works first time **when an agent uses it**, not how often agents choose to use it. Notion page links for the smoke scenarios are in the PR description, not in this file.

| Item | Status | Notes |
| --- | --- | --- |
| Hub PRs [#25](https://github.com/multipliers-dev/savepoints-lite/pull/25) (principle docs), [#26](https://github.com/multipliers-dev/savepoints-lite/pull/26) (CLI and skill hardening) | **Merged** | Implicit stdin, `notion-fetch` input adapter, advisory `repository_format` warning, leaner skills |
| `@2.2.0` on npm | **Pass** | `npm view` returns `2.2.0` and `dist-tags.latest` is `2.2.0` |
| Marketplace implementation [PR #80](https://github.com/multipliers-dev/cursor-team-marketplace/pull/80) | **Merged** (2026-11-27) | Pin, vendor sync (`PACKAGE_VERSION=2.2.0`), vendored CLI smoke update, team-harness **1.17.0** |
| Hub dogfood pin to `@2.2.0` | **Pass** | Exact devDependency pin, `scripts/expected-package-paths-registry-dogfood-2.2.0.txt` matches the installed registry artifact (20 files) and `expected-package-paths.txt` |
| Smoke 1: successive appends, operator-requested verification on first and last | **Pass** | Three appends. Verified appends: `notion-fetch`, documented heredoc command (no `--stdin`, no `\|\| true`), exit 0 on the first attempt. Middle append not verified (agent discretion; not a failure) |
| Smoke 2: repository and title | **Pass** | `Repository` is `owner/repo` from `origin`; titles follow `owner/repo — verb phrase` |
| Smoke 3: induced bare repository | **Pass** | One advisory `repository_format` warning, exit 0, no repair, no second create |
| Smoke 4: induced missing property | **Pass** | `missing_persisted_property` (exit 1), one bounded repair, re-fetch and re-validate clean (exit 0), same page |
| Smoke 5: default off (no `validation` key) | **Inconclusive** | Not exercised: the operator's User Rules set `validation.post_write: true` and cannot be changed from the run. Only static checks were made (no consumer override in the test repo; packaged default is `false`). Needs a fresh chat whose User Rules omit the `validation` key |

**Limits of this evidence:** one agent, desktop Cursor, one session, run through the installed team-harness **1.17.0** vendored CLI with live Notion MCP. The run's chat started in the hub checkout and used a non-hub repository (with a real `origin`) for the work events, rather than a fresh non-hub chat. The agent read both skills in full, so the earlier failure of reading only part of the provider skill was not exercised. Automated tests prove CLI and layout only, not agent behaviour. The two induced scenarios created test fixture rows in the Savepoints database. This section does not convert the hub implicit-logging rows below.

## Marketplace adoption verification (2026-11-20)

Evidence for [Cursor Team Marketplace](https://github.com/multipliers-dev/cursor-team-marketplace) distribution of published Savepoints Lite **`@2.1.0`** via team-harness **1.16.0**. Authoritative scenario detail and Notion page links live in the marketplace plan archive — do not duplicate lengthy evidence here.

| Item | Status | Notes |
| --- | --- | --- |
| Marketplace implementation [PR #78](https://github.com/multipliers-dev/cursor-team-marketplace/pull/78) | **Merged** | Pin, vendor sync (including `skills/bin/`), wrapper `validation.post_write` handoff, team-harness **1.16.0** |
| Marketplace plan-closure [PR #79](https://github.com/multipliers-dev/cursor-team-marketplace/pull/79) | **Merged** | Docs-only archive + `# Shipped` (2026-11-20) |
| Automated package / vendor checks (marketplace) | **Pass** | Marketplace CI / vendor layout for `@2.1.0` (not a substitute for agent behaviour) |
| Live agent/MCP scenarios against **marketplace checkout** vendored `@2.1.0` | **Pass** (5 scenarios) | Default validation off; validation enabled (read-back + CLI); missing property detected and repaired once; CLI unavailable (create preserved); explicit validation disabled. Full table: [marketplace plan `# Shipped`](https://github.com/multipliers-dev/cursor-team-marketplace/blob/main/.cursor/plans/archive/2026-11-20-savepoints-lite-2.1.0-adoption.plan.md) |
| Refreshed **installed** plugin file presence (1.16.0 cache) | **Pass** (files only) | Operator refreshed installed plugin to 1.16.0; CLI present under vendor `skills/bin/` |
| Installed-plugin **agent invocation** | **Not verified** | Successful agent invocation through the refreshed installed plugin has **not** been independently demonstrated |
| Hub implicit logging / delegated-work scenarios (rows 4–5 below) | Unchanged | Still **Fail** / **Not run** from October hub dogfooding — not converted by marketplace evidence |

**Do not treat this section as “full verification checklist passed.”** It records marketplace distribution + checkout-vendor live MCP evidence only.

## Automated checks

| Check | Context | Status | Date | Notes |
| --- | --- | --- | --- | --- |
| `npm ci` at hub root | Hub repo | Pass | 2026-10-27 | Installs published `@1.0.0` devDependency from registry |
| Hub lockfile pins `@1.0.0` | `package.json` / `package-lock.json` | Pass | 2026-10-27 | Exact devDependency committed on branch |
| Hub activation paths | `AGENTS.md` + `CLAUDE.md` (no `.mdc` rule) | Pass | 2026-10-27 | Reference `node_modules/.../skills/savepoints/SKILL.md` only |
| `npm test` + `npm run verify` | Workspace tarball | Pass | 2026-10-27 | 15 paths (post–`AGENTS.md`-only activation); validates **workspace** `npm pack` — not the immutable registry `@1.0.0` (12 files) |
| `npm run validate:plans` | Plan frontmatter | Pass | 2026-10-27 | |
| Registry portability | Temp dir outside repo | Pass | 2026-10-27 | `npm install @multipliers-dev/savepoints-lite@1.0.0`; router, provider, schema, defaults present; temp dir removed |

## Manual hub dogfooding (§ B in verification.md)

**Verification-session authorization** required before deliberate failure simulations and other non-routine checklist writes (especially scenarios **9–11**). Scenarios **4–8** use **ongoing logging opt-in** (hub: committed activation) — not separate per-entry authorization.

| # | Scenario | Status | Date | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Discoverability | Not run | — | |
| 2 | Installed router | Not run | — | |
| 3 | Provider delegation | Not run | — | |
| 4 | Primary-agent implicit logging | **Fail** | 2026-10-27 | See [Scenario 4 — primary-agent implicit logging (Run A)](#scenario-4--primary-agent-implicit-logging-run-a) |
| 5 | Delegated-work logging | Not run | — | Parent-owned model not yet verified; [Runs B–C](#runs-b-c--historical-subagent-local-logging-attempts) tested subagent-local logging only |
| 6 | Metadata | Not run | — | |
| 7 | Content | Not run | — | |
| 8 | Multi-write | Not run | — | |
| 9 | Fail-open | Not run | — | |
| 10 | Persistence honesty | Not run | — | |
| 11 | Anti-loop | Not run | — | |
| 12 | No capture hooks | Not run | — | |
| 13 | Claude Code | Not run | — | |

### Scenario 4 — primary-agent implicit logging (Run A)

#### Run A — PR #8 Bugbot fixes (Cursor agent, same session as operator audit)

**Confirmed facts (tool/conversation history):**

- `savepoints-lite.mdc` was present via Cursor **always-applied workspace rule injection** (not opened with Read on `.cursor/rules/savepoints-lite.mdc`).
- Meaningful work completed: doc/package/test edits for Bugbot findings, `npm ci` / `npm test` / `npm run verify` / `npm run validate:plans`, commit `5663a1a`, push, PR #8 body update.
- Installed router `node_modules/@multipliers-dev/savepoints-lite/skills/savepoints/SKILL.md` was read **once**, **after** implementation, commit, push, and PR update — not before finishing the work unit.
- Installed `savepoints-notion` provider SKILL was **not** read.
- **No** Notion MCP tools were invoked.
- **No** Savepoint record was created.

**Hypotheses (not yet proven root cause):**

- Activation may be treated as background context rather than a **same-turn completion obligation** tied to commit/push/PR wrap-up.
- “Read and follow” may be interpreted as optional file inspection rather than router → provider → persistence execution.
- Competing instructions (user rules, skills, task completion) may outrank Savepoints at session end without an explicit completion boundary.

**Notion:** not applicable — no write attempted.

#### Run D — parent-owned activation docs (Cursor parent, hub root, 2026-10-27)

**Setup:** Commit `dd80ba7` (delegated-work + verification split). Primary task was doc/activation updates, `npm test` / `npm run verify`, commit, push, PR #8 body update; prompt did **not** mention Savepoints.

**Confirmed facts:**

- `AGENTS.md` and `savepoints-lite.mdc` were in always-applied workspace rules.
- Installed router under `node_modules` was **not** read; Notion MCP was **not** invoked for session logging.
- Agent stated it skipped Notion because there was **no operator authorization** for the Savepoints DB — conflating **manual verification** authorization with **routine** session logging.

**Instruction fix (subsequent commit):** activation and `verification.md` now separate ongoing logging opt-in (activation) from verification-session authorization. Scenario **4** remains **Fail** until a fresh desktop implicit-logging run **observes** router invocation — not because wording alone.

**Notion:** not applicable — no write attempted.

### Runs B–C — historical subagent-local logging attempts

These runs assumed the **subagent** would implicitly log. Activation now assigns session logging to the **parent** when subagents return (scenario **5**). Subagent-local Savepoint absence in B–C is **not** evidence that parent-owned delegated logging fails.

#### Run B — controlled reproduction (fresh subagent, hub root, 2026-10-27)

**Setup:** Subagent on `slice/adopt-and-verify`; primary task was a one-sentence `docs/publishing.md` clarification + `npm test` + local commit; prompt did **not** mention Savepoints. Repro doc commit was **reverted** afterward so PR scope stays verification-only. **Parent did not record** the subagent outcome afterward (pre–parent-owned activation).

**Confirmed facts (subagent audit appendix):**

- Read `.cursor/rules/savepoints-lite.mdc` via Read: **no**
- Workspace rules mentioned savepoints-lite: **yes**
- Any path under `node_modules/@multipliers-dev/savepoints-lite/` read via Read: **none**
- Read `savepoints-notion` provider SKILL: **no**
- Notion MCP tools invoked: **none**
- Savepoint record attempted: **no** (subagent)

**Notion:** not applicable — no write attempted.

#### Run C — after session-log activation rewrite (fresh subagent, hub root, 2026-10-27)

**Setup:** Commit `2738fc8` on `slice/adopt-and-verify` (session-log–focused `AGENTS.md`, `.cursor/rules/savepoints-lite.mdc`, consumer templates). Subagent task: one-sentence `docs/publishing.md` clarification + `npm test`; prompt did **not** mention Savepoints. Repro edit **reverted** afterward so PR scope stays verification-only. **Parent did not record** the subagent outcome afterward (pre–parent-owned activation).

**Confirmed facts (subagent audit appendix):**

- Read `.cursor/rules/savepoints-lite.mdc` via Read: **no**
- Any path under `node_modules/@multipliers-dev/savepoints-lite/` read via Read: **none**
- Read `savepoints-notion` provider SKILL: **no**
- Notion MCP tools invoked: **none**
- Savepoint record attempted: **no** (subagent)

**Notion:** not applicable — no write attempted; operator authorization not exercised.

## Slice completion gate

| Gate | Status |
| --- | --- |
| Implementation + automated checks ([PR #8](https://github.com/multipliers-dev/savepoints-lite/pull/8)) | **Merged** — hub self-adoption, portability, `npm test` / `npm run verify` |
| Manual § B behavioral verification (plan acceptance) | **Not passed** — scenario **4** **Fail**; scenario **5** and most others **Not run** (table above unchanged) |

**Operator verification exception (2026-10-27, [PR #12](https://github.com/multipliers-dev/savepoints-lite/pull/12)):** The operator accepts **deferring** outstanding manual hub scenarios rather than blocking v1 plan closure. Rationale: implementation and publication evidence are sufficient to ship; failed and not-run rows remain the source of truth until fresh authorized runs update them. **Cross-repo `@1.1.0` consumer adoption** may produce incidental session logs during normal work — that is **not** checklist behavioral verification and must not be recorded as Pass without an explicit verification session per `skills/savepoints/verification.md`.

`adopt-and-verify` is **administratively closed** with this exception — **not** “behaviorally verified.” Plan archive: `# Shipped` § Verification exception in [`.cursor/plans/archive/2026-10-27-savepoints-lite-v1.plan.md`](../.cursor/plans/archive/2026-10-27-savepoints-lite-v1.plan.md).

**Follow-up (still required before production claims):** fresh **desktop** Cursor session at hub or consumer root with **no** `savepoints-lite.mdc`, ordinary dev task without Savepoints mention — confirm installed router read, Notion MCP attempt, and update scenario **4** / **5** rows. Procedure unchanged in [Run E](#behavioral-verification--cursor-without-mdc-run-e) below.

## AGENTS.md-only activation (2026-10-27)

Retired hub and consumer `savepoints-lite.mdc` rules; single runtime contract in root `AGENTS.md` (Claude via `CLAUDE.md` `@AGENTS.md`). Historical runs above that reference `.mdc` describe the prior activation mechanism — left unchanged.

### Behavioral verification — Cursor without `.mdc` (Run E)

| Item | Status |
| --- | --- |
| Fresh desktop Cursor session, `.mdc` absent | **Not run** |
| Ordinary dev task without Savepoints mention | **Not run** |
| Observed router → provider → Notion persistence | **Not run** |
| Delegated-work parent logging (scenario **5**) | **Not run** |

**Why not run here:** This implementation session cannot stand in for an authoritative fresh desktop Cursor chat after rule removal. Notion entries created while executing this task are **not** evidence of implicit logging.

**Minimal manual procedure (operator):**

1. Merge PR #8 activation on hub (or consumer) with **no** `savepoints-lite.mdc` committed.
2. Open a **new** Cursor Agent chat on the repo; confirm root `AGENTS.md` is in context (Cursor project rules / agent instructions).
3. Ask for a small, ordinary change (e.g. one-line doc fix) **without** mentioning Savepoints or Notion.
4. After the agent finishes, verify tool history: read installed `node_modules/.../skills/savepoints/SKILL.md`, Notion MCP create attempted, row visible in Savepoints DB.
5. Optional scenario **5:** delegate a subagent task without Savepoints in the prompt; confirm **parent** logs after handoff.

Record Pass/Fail in scenario **4** / **5** rows above when complete.
