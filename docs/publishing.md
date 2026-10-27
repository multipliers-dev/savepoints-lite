# Publishing @multipliers-dev/savepoints-lite

This document describes **operator-controlled** npm releases. The package ships instruction-only skills and docs — no `bin`, no compiled runtime.

**Automated publish from CI is out of scope.** Every registry publish requires explicit human authorization.

## Prerequisites

- Node.js **22+** (`engines` in `package.json`)
- npm account with permission to publish **`@multipliers-dev/savepoints-lite`** (org scope + package ACLs)
- [npm provenance](https://docs.npmjs.com/generating-provenance-statements) compatible publish environment when `publishConfig.provenance` is `true` (configured in `package.json`)
- Clean git checkout of the intended release commit on `main`

## Supported commands (hub / release checkout)

| Command | Purpose |
| --- | --- |
| `npm ci` | Reproducible install (lockfile) |
| `npm test` | Vitest package and skill invariant tests |
| `npm run verify` | Required files on disk + `npm pack --dry-run` path allowlist |
| `npm pack --dry-run` | Inspect tarball file list without writing `.tgz` |
| `npm publish` | **Operator only**, after authorization below |

## Prepublication verification

Before any publish:

1. Merge the **documentation** slice (README, `docs/architecture.md`, `docs/publishing.md` in tarball).
2. On a clean checkout: `npm ci`, `npm test`, `npm run verify`.
3. Run `npm pack --dry-run` and confirm the packed artifact includes at minimum:
   - `README.md`
   - `docs/adopt.md`
   - `docs/architecture.md`
   - `docs/publishing.md`
   - Router skill, Notion provider skill, `schema.md`, and both `defaults.yml` files
4. Confirm version in `package.json` matches the intended release (semver).
5. Operator confirms npm authentication and publication permissions.

If provenance cannot be established for the chosen publish method, **stop** and document the blocker — do not silently disable `publishConfig.provenance`.

## Initial release (v1.0.0)

Sequence (see implementation plan):

1. **protocol-core** merged — publishable package skeleton and skills.
2. **documentation** merged — public landing README and docs in tarball.
3. **npm-publication** (operator gate) — authorize, publish `@multipliers-dev/savepoints-lite@1.0.0`, record evidence.
4. **adopt-and-verify** — consumer adoption docs and manual agent verification against the **registry** version.

Local `npm pack` + `file:` install may help early smoke tests; it does **not** replace registry validation for adoption.

## Publish authorization

Required before `npm publish`:

- Intended version and commit hash agreed
- All prepublication checks green
- **Explicit operator approval** to publish to the public registry

Do not publish from an implementation PR unless the operator has granted publication authority for that run.

## Postpublish checks

After a successful publish:

1. Confirm the version appears on the public npm registry.
2. In a **clean temporary directory**, install only from the registry (e.g. `npm init -y`, add exact dependency `"@multipliers-dev/savepoints-lite": "<version>"`, `npm ci` or `npm install`).
3. Verify canonical skill paths under `node_modules/@multipliers-dev/savepoints-lite/skills/`.
4. Verify README and `docs/*.md` are present in the installed package.
5. Record evidence (version, date, install check summary) in the durable place agreed for the release (e.g. adoption PR, plan closure note, maintainer log).

## Subsequent releases

- Follow [semantic versioning](https://semver.org/): bump `package.json` version for every registry publish.
- **Immutable versions:** do not republish or overwrite an existing version; publish a new patch/minor/major as appropriate.
- Consumers should pin an **exact** semver in `package.json` and commit a lockfile; use Renovate or equivalent for bump PRs.
- Activation text can stay stable — installed paths under `node_modules` do not change across patch releases.

## What this package does not ship

- Installation CLI or bootstrap script
- Executable Savepoints runtime or custom MCP server
- Consumer activation templates (`templates/consumer/`) — **adopt-and-verify** slice

For architecture and adoption boundaries, see [architecture.md](./architecture.md) and the package [README](../README.md).
