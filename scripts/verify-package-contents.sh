#!/usr/bin/env sh
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

required_paths="
skills/README.md
skills/savepoints/SKILL.md
skills/savepoints/schema.md
skills/savepoints/defaults.yml
skills/savepoints-notion/SKILL.md
skills/savepoints-notion/defaults.yml
README.md
package.json
"

for rel in $required_paths; do
  if [ ! -f "$rel" ]; then
    echo "verify-package-contents: missing required file: $rel" >&2
    exit 1
  fi
done

if grep -q 'docs/adopt.md' README.md 2>/dev/null; then
  echo "verify-package-contents: README.md must not reference docs/adopt.md (slice 2)" >&2
  exit 1
fi

if grep -qE 'savepoints-lite|savepoints.*logging|observe\.sh' .cursor/hooks.json 2>/dev/null; then
  echo "verify-package-contents: .cursor/hooks.json must not add Savepoints activity-capture hooks" >&2
  exit 1
fi

node --input-type=module <<'NODE'
import { execSync } from "node:child_process";

const expected = [
  "README.md",
  "package.json",
  "skills/README.md",
  "skills/savepoints-notion/defaults.yml",
  "skills/savepoints-notion/SKILL.md",
  "skills/savepoints/defaults.yml",
  "skills/savepoints/schema.md",
  "skills/savepoints/SKILL.md",
].sort();

const raw = execSync("npm pack --dry-run --json --ignore-scripts", {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, npm_config_ignore_scripts: "true" },
});

const jsonStart = raw.indexOf("[");
if (jsonStart < 0) {
  console.error(
    "verify-package-contents: npm pack --json produced no JSON array on stdout",
  );
  console.error(raw);
  process.exit(1);
}

const packs = JSON.parse(raw.slice(jsonStart));
if (!Array.isArray(packs) || packs.length !== 1) {
  console.error(
    "verify-package-contents: expected exactly one pack entry from npm pack --json",
  );
  process.exit(1);
}

const actual = (packs[0].files ?? []).map((f) => f.path).sort();

const missing = expected.filter((p) => !actual.includes(p));
const extra = actual.filter((p) => !expected.includes(p));

if (missing.length > 0 || extra.length > 0) {
  if (missing.length > 0) {
    console.error("verify-package-contents: tarball missing paths:");
    for (const p of missing) console.error(`  - ${p}`);
  }
  if (extra.length > 0) {
    console.error("verify-package-contents: unexpected tarball paths:");
    for (const p of extra) console.error(`  + ${p}`);
  }
  process.exit(1);
}

console.log(
  `verify-package-contents: npm pack paths ok (${actual.length} files, ${packs[0].filename})`,
);
NODE

echo "verify-package-contents: ok"
