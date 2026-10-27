---
name: OSS readiness cleanup
overview: Self-contained @2.0.0 OSS readiness and explicit-integration destination.data_source_id contract in savepoints-lite; verified public npm release without per-repo consumer migration. Cursor Team Marketplace consumes the package only after operator publish (separate plan in cursor-team-marketplace).
todos:
  - id: plan-review
    content: "Plan-only PR — commit phased OSS readiness plan; do not implement slices"
    status: completed
  - id: plan-revision-explicit-integration
    content: "Plan-only PR — revise OSS plan for 2.0.0 contract and marketplace handoff; do not implement slices"
    status: completed
  - id: oss-readiness-contract
    content: "Hub PR: explicit-integration config, remove maintainer destination from package, docs (privacy/reliability/maintenance), tests, example template, version 2.0.0 in package.json; no publish"
    status: pending
  - id: release-verification
    content: "Hub PR: npm ci/test/verify/validate:plans; split workspace pack vs registry dogfood tests; operator publish checklist; no publish in agent slice"
    status: pending
  - id: plan-closure
    content: "Docs-only PR after @2.0.0 published and verified on npm: # Shipped with registry evidence, archive plan, update references"
    status: pending
isProject: false
---

# Savepoints Lite public OSS readiness (@2.0.0)

## Recommended execution authority

