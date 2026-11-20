import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { MappingDocument, SchemaDocument } from "./types.js";

const SCHEMA_REL = "skills/savepoints/schema.json";
const MAPPING_REL = "skills/savepoints-notion/mapping.json";

/**
 * Locate the package-equivalent install root: the directory that contains
 * `skills/savepoints/` and `skills/savepoints-notion/`.
 *
 * Works for standalone npm (`node_modules/@multipliers-dev/savepoints-lite/`)
 * and marketplace vendor trees (`…/vendor/savepoints-lite/`) without assuming
 * the consumer repository layout.
 */
export function findPackageRootFrom(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < 8; i++) {
    if (
      existsSync(join(dir, SCHEMA_REL)) &&
      existsSync(join(dir, MAPPING_REL))
    ) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(
    `could not locate Savepoints Lite install root from ${startDir} (missing ${SCHEMA_REL} / ${MAPPING_REL})`,
  );
}

function packageRootFromHere(): string {
  return findPackageRootFrom(dirname(fileURLToPath(import.meta.url)));
}

export function resolvePackageRoot(explicit?: string): string {
  if (explicit) {
    return findPackageRootFrom(explicit);
  }
  return packageRootFromHere();
}

export function loadSchema(packageRoot: string): SchemaDocument {
  const raw = readFileSync(join(packageRoot, SCHEMA_REL), "utf8");
  return JSON.parse(raw) as SchemaDocument;
}

export function loadNotionMapping(packageRoot: string): MappingDocument {
  const raw = readFileSync(join(packageRoot, MAPPING_REL), "utf8");
  return JSON.parse(raw) as MappingDocument;
}
