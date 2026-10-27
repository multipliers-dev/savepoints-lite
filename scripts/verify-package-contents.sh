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

pack_list="$(npm pack --dry-run 2>&1)"
echo "$pack_list"

for tarball_path in \
  skills/savepoints/SKILL.md \
  skills/savepoints/schema.md \
  skills/savepoints/defaults.yml \
  skills/savepoints-notion/SKILL.md \
  skills/savepoints-notion/defaults.yml \
  skills/README.md \
  README.md \
  package.json
do
  if ! echo "$pack_list" | grep -q "$tarball_path"; then
    echo "verify-package-contents: npm pack --dry-run missing: $tarball_path" >&2
    exit 1
  fi
done

echo "verify-package-contents: ok"
