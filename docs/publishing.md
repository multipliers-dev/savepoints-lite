# Publishing @multipliers-dev/savepoints-lite

Operator-controlled npm releases for an instruction-only package (skills and docs; no `bin` or runtime).

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

After `@2.0.0` (or the released version) is on the registry:

1. Open a **separate** hub PR on `multipliers-dev/savepoints-lite`.
2. Bump `devDependencies["@multipliers-dev/savepoints-lite"]` to the new exact version and refresh `package-lock.json`.
3. Run `npm ci`, `npm test`, `npm run verify`, `npm run validate:plans`.
4. `npm test` selects the registry dogfood file manifest for the pinned version (`scripts/expected-package-paths-registry-dogfood-<version>.txt`). When the pin matches workspace `2.0.0`, that manifest matches `expected-package-paths.txt`.

Do **not** bump the devDependency to a version that does not exist on npm (no `file:` link for dogfood).

### Hub session logging after the bump

`@1.1.0` packaged defaults included a maintainer `destination.data_source_id`. **`@2.0.0` does not** — the hub does not commit `.agents/savepoints-notion.yml` or a personal destination in this repository.

After the dogfood pin reaches `@2.0.0`, activated hub session logging **will not persist to Notion** until the operator supplies a valid destination through one of:

- **Tier 1:** explicit integration instruction context (e.g. a future team marketplace wrapper skill — not implemented in the hub repo); or
- **Tier 2:** optional `.agents/savepoints-notion.yml` in the hub checkout (operator-owned; use [`templates/consumer/savepoints-notion.yml.example`](../templates/consumer/savepoints-notion.yml.example) as a template only).

Do not reintroduce maintainer destination ids into packaged defaults, generic docs, or templates. Configuring hub logging is an operator step separate from bumping the devDependency.

## Later releases

Bump semver on `main` for every publish. Consumers should pin exact versions and commit lockfiles.
