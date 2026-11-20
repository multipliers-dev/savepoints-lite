# Publishing @multipliers-dev/savepoints-lite

Operator-controlled npm releases for an **instruction-first** package: router and provider skills plus docs. There is **no** custom MCP server and **no** persistent runtime service. An optional bundled validation CLI (`skills/bin/savepoints-lite-validate.mjs`, npm bin `savepoints-lite-validate`) ships in the tarball for opt-in post-write checks — not a required daemon.

**Mechanism:** [GitHub Trusted Publishing](https://docs.npmjs.com/trusted-publishers) via the repository [publish workflow](https://github.com/multipliers-dev/savepoints-lite/blob/main/.github/workflows/publish.yml) — manual `workflow_dispatch` on **`main` only**. OIDC (`id-token: write`); do not use long-lived `NPM_TOKEN` for registry releases.

**Publication ≠ adoption:** A registry release makes a version installable. Consumer activation and destination configuration are separate — see [adopt.md](./adopt.md).

## Operator checklist (before publish)

- [ ] Intended release merged to **`main`** with workspace `"version"` matching the release (e.g. `2.0.0`).
- [ ] **Preflight registry:** `npm view @multipliers-dev/savepoints-lite@<version> version` must **404** (workflow repeats this; ambiguous responses fail the run).
- [ ] Clean checkout of that commit:

  ```bash
  npm ci
  npm test
  npm run verify
  npm run validate:plans
  ```

  - `npm run verify` — workspace **release-candidate** tarball (`expected-package-paths.txt`).
  - `npm test` — includes **registry dogfood** layout under `node_modules/` (pinned devDependency until post-publish bump).

- [ ] Trusted Publisher configured: GitHub Actions, `multipliers-dev` / `savepoints-lite`, workflow **`publish.yml`**.
- [ ] `publishConfig.provenance` is `true`.

## Publish (GitHub Actions)

1. **Actions** → **Publish savepoints-lite (manual)** → **Run workflow**.
2. Branch: **`main`**.
3. **confirm_version:** exact semver from `package.json`.
4. Wait for success (`npm ci`, `npm test`, `npm run verify`, clean tree, preflight, `npm publish --provenance --access public --ignore-scripts`).

## After publish

**Registry evidence**

```bash
npm view @multipliers-dev/savepoints-lite@<version> version --prefer-online
npm view @multipliers-dev/savepoints-lite dist-tags --json --prefer-online
```

**Clean consumer install** (outside any repo checkout):

```bash
npm init -y
npm install "@multipliers-dev/savepoints-lite@<version>" --prefer-online
```

Confirm version, router/provider skills, docs, templates (including `savepoints-notion.yml.example`), and packaged Notion defaults **without** `destination.data_source_id`.

**Provenance:** On npmjs.com, confirm attestation links to this repo and the workflow run.

Record version, date, commit, and install-check summary (release PR or maintainer log).

## Post-publish hub dogfood bump (follow-up PR)

After the released version is on the registry (e.g. `@2.1.0`):

1. Open a **separate** hub PR on `multipliers-dev/savepoints-lite`.
2. Bump `devDependencies["@multipliers-dev/savepoints-lite"]` to the new exact version and refresh `package-lock.json`.
3. Run `npm ci`, `npm test`, `npm run verify`, `npm run validate:plans`.
4. `npm test` selects the registry dogfood file manifest for the pinned version (`scripts/expected-package-paths-registry-dogfood-<version>.txt`). When the pin matches the workspace `"version"`, that manifest matches `expected-package-paths.txt`.

Do **not** bump the devDependency to a version that does not exist on npm (no `file:` link for dogfood).

### Hub session logging (marketplace integration)

`@1.1.0` packaged defaults included a maintainer `destination.data_source_id`. **`@2.0.0` does not** — the hub does not commit `.agents/savepoints-notion.yml` or a personal destination in this repository.

Routine hub session logging uses the **team-harness** marketplace Savepoints wrapper with **tier-1** `destination` from global Cursor User Rules ([engineering invariants](https://github.com/multipliers-dev/cursor-team-marketplace/blob/main/docs/engineering-invariants.md)), not per-repo `AGENTS.md` activation or `node_modules` skills for instructions.

After publishing a release that changes the `skills/` inventory (including `skills/bin/savepoints-lite-validate.mjs`), marketplace maintainers must bump the pin and re-sync `plugins/team-harness/vendor/savepoints-lite/` so the vendor tree stays byte-identical to the published skills — see [adopt.md](./adopt.md) § [Cursor Team Marketplace](./adopt.md#cursor-team-marketplace) (team-harness **1.16.0+** already ships `@2.1.0`).

Do not reintroduce maintainer destination ids into packaged defaults, generic docs, or templates.

## Later releases

Bump semver on `main` for every publish. Consumers should pin exact versions and commit lockfiles.
