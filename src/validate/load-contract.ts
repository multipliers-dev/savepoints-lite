import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { MappingDocument, SchemaDocument } from "./types.js";

function packageRootFromHere(): string {
  // src/validate → package root (dev) or dist → package root (built)
  const here = dirname(fileURLToPath(import.meta.url));
  if (here.endsWith(`${join("src", "validate")}`) || here.endsWith("src/validate")) {
    return join(here, "../..");
  }
  // dist/savepoints-lite-validate.mjs → package root
  return join(here, "..");
}

export function resolvePackageRoot(explicit?: string): string {
  return explicit ?? packageRootFromHere();
}

export function loadSchema(packageRoot: string): SchemaDocument {
  const raw = readFileSync(
    join(packageRoot, "skills/savepoints/schema.json"),
    "utf8",
  );
  return JSON.parse(raw) as SchemaDocument;
}

export function loadNotionMapping(packageRoot: string): MappingDocument {
  const raw = readFileSync(
    join(packageRoot, "skills/savepoints-notion/mapping.json"),
    "utf8",
  );
  return JSON.parse(raw) as MappingDocument;
}