| Slice | Recommended authority | Agent instruction |
| --- | --- | --- |
| plan-review | Plan-only PR | Completed via [PR #13](https://github.com/multipliers-dev/savepoints-lite/pull/13). |
| plan-revision-explicit-integration | Plan-only PR | Revise plan only; do not implement slices. Stop after opening the plan-only PR. |
| oss-readiness-contract | Open PR only | savepoints-lite hub only. Do not edit cursor-team-marketplace. Do not merge or publish npm. |
| release-verification | Open PR only | savepoints-lite hub only. May combine with oss-readiness-contract in one merge-safe PR. Do not merge or publish npm. |
| plan-closure | Open PR only | Docs-only archive PR after `@2.0.0` published and verified on npm (not after implementation merge alone). Do not merge. |

Repo default: **Open PR only** (plan-only slices for plan artifacts only).

## Repository topology

Multi-slice plans stack execution order, not Git branches. Integration branch is `main` for **multipliers-dev/savepoints-lite** only.

**Before implementation:** `git fetch` and branch from latest `origin/main` in savepoints-lite.

**Before opening the PR:** branch contains only the current slice.

**After opening the PR:** GitHub base is `main`; diff excludes prior-slice work except through merged `main`.

**Cross-repo:** This plan does **not** authorize edits in consumer repositories or in `cursor-team-marketplace`. Personal distribution and consumer cleanup are tracked in [`cursor-team-marketplace` Savepoints marketplace distribution plan](https://github.com/multipliers-dev/cursor-team-marketplace/blob/main/.cursor/plans/2026-10-27-savepoints-marketplace-distribution.plan.md) (PR #70) — reference only; do not modify that plan from savepoints-lite PRs.

---

## Background

**End state:** Published **`@multipliers-dev/savepoints-lite@2.0.0`** is a verified, publicly usable instruction-only npm package with accurate docs, no maintainer Notion destination in the tarball, and a **`destination.data_source_id`** resolution contract (explicit integration instruction context → optional consumer `.agents`; packaged [`defaults.yml`](skills/savepoints-notion/defaults.yml) retained but without `destination.data_source_id`).

**Published today:** `@multipliers-dev/savepoints-lite@1.1.0` — package [`skills/savepoints-notion/defaults.yml`](skills/savepoints-notion/defaults.yml) still includes maintainer `data_source_id` `822cbc89-7c89-4863-af3a-2fe0cd8ab56e` (not a credential). No `.env` support.

**Supersession (PR #13 consumer migration withdrawn):** The original plan required seven consumer repositories to commit `.agents/savepoints-notion.yml` before hub work. That approach is **no longer** the intended personal distribution path. Team-harness + marketplace (separate repository plan) will vend skills and supply the explicit-integration tier after **`@2.0.0` exists on npm**. This plan does **not** include consumer-repository migration, cleanup, or pin-bump PRs.

**Standalone npm consumers:** Repositories installing the package directly may still use optional [`.agents/savepoints-notion.yml`](.agents/savepoints-notion.yml) (tier 2). Document in [`docs/adopt.md`](docs/adopt.md) and [`docs/architecture.md`](docs/architecture.md); do not require it for marketplace-backed installs.

### Handoff boundary

```mermaid
flowchart LR
  hub[savepoints_lite_2_0_0]
  publish[Operator_npm_publish]
  mkt[cursor_team_marketplace]
  hub --> publish --> mkt
```

| Responsibility | Owner | Notes |
| --- | --- | --- |
| Configuration contract + OSS docs/tests | savepoints-lite (`oss-readiness-contract`, `release-verification`) | Delivers merge-ready `2.0.0` source; agent does not `npm publish` |
| Registry publish | Operator (`gate-publish` in marketplace plan) | [`docs/publishing.md`](docs/publishing.md) workflow |
| Marketplace vendoring, wrapper skill, User Rules, consumer cleanup | cursor-team-marketplace | **After** publish only |

**Final deliverable from this repository:** operator-published, verified `@multipliers-dev/savepoints-lite@2.0.0` on the public npm registry.

**Out of scope here:** marketplace `vendor/` sync, team-harness wrapper skills, engineering invariants / User Rules, removing per-repo npm deps or `AGENTS.md` activation.

**Coordination:**

> Cursor Team Marketplace treats the published Savepoints Lite 2.0.0 release as an external prerequisite. All OSS readiness and configuration-contract implementation is owned by this repository.

### Execution flow

```mermaid
flowchart TB
  impl[oss_readiness_contract]
  verify[release_verification]
  pub[Operator_publish_2_0_0]
  close[plan_closure]
  mkt[Marketplace_after_publish]
  impl --> verify
  verify --> pub
  pub --> mkt
  pub --> close
```

`release-verification` may land in the **same** hub PR as `oss-readiness-contract`. **`plan-closure` runs only after `@2.0.0` is published and verified on npm** — merged implementation is not sufficient (see **Plan closure** under Decisions).

---

## Configuration contract (`@2.0.0`)

Instruction-only; no environment variables, hooks, background processes, or new runtime dependencies.

### `destination.data_source_id` precedence

| Tier | Source | When it applies |
| --- | --- | --- |
| 1 (highest) | Labelled YAML in the calling integration’s **instruction/delegation context** (router → Notion provider handoff) | Integration supplied a `destination` block for this Savepoint delegation |
| 2 | Consumer [`.agents/savepoints-notion.yml`](.agents/savepoints-notion.yml) | Tier 1 **absent** for this delegation |
| 3 | Packaged [`skills/savepoints-notion/defaults.yml`](skills/savepoints-notion/defaults.yml) (file retained; **`destination.data_source_id` omitted**) | Never supplies an id in `@2.0.0`; absent key = unconfigured |

**Tier 2 unchanged:** optional consumer `.agents` **overrides** any packaged defaults when tier 1 is absent (same shape as today: `destination.data_source_id` only).

### Resolution and failure semantics

- **Router** ([`skills/savepoints/SKILL.md`](skills/savepoints/SKILL.md)): when the integration delegates, **carry the explicit `destination` block unchanged** into the Notion provider’s instruction context. Router does not call Notion MCP or read host User Rules.
- **Provider** ([`skills/savepoints-notion/SKILL.md`](skills/savepoints-notion/SKILL.md)): resolve tier 1 → tier 2 → tier 3; treat tier 1 as highest priority; **must not** depend on discovering Cursor User Rules or other host-specific rule stores.
- **Missing resolved destination** (no valid id after applicable tiers): **fail open** — no Notion MCP write; continue primary work; preserve `success` / `failure` / `unconfirmed` outcome semantics.
- **Tier 1 present but invalid** (empty, malformed UUID, or otherwise unusable): **fail open without fallback** to tier 2 or tier 3 — do not silently use `.agents` or packaged defaults.
- **External integrations:** document provider-neutral handoff using the tier-1 YAML block below. Public package stays host-agnostic — instruction-context convention only, not a programmatic API.

### Package hygiene

- Retain [`skills/savepoints-notion/defaults.yml`](skills/savepoints-notion/defaults.yml) for relative references; **omit `destination.data_source_id` entirely** (no empty string, placeholder UUID, or maintainer id).
- Remove maintainer `822cbc89-7c89-4863-af3a-2fe0cd8ab56e` from generic examples in provider SKILL and tarball grep policy.
- Add [`templates/consumer/savepoints-notion.yml.example`](templates/consumer/savepoints-notion.yml.example) with `YOUR_NOTION_DATA_SOURCE_ID`.
- Router/provider separation unchanged; provider owns Notion mapping and MCP write + bounded confirmation.

### Decisions (final)

#### Explicit integration destination (tier 1)

The calling integration supplies this labelled block in instruction/delegation context when delegating to the Savepoints router (reuse existing configuration shape; no `integration.*` namespace):

```yaml
destination:
  data_source_id: "<NOTION_DATA_SOURCE_ID>"
```

The router carries it **unchanged** into the Notion provider’s instruction context. The provider treats it as the highest-priority source. Explicit but invalid → fail open without falling back to repository or packaged configuration.

#### Packaged defaults (tier 3)

Ship [`skills/savepoints-notion/defaults.yml`](skills/savepoints-notion/defaults.yml) **without** a `destination` key (or without `destination.data_source_id`). Optional [`.agents/savepoints-notion.yml`](.agents/savepoints-notion.yml) remains supported. When no source supplies a valid destination, fail open without a Notion write. Tests must assert shipped defaults do not contain a usable `destination.data_source_id`.

#### Plan closure

Archive this plan **only after** `@multipliers-dev/savepoints-lite@2.0.0` is **published and verified on npm**. Merged implementation PRs are not sufficient. Closure requires registry evidence (`npm view …@2.0.0`), successful post-publication install/package verification per [`docs/publishing.md`](docs/publishing.md), and publication evidence recorded in `# Shipped` before moving to [`.cursor/plans/archive/`](archive/). Operator `npm publish` stays outside agent implementation authority.

---

## Hub package version vs registry dogfood pin

The hub [`package.json`](package.json) carries two version concepts during the pre-publish implementation PR:

| Field | Role during implementation PR (pre-publish) | After operator publishes `@2.0.0` |
| --- | --- | --- |
| `"version"` | **`2.0.0`** (release candidate in git) | **`2.0.0`** on registry |
| `devDependencies["@multipliers-dev/savepoints-lite"]` | Stays **`1.1.0`** (exact pin + lockfile) | Bumped to **`2.0.0`** in a **follow-up** hub PR |

**Why:** `npm ci` installs the self-devDependency from the **public registry**, not the workspace tree. [`AGENTS.md`](AGENTS.md) session logging reads skills from `node_modules/@multipliers-dev/savepoints-lite/` (published artifact), not git `skills/` until the dogfood pin catches up.

**Verification (must not be weakened):**

| Gate | What it validates | Pre-publish expectation |
| --- | --- | --- |
| `npm run verify` | Workspace source + [`scripts/expected-package-paths.txt`](scripts/expected-package-paths.txt) via `npm pack --dry-run` | **2.0.0** release candidate tarball |
| `npm test` (package invariants) | Workspace rules + **registry dogfood** under `node_modules/` | Installed package **version** matches devDependency pin (`1.1.0`) |
| `installed registry dogfood artifact matches expected publish layout` ([`test/package-invariants.test.js`](test/package-invariants.test.js)) | Lists files in `node_modules/@multipliers-dev/savepoints-lite` vs workspace allowlist | **May diverge** until post-publish dogfood bump |

**Implementation requirement:** Split or extend verification so both remain true without bypass:

1. **Source / release-candidate pack** — `npm run verify` asserts workspace **2.0.0** layout.
2. **Registry dogfood** — tests assert installed **`@1.1.0`** independently until follow-up PR bumps pin.
3. **`npm ci` stays reproducible** — do not bump devDependency to `2.0.0` before the version exists on npm; no `file:` dogfood link in the pre-publish PR.
4. **No gate weakening** — do not delete dogfood layout checks or skip `npm test` / `npm run verify`.

**Post-publish:** operator publishes `@2.0.0` → follow-up hub PR bumps devDependency and lockfile → `npm ci` → dogfood checks align with workspace allowlist again.

---

## Slice — plan-revision-explicit-integration

**Recommended authority:** Plan-only PR

**Rationale:** Architecture shift (marketplace distribution) requires an updated authoritative plan before hub implementation.

**Agent instruction:** Commit revised plan only; do not implement `oss-readiness-contract` or later slices.

**Acceptance:**

- [`.cursor/plans/2026-10-27-oss-readiness-cleanup.plan.md`](2026-10-27-oss-readiness-cleanup.plan.md) reflects explicit-integration contract and marketplace handoff
- `npm run validate:plans` passes
- `plan-revision-explicit-integration` marked `completed` in frontmatter

---

## Slice — oss-readiness-contract

**Recommended authority:** Open PR only

**Rationale:** Breaking configuration change (explicit tier + removal of packaged maintainer destination) → semver **`2.0.0`**, plus public OSS documentation accuracy.

**Agent instruction:** savepoints-lite hub only; may combine with `release-verification` in one merge-safe PR; do not merge, publish npm, or edit cursor-team-marketplace.

**Goal:** Implement configuration contract (above), package cleanup, tests, and documentation.

**Acceptance:**

- **Skills / config:** tier-1 labelled `destination.data_source_id` YAML block in integration instruction context (unchanged into provider); tier 2 optional `.agents`; tier 3 packaged defaults file retained with **`destination.data_source_id` omitted**; provider does not read User Rules; tier-1-invalid no fallback; missing valid destination fail-open without MCP write
- [`skills/savepoints-notion/defaults.yml`](skills/savepoints-notion/defaults.yml): omit `destination.data_source_id` entirely (no empty string, placeholder, or maintainer id)
- [`templates/consumer/savepoints-notion.yml.example`](templates/consumer/savepoints-notion.yml.example) with `YOUR_NOTION_DATA_SOURCE_ID`
- [`scripts/expected-package-paths.txt`](scripts/expected-package-paths.txt) updated if new template paths ship
- Tests updated: no usable `destination.data_source_id` in shipped defaults; no maintainer UUID in tarball paths; precedence / fail-open / tier-1-invalid-no-fallback invariants as practical
- **Documentation:** README, [`AGENTS.md`](AGENTS.md), [`docs/adopt.md`](docs/adopt.md), [`docs/architecture.md`](docs/architecture.md), [`docs/publishing.md`](docs/publishing.md), [`skills/README.md`](skills/README.md) — `@2.0.0` messaging, installation, explicit-integration precedence, provider-neutral external integration example
- **Privacy:** what session Savepoints write to Notion; host-owned Notion MCP auth; no credentials or personal destination IDs in the package
- **Reliability:** best-effort fail-open, no retry queue, instruction-only, bounded async confirmation
- **Maintenance / support:** public npm and GitHub; no implied SLA; preserve [`docs/adoption-verification-record.md`](docs/adoption-verification-record.md) history (not in tarball)
- **Scope guard:** no new `CONTRIBUTING.md`, `SECURITY.md`, or issue-template governance infra
- `"version": "2.0.0"` in hub `package.json`; devDependency self-pin remains **`1.1.0`** until post-publish follow-up
- Ready PR opened (Open PR only)

---

## Slice — release-verification

**Recommended authority:** Open PR only

**Rationale:** Prove release candidate layout and gates before operator publish; document publish procedure.

**Agent instruction:** savepoints-lite hub only; may be same PR as `oss-readiness-contract`; do not `npm publish`.

**Goal:** Full hub verification and operator publish checklist alignment.

**Acceptance:**

- `npm ci` reproducible (registry install of `@1.1.0` devDependency succeeds)
- `npm test` passes including **split** workspace 2.0.0 pack vs registry `@1.1.0` dogfood checks (no weakening)
- `npm run verify` passes for workspace **2.0.0** candidate vs `expected-package-paths.txt`
- `npm run validate:plans` passes
- Tarball candidate: shipped [`skills/savepoints-notion/defaults.yml`](skills/savepoints-notion/defaults.yml) has no `destination.data_source_id` (grep / invariant tests)
- [`docs/publishing.md`](docs/publishing.md) (or release PR body) reflects operator preflight: `npm view @multipliers-dev/savepoints-lite@2.0.0 version` must 404 before publish; post-publish install check documented
- Post-publish hub dogfood bump to `2.0.0` documented as follow-up PR (not executed in agent slice)
- Mark `release-verification` completed when merged with passing gates

---

## Slice — plan-closure

**Recommended authority:** Open PR only

**Rationale:** Archive completed plan per repository convention after shipped release.

**Agent instruction:** Docs-only; move plan to [`.cursor/plans/archive/`](archive/). **Prerequisite:** `@multipliers-dev/savepoints-lite@2.0.0` **published and verified on npm** — implementation merged alone is insufficient. Operator publish per [`docs/publishing.md`](docs/publishing.md); agents do not `npm publish`.

**Acceptance:**

- Registry evidence that `@2.0.0` exists (`npm view @multipliers-dev/savepoints-lite@2.0.0 version` or equivalent)
- Successful post-publication clean install / package verification recorded (per publishing runbook)
- `# Shipped` note with implementation PR links, publish date, registry version, and verification summary **before** archive
- Plan moved to `.cursor/plans/archive/2026-10-27-oss-readiness-cleanup.plan.md`
- `plan-closure` todo completed; agent prompt references updated to archived path
- `npm run validate:plans` passes

---

## Agent prompts (copy/paste for Cursor)

### oss-readiness-contract

```text
@.cursor/plans/2026-10-27-oss-readiness-cleanup.plan.md

Implement slice oss-readiness-contract only on multipliers-dev/savepoints-lite.

Authority: Open PR only — do not merge, npm publish, or edit cursor-team-marketplace.

Topology: git fetch; branch from latest origin/main; PR base main; hub repo only — no consumer-repository PRs.

Deliverables: @2.0.0 contract per plan Decisions — tier 1 labelled destination/data_source_id YAML block in integration instruction context (router passes unchanged to provider; no integration.* namespace); tier 2 optional .agents/savepoints-notion.yml; tier 3 skills/savepoints-notion/defaults.yml retained with destination.data_source_id omitted entirely; tier-1-invalid fail open without fallback; tests assert no usable destination.data_source_id in shipped defaults; templates/consumer/savepoints-notion.yml.example; expected-package-paths.txt if needed; README, AGENTS.md, docs/, skills/README (privacy, reliability, maintenance, provider-neutral handoff in architecture/adopt). Hub package.json version 2.0.0; devDependencies self-pin stays 1.1.0 until post-publish follow-up.

Do not: marketplace vendoring, wrapper skills, User Rules, consumer cleanup, or per-repo migration PRs.

Verification: npm test && npm run verify && npm run validate:plans. Mark oss-readiness-contract completed in frontmatter in the same PR (combine with release-verification in one PR if merge-safe).
```

### release-verification

```text
@.cursor/plans/2026-10-27-oss-readiness-cleanup.plan.md

Implement slice release-verification only on multipliers-dev/savepoints-lite.

Authority: Open PR only — do not merge or npm publish.

Topology: origin/main; PR base main. May combine with oss-readiness-contract in one merge-safe PR if not already done.

Deliverables: npm ci reproducible; split workspace 2.0.0 pack verification vs registry @1.1.0 dogfood tests (no gate weakening); operator publish checklist aligned with docs/publishing.md; document post-publish hub dogfood bump follow-up PR.

Do not: npm publish, consumer-repo work, or cursor-team-marketplace edits.

Verification: npm ci && npm test && npm run verify && npm run validate:plans. Mark release-verification completed in frontmatter in the same PR.
```

### plan-closure

```text
@.cursor/plans/2026-10-27-oss-readiness-cleanup.plan.md

Implement slice plan-closure only.

Authority: Open PR only — docs-only archive PR; do not merge.

Prerequisites: oss-readiness-contract and release-verification merged; operator published and verified @multipliers-dev/savepoints-lite@2.0.0 on npm (registry + post-publish install check — merged implementation alone is insufficient). Do not npm publish in this slice.

Topology: savepoints-lite hub; branch from origin/main; PR base main.

Deliverables: # Shipped with implementation PR links, publish date, npm view evidence, and post-publication verification summary; then move plan to .cursor/plans/archive/2026-10-27-oss-readiness-cleanup.plan.md; mark plan-closure completed; update references to archived path.

Verification: npm run validate:plans.
```
