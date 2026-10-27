# Adoption verification record (adopt-and-verify)

Durable record of automated checks and manual agent behavioral runs. Status values: **Pass**, **Fail**, **Not run**. Link Notion page URLs in the GitHub PR description when operator authorization applies — not in this file.

## Automated checks

| Check | Context | Status | Date | Notes |
| --- | --- | --- | --- | --- |
| `npm ci` at hub root | Hub repo | Pass | 2026-10-27 | Installs published `@1.0.0` devDependency from registry |
| Hub lockfile pins `@1.0.0` | `package.json` / `package-lock.json` | Pass | 2026-10-27 | Exact devDependency committed on branch |
| Hub activation paths | Rule + `AGENTS.md` + `CLAUDE.md` | Pass | 2026-10-27 | Reference `node_modules/.../skills/savepoints/SKILL.md` only |
| `npm test` + `npm run verify` | Workspace tarball | Pass | 2026-10-27 | 17 paths; validates **workspace** pack — not the registry install tree |
| `npm run validate:plans` | Plan frontmatter | Pass | 2026-10-27 | |
| Registry portability | Temp dir outside repo | Pass | 2026-10-27 | `npm install @multipliers-dev/savepoints-lite@1.0.0`; router, provider, schema, defaults present; temp dir removed |

## Manual hub dogfooding (§ B in verification.md)

**Operator authorization required** for scenarios 4–10 and Notion portions of 12.

| # | Scenario | Status | Date | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Discoverability | Not run | — | |
| 2 | Installed router | Not run | — | |
| 3 | Provider delegation | Not run | — | |
| 4 | Implicit logging | Not run | — | Notion URL in PR only |
| 5 | Metadata | Not run | — | |
| 6 | Content | Not run | — | |
| 7 | Multi-write | Not run | — | |
| 8 | Fail-open | Not run | — | |
| 9 | Persistence honesty | Not run | — | |
| 10 | Anti-loop | Not run | — | |
| 11 | No capture hooks | Not run | — | |
| 12 | Claude Code | Not run | — | |

## Slice completion gate

`adopt-and-verify` plan todo stays **pending** until required manual hub scenarios are **Passed** (or operator-waived with PR rationale).

**Current PR branch:** hub implementation + automated checks **Pass**; all manual scenarios **Not run**.
