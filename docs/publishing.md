# Publishing @multipliers-dev/savepoints-lite

Operator-controlled npm releases for an instruction-only package (skills and docs; no `bin` or runtime).

**Mechanism:** [GitHub Trusted Publishing](https://docs.npmjs.com/trusted-publishers) via [`.github/workflows/publish.yml`](../.github/workflows/publish.yml) — manual `workflow_dispatch` on **`main` only**. The workflow uses GitHub Actions OIDC (`id-token: write`) to authenticate to npm. Do not use `NPM_TOKEN`, `NODE_AUTH_TOKEN`, or local `npm publish` for registry releases.

**Publication ≠ adoption:** A registry release makes a version installable. Consumer activation and agent behavior are separate — see [adopt.md](./adopt.md). Package design boundaries: [architecture.md](./architecture.md).

## Before you release

- Merge the intended release to **`main`** and bump **`package.json`** semver ([immutable versions](https://docs.npmjs.com/about-semantic-versioning#specify-version-ranges-using-semantic-versioning-specifiers-comparators) — never republish an existing version).
- Confirm npm **Trusted Publisher** for this repo: GitHub Actions, `multipliers-dev` / `savepoints-lite`, workflow file **`publish.yml`**, no environment.
- `publishConfig.provenance` is `true`; the workflow publishes with `--provenance`.
- On a clean checkout of that commit, run:

  ```bash
  npm ci
  npm test
  npm run verify
  ```

  `npm run verify` is the source of truth for tarball contents (`npm pack --dry-run` path allowlist).
- Preflight the registry: `npm view @multipliers-dev/savepoints-lite@<version> version` must **404** for the new version. (The workflow repeats this check and fails if the version already exists or the registry response is ambiguous.)

## Publish (GitHub Actions)

1. **Actions** → **Publish savepoints-lite (manual)** → **Run workflow**.
2. Branch: **`main`**.
3. **confirm_version:** exact semver from `package.json` (whitespace trimmed; must match or the run fails).
4. Wait for success. The workflow runs on **Node 24**, reinstalls a current npm CLI for OIDC, then `npm ci`, `npm test`, `npm run verify`, asserts a clean working tree, registry preflight, and `npm publish --provenance --access public --ignore-scripts`. No push/tag/schedule triggers.

## After publish

**Registry**

```bash
npm view @multipliers-dev/savepoints-lite@<version> version --prefer-online
npm view @multipliers-dev/savepoints-lite dist-tags --json --prefer-online
```

**Clean consumer install** (outside any repo checkout):

```bash
npm init -y
npm install "@multipliers-dev/savepoints-lite@<version>" --prefer-online
```

Confirm the installed package version matches the release and expected skills/docs are present under `node_modules/@multipliers-dev/savepoints-lite/` (router and Notion provider entry points, defaults, shipped documentation).

**Provenance:** On npmjs.com, open the version page and confirm the provenance / build attestation links to `multipliers-dev/savepoints-lite` and the workflow run. Do not disable `publishConfig.provenance` to work around publish failures — fix Trusted Publishing or the workflow instead.

Record version, date, commit, and install-check summary for maintainers (e.g. release PR or internal log).

## Later releases

Bump semver on `main` for every publish. Consumers should pin an **exact** version and commit a lockfile; use Renovate or equivalent for updates. Patch releases do not change installed paths under `node_modules`.
