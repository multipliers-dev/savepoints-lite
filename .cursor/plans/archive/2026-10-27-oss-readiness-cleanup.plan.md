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
  - id: oss-readiness-and-release-prep
    content: "Hub PR: 2.0.0 contract, OSS docs, examples, split pack vs @1.1.0 dogfood tests; npm ci/test/verify/validate:plans pass; no npm publish"
    status: completed
  - id: plan-closure
    content: "Docs-only PR after @2.0.0 published and verified on npm: # Shipped with registry evidence, archive plan, update references"
    status: completed
isProject: false
---

# Shipped

**Archived 2026-10-27** in `multipliers-dev/savepoints-lite`.

| Slice | Delivered |
| --- | --- |
| plan-review | [PR #13](https://github.com/multipliers-dev/savepoints-lite/pull/13) — phased OSS readiness plan |
| plan-revision-explicit-integration | [PR #14](https://github.com/multipliers-dev/savepoints-lite/pull/14) — `@2.0.0` explicit-integration contract and marketplace handoff |
| oss-readiness-and-release-prep | [PR #15](https://github.com/multipliers-dev/savepoints-lite/pull/15) — hub implementation merged `257eca5` |
| Post-publish hub dogfood | [PR #16](https://github.com/multipliers-dev/savepoints-lite/pull/16) — devDependency pin `2.0.0` aligned with workspace (`6c0c3be`) |
| plan-closure | [PR #17](https://github.com/multipliers-dev/savepoints-lite/pull/17) — this archive |

### npm publication evidence (`@2.0.0`)

| Check | Result | Date (UTC) |
| --- | --- | --- |
| Operator publish | [Actions run #40509805580](https://github.com/multipliers-dev/savepoints-lite/actions/runs/40509805580) **success** on `main` @ `257eca5`; `npm publish` reported `@multipliers-dev/savepoints-lite@2.0.0` with provenance (16 files) | 2026-10-27 |
| `npm view @multipliers-dev/savepoints-lite@2.0.0 version` | `2.0.0` | 2026-10-27 (verified at plan-closure) |
| `npm view @multipliers-dev/savepoints-lite dist-tags.latest` | `2.0.0` | 2026-10-27 (verified at plan-closure) |

### Post-publication verification

- **Clean install (outside repo):** `npm install @multipliers-dev/savepoints-lite@2.0.0` → installed `package.json` version `2.0.0`; **16** files under `node_modules/@multipliers-dev/savepoints-lite/`; `templates/consumer/savepoints-notion.yml.example` present; packaged `skills/savepoints-notion/defaults.yml` has no usable `destination.data_source_id` key (comment-only file).
- **Hub after [PR #16](https://github.com/multipliers-dev/savepoints-lite/pull/16):** `devDependencies["@multipliers-dev/savepoints-lite"]` matches workspace `2.0.0`; `npm test` registry dogfood layout uses `scripts/expected-package-paths-registry-dogfood-2.0.0.txt` aligned with `expected-package-paths.txt`.

**Out of scope (follow-on):** [cursor-team-marketplace Savepoints distribution plan](https://github.com/multipliers-dev/cursor-team-marketplace/blob/main/.cursor/plans/2026-10-27-savepoints-marketplace-distribution.plan.md); hub operator Notion destination for session logging (tier 1 marketplace or `.agents/savepoints-notion.yml`) per [`docs/publishing.md`](../../../docs/publishing.md).

---

# Savepoints Lite public OSS readiness (@2.0.0)

## Recommended execution authority

| Slice | Recommended authority | Agent instruction |
| --- | --- | --- |
| plan-review | Plan-only PR | Completed via [PR #13](https://github.com/multipliers-dev/savepoints-lite/pull/13). |
| plan-revision-explicit-integration | Plan-only PR | Revise plan only; do not implement slices. Stop after opening the plan-only PR. |
| oss-readiness-and-release-prep | Open PR only | One merge-safe hub PR: contract, OSS docs, verification, and gates. Do not edit cursor-team-marketplace. Do not merge or `npm publish`. |
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
| Configuration contract + OSS docs/tests + verification | savepoints-lite (`oss-readiness-and-release-prep`) | One merge-safe PR; agent does not `npm publish` |
| Registry publish | Operator (`gate-publish` in marketplace plan) | [`docs/publishing.md`](docs/publishing.md) workflow |
| Marketplace vendoring, wrapper skill, User Rules, consumer cleanup | cursor-team-marketplace | **After** publish only |

**Final deliverable from this repository:** operator-published, verified `@multipliers-dev/savepoints-lite@2.0.0` on the public npm registry.

**Out of scope here:** marketplace `vendor/` sync, team-harness wrapper skills, engineering invariants / User Rules, removing per-repo npm deps or `AGENTS.md` activation.

**Coordination:**

> Cursor Team Marketplace treats the published Savepoints Lite 2.0.0 release as an external prerequisite. All OSS readiness and configuration-contract implementation is owned by this repository.

### Execution flow

```mermaid
flowchart TB
  impl[oss_readiness_and_release_prep]
  pub[Operator_publish_2_0_0]
  close[plan_closure]
  mkt[Marketplace_after_publish]
  impl --> pub
  pub --> mkt
  pub --> close
```

**`plan-closure` runs only after `@2.0.0` is published and verified on npm** — merging `oss-readiness-and-release-prep` alone is not sufficient (see **Plan closure** under Decisions).

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

**Agent instruction:** Commit revised plan only; do not implement `oss-readiness-and-release-prep` or later slices.

**Acceptance:**

- Archived plan reflects explicit-integration contract and marketplace handoff
- `npm run validate:plans` passes
- `plan-revision-explicit-integration` marked `completed` in frontmatter

---

## Slice — oss-readiness-and-release-prep

**Recommended authority:** Open PR only

**Rationale:** Breaking configuration change (explicit tier + removal of packaged maintainer destination) → semver **`2.0.0`**, plus public OSS documentation and **merge-safe** verification (workspace `2.0.0` pack vs registry `@1.1.0` dogfood) in one PR.

**Agent instruction:** savepoints-lite hub only; **one** merge-safe implementation PR; do not merge, `npm publish`, or edit cursor-team-marketplace.

**Goal:** Configuration contract (above), package cleanup, OSS docs, examples, version bump, split verification, and all test/package-manifest changes required for gates to pass with devDependency pin **`1.1.0`**.

**Acceptance:**

- **Skills / config:** tier-1 labelled `destination.data_source_id` YAML block in integration instruction context (unchanged into provider); tier 2 optional `.agents`; tier 3 packaged defaults file retained with **`destination.data_source_id` omitted**; provider does not read User Rules; tier-1-invalid no fallback; missing valid destination fail-open without MCP write
- [`skills/savepoints-notion/defaults.yml`](skills/savepoints-notion/defaults.yml): omit `destination.data_source_id` entirely (no empty string, placeholder, or maintainer id)
- [`templates/consumer/savepoints-notion.yml.example`](templates/consumer/savepoints-notion.yml.example) with `YOUR_NOTION_DATA_SOURCE_ID`
- [`scripts/expected-package-paths.txt`](scripts/expected-package-paths.txt) updated when new paths ship
- Tests updated: no usable `destination.data_source_id` in shipped defaults; no maintainer UUID in tarball paths; precedence / fail-open / tier-1-invalid-no-fallback invariants as practical; **split** workspace **2.0.0** pack vs installed registry **`@1.1.0`** dogfood layout checks (extend tests/scripts as needed — **do not weaken or skip** existing registry-dogfood assertions)
- **Documentation:** README, [`AGENTS.md`](AGENTS.md), [`docs/adopt.md`](docs/adopt.md), [`docs/architecture.md`](docs/architecture.md), [`docs/publishing.md`](docs/publishing.md), [`skills/README.md`](skills/README.md) — `@2.0.0` messaging, installation, explicit-integration precedence, provider-neutral external integration example; operator preflight (`npm view …@2.0.0` must 404 before publish) and post-publish install check; post-publish hub dogfood bump to `2.0.0` documented as follow-up PR (not executed in this slice)
- **Privacy:** what session Savepoints write to Notion; host-owned Notion MCP auth; no credentials or personal destination IDs in the package
- **Reliability:** best-effort fail-open, no retry queue, instruction-only, bounded async confirmation
- **Maintenance / support:** public npm and GitHub; no implied SLA; preserve [`docs/adoption-verification-record.md`](docs/adoption-verification-record.md) history (not in tarball)
- **Scope guard:** no new `CONTRIBUTING.md`, `SECURITY.md`, or issue-template governance infra
- `"version": "2.0.0"` in hub `package.json`; `devDependencies["@multipliers-dev/savepoints-lite"]` remains **`1.1.0`** until after operator publish
- **Gates (required before PR is merge-safe):** `npm ci` && `npm test` && `npm run verify` && `npm run validate:plans` — all pass
- Ready PR opened (Open PR only); mark `oss-readiness-and-release-prep` completed in frontmatter in the same PR

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

### oss-readiness-and-release-prep

```text
@.cursor/plans/archive/2026-10-27-oss-readiness-cleanup.plan.md

Implement slice oss-readiness-and-release-prep only on multipliers-dev/savepoints-lite.

Authority: Open PR only — one merge-safe hub PR; do not merge, npm publish, or edit cursor-team-marketplace.

Topology: git fetch; branch from latest origin/main; PR base main; hub repo only — no consumer-repository PRs.

Deliverables: @2.0.0 explicit-integration contract per plan Decisions (tier 1 destination/data_source_id YAML in instruction context; tier 2 optional .agents/savepoints-notion.yml; tier 3 defaults.yml with destination.data_source_id omitted); remove maintainer packaged defaults; templates/consumer/savepoints-notion.yml.example; expected-package-paths.txt and package manifest updates; README, AGENTS.md, docs/, skills/README (privacy, reliability, maintenance, provider-neutral handoff); hub package.json version 2.0.0 with devDependencies self-pin 1.1.0 until post-publish; split verification for workspace 2.0.0 pack vs registry @1.1.0 dogfood (extend tests — do not weaken registry-dogfood assertions); operator publish checklist in docs/publishing.md; document post-publish dogfood bump follow-up PR.

Do not: npm publish, marketplace vendoring, wrapper skills, User Rules, consumer cleanup, or per-repo migration PRs.

Verification: npm ci && npm test && npm run verify && npm run validate:plans — all pass. Mark oss-readiness-and-release-prep completed in frontmatter in the same PR.
```

### plan-closure

```text
@.cursor/plans/archive/2026-10-27-oss-readiness-cleanup.plan.md

Implement slice plan-closure only.

Authority: Open PR only — docs-only archive PR; do not merge.

Prerequisites: oss-readiness-and-release-prep merged; operator published and verified @multipliers-dev/savepoints-lite@2.0.0 on npm (registry + post-publish install check — merged implementation alone is insufficient). Do not npm publish in this slice.

Topology: savepoints-lite hub; branch from origin/main; PR base main.

Deliverables: # Shipped with implementation PR links, publish date, npm view evidence, and post-publication verification summary; then move plan to .cursor/plans/archive/2026-10-27-oss-readiness-cleanup.plan.md; mark plan-closure completed; update references to archived path.

Verification: npm run validate:plans.
```
