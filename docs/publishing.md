# Publishing @multipliers-dev/savepoints-lite

This document describes **operator-controlled** npm releases. The package ships instruction-only skills and docs — no `bin`, no compiled runtime.

**Standard mechanism:** [GitHub Trusted Publishing](https://docs.npmjs.com/trusted-publishers) via the manual workflow [`.github/workflows/publish.yml`](../.github/workflows/publish.yml) (`workflow_dispatch` on `main` only). The workflow authenticates with npm using GitHub Actions OIDC (`id-token: write`) — **no** `NPM_TOKEN` or `NODE_AUTH_TOKEN` secrets.

**Publication ≠ adoption:** Publishing puts a version on the public registry. Consumer activation, agent behavior, and Notion MCP writes are validated separately (see [adopt.md](./adopt.md) and the delivery plan **adopt-and-verify** slice).

## Prerequisites

- Node.js **22+** locally (`engines` in `package.json`); the publish workflow uses **Node 24**
- npm Trusted Publisher configured on npmjs.com for:
  - **Publisher:** GitHub Actions
  - **Organization:** `multipliers-dev`
  - **Repository:** `savepoints-lite`
  - **Workflow filename:** `publish.yml`
  - **Environment:** none
- Release commit merged to `main` with bumped `package.json` version (semver; immutable versions — never republish an existing version)
- `publishConfig.provenance` is `true` in `package.json`; the Trusted Publishing workflow publishes with `--provenance`

## Supported commands (hub / release checkout)

| Command | Purpose |
| --- | --- |
| `npm ci` | Reproducible install (lockfile) |
| `npm test` | Vitest package and skill invariant tests |
| `npm run verify` | Required files on disk + `npm pack --dry-run` path allowlist |
| `npm pack --dry-run` | Inspect tarball file list without writing `.tgz` |
| **Publish workflow** | **Operator only** — see below |

Local `npm publish` is not the supported path when provenance is required; use the GitHub Actions workflow after Trusted Publishing is configured.

## Prepublication verification (every release)

Before dispatching the publish workflow:

1. Confirm the release commit on `main` includes the intended public README, `LICENSE`, and `docs/**` files that should ship in the tarball.
2. On a clean checkout: `npm ci`, `npm test`, `npm run verify`.
3. Run `npm pack --dry-run` and confirm the packed artifact includes at minimum:
   - `README.md`
   - `LICENSE`
   - `docs/adopt.md`
   - `docs/architecture.md`
   - `docs/publishing.md`
   - Router skill, Notion provider skill, `schema.md`, and both `defaults.yml` files
4. Confirm `package.json` version matches the intended release semver and is **not** already on the registry (`npm view @multipliers-dev/savepoints-lite@<version> version` should 404).

The publish workflow repeats `npm ci`, `npm test`, `npm run verify`, asserts a clean working tree, and refuses to publish if the target version already exists on npm.

## Triggering a release (GitHub Actions)

1. Merge the version bump and release contents to `main`.
2. In GitHub: **Actions** → **Publish savepoints-lite (manual)** → **Run workflow**.
3. Select branch **`main`**.
4. Set **confirm_version** to the exact semver in `package.json` (e.g. `1.0.1`).
5. Run the workflow and wait for success.

The workflow will **not** run on push, tag, or schedule — only `workflow_dispatch`.

**First workflow exercise:** As of the **npm-publication** slice closure, Trusted Publishing is configured and `publish.yml` exists on `main`, but **no release has been published through this workflow yet**. The next registry publish after `1.0.0` should be the first provenance-attested release via OIDC.

## Postpublish checks

After a successful workflow publish:

1. Confirm the version on the registry:
   - `npm view @multipliers-dev/savepoints-lite@<version> version --prefer-online`
   - `npm view @multipliers-dev/savepoints-lite dist-tags --json --prefer-online`
2. In a **clean temporary directory** outside any consumer repo, install only from the registry:

   ```bash
   npm init -y
   npm install "@multipliers-dev/savepoints-lite@<version>" --prefer-online
   ```

3. Verify canonical skill paths:
   - `node_modules/@multipliers-dev/savepoints-lite/skills/savepoints/SKILL.md`
   - `node_modules/@multipliers-dev/savepoints-lite/skills/savepoints-notion/SKILL.md`
4. Verify router and provider defaults, `LICENSE`, README, and `docs/*.md` under the installed package.
5. Confirm installed `package.json` version matches the release and the package contains the expected **12** shipped files (see `scripts/expected-package-paths.txt`).
6. Record evidence (version, date, commit, install summary) for maintainers (e.g. adoption PR or plan closure note).

## Provenance

- **Subsequent releases (workflow):** `publish.yml` runs `npm publish --provenance --access public`. On npmjs.com, open the package version page and confirm provenance / build attestation links to this repository and the workflow run.
- **Initial `1.0.0` exception:** `1.0.0` was published manually with `npm publish --access public --provenance=false` because Trusted Publishing was not yet configured. That version has **no** npm provenance attestation; do not republish or overwrite `1.0.0`. Registry SHA-1 for the published tarball: `9735948f3bf01cc300b9781cdcb9d28368fde3ad` (matches local `npm pack` verification on the release commit).

Do not silently disable `publishConfig.provenance` for future releases; use the Trusted Publishing workflow instead.

## Initial release (`1.0.0`) — completed

Evidence recorded at **npm-publication** slice closure (2026-10-27):

| Check | Result |
| --- | --- |
| Registry version | `@multipliers-dev/savepoints-lite@1.0.0` |
| `dist-tags.latest` | `1.0.0` |
| Tarball SHA-1 | `9735948f3bf01cc300b9781cdcb9d28368fde3ad` |
| Hub `npm test` / `npm run verify` | 12 tests; 12 tarball paths |
| Clean registry install | 12 files; skills, defaults, docs, LICENSE present |
| Provenance | Omitted for `1.0.0` only (manual publish); workflow not yet exercised |

## Subsequent releases

- Follow [semantic versioning](https://semver.org/): bump `package.json` version for every registry publish.
- **Immutable versions:** do not republish or overwrite an existing version; publish a new patch/minor/major as appropriate.
- Consumers should pin an **exact** semver in `package.json` and commit a lockfile; use Renovate or equivalent for bump PRs.
- Activation text can stay stable — installed paths under `node_modules` do not change across patch releases.

## What this package does not ship

- Installation CLI or bootstrap script
- Executable Savepoints runtime or custom MCP server
- Consumer activation templates until a release explicitly ships them under `templates/` or equivalent packaged paths

For architecture and adoption boundaries, see [architecture.md](./architecture.md) and the package [README](../README.md).
