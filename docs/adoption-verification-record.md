# Adoption verification record (adopt-and-verify)

Durable record of automated install checks and manual agent behavioral runs. Update this file in the adopt-and-verify PR; link Notion page URLs in the GitHub PR description when operator authorization applies.

## Automated checks

| Check | Context | Status | Date | Notes |
| --- | --- | --- | --- | --- |
| `npm ci` installs published `@1.0.0` | Hub repo root | Pass | 2026-10-27 | `node_modules/@multipliers-dev/savepoints-lite` version `1.0.0` after `npm install` |
| Router path resolves | Hub `node_modules/.../skills/savepoints/SKILL.md` | Pass | 2026-10-27 | File present; activation files reference this path |
| `npm ci` in fixture | `fixtures/consumer/` | Pass | 2026-10-27 | `fixtures/consumer/package-lock.json` committed; registry dep only |
| Router path resolves | Fixture `node_modules` | Pass | 2026-10-27 | Same canonical path under fixture |
| `npm test` + `npm run verify` | Hub CI recipe | Pass | 2026-10-27 | 17 tarball paths incl. templates + verification docs |

## Manual behavioral verification

**Operator authorization required** for any scenario that creates Notion rows (fixture 2–7, hub H2–H7).

### Standalone fixture (`fixtures/consumer/`)

| Scenario | Status | Date | Evidence |
| --- | --- | --- | --- |
| 1 Discoverability | Pending | — | Fresh Cursor session required |
| 1b node_modules path | Pending | — | |
| 2 Implicit logging | Pending | — | Notion URL in PR only |
| 3 Metadata | Pending | — | |
| 4 Content | Pending | — | |
| 5 Multi-write | Pending | — | |
| 6 Fail-open | Pending | — | |
| 6b Persistence honesty | Pending | — | |
| 6c Anti-loop | Pending | — | |
| 7 Claude Code | Pending | — | |
| 8 No capture hooks | Pending | — | |
| 9 Provider delegation | Pending | — | |

### Hub dogfooding (repository root)

| Scenario | Status | Date | Evidence |
| --- | --- | --- | --- |
| H1 Discoverability | Pending | — | Fresh Cursor session at hub root |
| H1b Not source `skills/` | Pending | — | |
| H2–H7 Persistence | Pending | — | Operator authorized Notion runs |
| H8 No capture hooks | Pending | — | |
| H9 Provider delegation | Pending | — | |

## Slice completion gate

`adopt-and-verify` plan todo stays **pending** until:

1. Hub devDependency + activation land on the branch, and
2. Fixture + templates land on the branch, and
3. Automated rows above are **Pass**, and
4. All required manual rows are **Pass** (or explicitly waived by operator with rationale in PR).

**Current branch status (2026-10-27):** items 1–3 satisfied on `slice/adopt-and-verify`; item 4 **not** satisfied — manual rows remain **Pending**.
