#!/usr/bin/env node
/*!
 * GENERATED FILE — DO NOT EDIT.
 * Source: src/validate/cli.ts (+ normalize-input.ts, notion-fetch-input.ts,
 * validate.ts, load-contract.ts, notion-value.ts).
 * Rebuild: npm run build (commit skills/bin/ with the package — required for
 * marketplace vendor sync without consumer builds).
 */

// src/validate/cli.ts
import { resolve } from "node:path";

// src/validate/load-contract.ts
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
var SCHEMA_REL = "skills/savepoints/schema.json";
var MAPPING_REL = "skills/savepoints-notion/mapping.json";
function findPackageRootFrom(startDir) {
  let dir = startDir;
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, SCHEMA_REL)) && existsSync(join(dir, MAPPING_REL))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(
    `could not locate Savepoints Lite install root from ${startDir} (missing ${SCHEMA_REL} / ${MAPPING_REL})`
  );
}
function packageRootFromHere() {
  return findPackageRootFrom(dirname(fileURLToPath(import.meta.url)));
}
function resolvePackageRoot(explicit) {
  if (explicit) {
    return findPackageRootFrom(explicit);
  }
  return packageRootFromHere();
}
function loadSchema(packageRoot) {
  const raw = readFileSync(join(packageRoot, SCHEMA_REL), "utf8");
  return JSON.parse(raw);
}
function loadNotionMapping(packageRoot) {
  const raw = readFileSync(join(packageRoot, MAPPING_REL), "utf8");
  return JSON.parse(raw);
}

// src/validate/notion-fetch-input.ts
var PROPERTIES_BLOCK = /<properties>([\s\S]*?)<\/properties>/;
function hasPropertiesBlock(text) {
  return PROPERTIES_BLOCK.test(text);
}
function isFetchEnvelope(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const text = value.text;
  return typeof text === "string" && hasPropertiesBlock(text);
}
function adaptFetchText(text, pageId) {
  const match = PROPERTIES_BLOCK.exec(text);
  if (!match) {
    return { ok: false, message: "no <properties> block found in input" };
  }
  let persisted;
  try {
    persisted = JSON.parse(match[1]);
  } catch {
    return {
      ok: false,
      message: "<properties> block does not contain valid JSON"
    };
  }
  if (persisted === null || typeof persisted !== "object" || Array.isArray(persisted)) {
    return {
      ok: false,
      message: "<properties> block must contain a JSON object"
    };
  }
  const input = {
    persisted
  };
  if (typeof pageId === "string" && pageId.trim()) {
    input.page_id = pageId.trim();
  }
  return { ok: true, input };
}

// src/validate/normalize-input.ts
var UNRECOGNIZED = 'input must be {"persisted": {...}} JSON or a notion-fetch result containing a <properties> block';
function normalizeCliInput(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const adapted = adaptFetchText(raw);
    return adapted.ok ? { ok: true, input: adapted.input } : { ok: false, message: UNRECOGNIZED };
  }
  if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) && Object.prototype.hasOwnProperty.call(parsed, "persisted")) {
    return { ok: true, input: parsed };
  }
  if (isFetchEnvelope(parsed)) {
    const adapted = adaptFetchText(parsed.text, parsed.page_id);
    return adapted.ok ? { ok: true, input: adapted.input } : { ok: false, message: adapted.message };
  }
  return { ok: false, message: UNRECOGNIZED };
}

// src/validate/notion-value.ts
function textFromRichItem(item) {
  if (item === null || typeof item !== "object" || Array.isArray(item)) {
    return void 0;
  }
  const obj = item;
  if (typeof obj.plain_text === "string") {
    return obj.plain_text;
  }
  const text = obj.text;
  if (text !== null && typeof text === "object" && !Array.isArray(text)) {
    const content = text.content;
    if (typeof content === "string") {
      return content;
    }
  }
  return void 0;
}
function joinRichArray(items) {
  const parts = [];
  for (const item of items) {
    const part = textFromRichItem(item);
    if (part === void 0) {
      return void 0;
    }
    parts.push(part);
  }
  return parts.join("");
}
function fromRichArray(value) {
  if (!Array.isArray(value)) {
    return void 0;
  }
  if (value.length === 0) {
    return { kind: "absent" };
  }
  const joined = joinRichArray(value);
  if (joined === void 0) {
    return { kind: "unsupported" };
  }
  const trimmed = joined.trim();
  return trimmed.length > 0 ? { kind: "present", text: trimmed } : { kind: "absent" };
}
var RICH_KEYS = ["title", "rich_text", "text"];
function preferredKeys(type) {
  if (type === "title") return ["title"];
  if (type === "rich_text" || type === "text") return ["rich_text", "text"];
  return RICH_KEYS;
}
function fromPropertyObject(value) {
  let sawAbsent = false;
  const considerKey = (key) => {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      return void 0;
    }
    const fromArray = fromRichArray(value[key]);
    if (fromArray === void 0) {
      return { kind: "unsupported" };
    }
    if (fromArray.kind === "present" || fromArray.kind === "unsupported") {
      return fromArray;
    }
    sawAbsent = true;
    return void 0;
  };
  for (const key of preferredKeys(value.type)) {
    const outcome = considerKey(key);
    if (outcome) return outcome;
  }
  for (const key of RICH_KEYS) {
    const outcome = considerKey(key);
    if (outcome) return outcome;
  }
  return sawAbsent ? { kind: "absent" } : { kind: "unsupported" };
}
function interpretNotionPropertyValue(value) {
  if (value === void 0 || value === null) {
    return { kind: "absent" };
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? { kind: "present", text: trimmed } : { kind: "absent" };
  }
  if (Array.isArray(value)) {
    return fromRichArray(value) ?? { kind: "unsupported" };
  }
  if (typeof value === "object") {
    return fromPropertyObject(value);
  }
  return { kind: "unsupported" };
}

// src/validate/validate.ts
var REPOSITORY_FORMAT = /^[^\s/]+\/[^\s/]+$/;
function propertyValue(persisted, property) {
  if (Object.prototype.hasOwnProperty.call(persisted, property)) {
    return persisted[property];
  }
  return void 0;
}
function validatePersistedProperties(input, schema, mapping) {
  const issues = [];
  const warnings = [];
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return {
      ok: false,
      issues: [
        {
          kind: "invalid_input",
          message: "input must be an object with a persisted properties map"
        }
      ]
    };
  }
  const body = input;
  const pageId = typeof body.page_id === "string" && body.page_id.trim() ? body.page_id.trim() : void 0;
  if (body.persisted === null || typeof body.persisted !== "object" || Array.isArray(body.persisted)) {
    return {
      ok: false,
      page_id: pageId,
      issues: [
        {
          kind: "invalid_input",
          message: "persisted must be a plain object of Notion property values"
        }
      ]
    };
  }
  const persisted = body.persisted;
  const topLevel = schema.fields ?? {};
  for (const [field, def] of Object.entries(topLevel)) {
    if (field === "content") continue;
    if (!def || def.required !== true) continue;
    const mapEntry = mapping.fields?.[field];
    if (!mapEntry || typeof mapEntry.property !== "string") {
      issues.push({
        kind: "contract_mismatch",
        field,
        message: `required schema field "${field}" has no Notion mapping`
      });
      continue;
    }
    const raw = propertyValue(persisted, mapEntry.property);
    const outcome = interpretNotionPropertyValue(raw);
    if (outcome.kind === "present") {
      if (field === "repository" && !REPOSITORY_FORMAT.test(outcome.text)) {
        warnings.push({
          kind: "repository_format",
          field,
          property: mapEntry.property,
          message: `"${mapEntry.property}" is not in owner/repo form (advisory; not repaired)`
        });
      }
      continue;
    }
    if (outcome.kind === "unsupported") {
      issues.push({
        kind: "unsupported_property_shape",
        field,
        property: mapEntry.property,
        message: `required field "${field}" mapped to "${mapEntry.property}" has an unsupported Notion property shape (not treated as missing)`
      });
      continue;
    }
    issues.push({
      kind: "missing_persisted_property",
      field,
      property: mapEntry.property,
      message: `required field "${field}" mapped to "${mapEntry.property}" is missing or empty`
    });
  }
  return {
    ok: issues.length === 0,
    issues,
    page_id: pageId,
    ...warnings.length > 0 ? { warnings } : {}
  };
}

// src/validate/cli.ts
var IMPLICIT_STDIN_IDLE_MS = 3e3;
var ACCEPTED_FLAGS = "--stdin, --input <json>, --package-root <dir>, --help";
function printHelp() {
  process.stdout.write(`savepoints-lite-validate — deterministic Savepoint property check

Usage:
  savepoints-lite-validate < fetch-result.txt
  savepoints-lite-validate --input '<json>'
  savepoints-lite-validate --stdin
  savepoints-lite-validate --package-root <dir> --stdin

Example (heredoc; the closing EOF must start at column 0):

node /path/to/install-root/skills/bin/savepoints-lite-validate.mjs <<'EOF'
<properties>
{...properties block from the notion-fetch result...}
</properties>
EOF

Input is read from stdin when piped (no flag needed), or from --input.
--stdin is the explicit form and waits for EOF.
--package-root is optional. When omitted, the CLI locates the same install root
that contains skills/savepoints/ and skills/savepoints-notion/ (standalone npm
or marketplace vendor tree).

Accepted input:
  { "persisted": { "Name": "...", "Repository": "...", "Agent": "..." }, "page_id": "optional" }
  a notion-fetch result (raw or JSON with a string "text") containing a <properties>...</properties> block

Output: JSON { ok, issues, page_id?, warnings? }. warnings is advisory and omitted when empty.
Exit codes: 0 ok | 1 issues | 2 usage/runtime/invalid input
Requires Node.js >= 22. No npm install in the consumer repo is required when
invoking this self-contained file directly (node path/to/savepoints-lite-validate.mjs).
`);
}
function parseArgs(argv) {
  let packageRoot;
  let stdin = false;
  let input;
  let help = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      help = true;
    } else if (arg === "--stdin") {
      stdin = true;
    } else if (arg === "--package-root") {
      const next = argv[++i];
      if (next === void 0 || next.startsWith("-")) {
        throw new Error(
          "--package-root requires a directory path (got missing or flag value)"
        );
      }
      packageRoot = next;
    } else if (arg === "--input") {
      const next = argv[++i];
      if (next === void 0 || next.startsWith("-") && next !== "-") {
        throw new Error(
          "--input requires a JSON string (got missing or flag value)"
        );
      }
      input = next;
    } else {
      throw new Error(`unknown argument: ${arg} (accepted: ${ACCEPTED_FLAGS})`);
    }
  }
  return { packageRoot, stdin, input, help };
}
var NoInputError = class extends Error {
  constructor() {
    super("no input");
  }
};
function readStdin(idleMs) {
  return new Promise((resolvePromise, reject) => {
    const chunks = [];
    let timer;
    const stopTimer = () => {
      if (timer !== void 0) {
        clearTimeout(timer);
        timer = void 0;
      }
    };
    if (idleMs !== void 0) {
      timer = setTimeout(() => reject(new NoInputError()), idleMs);
    }
    process.stdin.on("data", (chunk) => {
      stopTimer();
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    process.stdin.on("end", () => {
      stopTimer();
      resolvePromise(Buffer.concat(chunks).toString("utf8"));
    });
    process.stdin.on("error", (err) => {
      stopTimer();
      reject(err);
    });
  });
}
function failInvalidInput(message) {
  process.stdout.write(
    JSON.stringify(
      { ok: false, issues: [{ kind: "invalid_input", message }] },
      null,
      2
    ) + "\n"
  );
  process.exit(2);
}
async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}
`);
    process.exit(2);
  }
  if (args.help) {
    printHelp();
    process.exit(0);
  }
  if (args.stdin && args.input !== void 0) {
    process.stderr.write("use only one of --stdin or --input\n");
    process.exit(2);
  }
  const implicitStdin = !args.stdin && args.input === void 0;
  if (implicitStdin && process.stdin.isTTY) {
    process.stderr.write(
      "no input: pipe a notion-fetch result or JSON on stdin, or pass --input <json>\n"
    );
    printHelp();
    process.exit(2);
  }
  let raw;
  try {
    raw = args.input !== void 0 ? args.input : await readStdin(implicitStdin ? IMPLICIT_STDIN_IDLE_MS : void 0);
  } catch (err) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}
`);
    process.exit(2);
  }
  if (implicitStdin && raw.trim() === "") {
    process.stderr.write("no input\n");
    process.exit(2);
  }
  const normalized = normalizeCliInput(raw);
  if (!normalized.ok) {
    failInvalidInput(normalized.message);
  }
  let packageRoot;
  try {
    packageRoot = resolve(
      resolvePackageRoot(args.packageRoot ? resolve(args.packageRoot) : void 0)
    );
  } catch (err) {
    process.stderr.write(
      `${err instanceof Error ? err.message : String(err)}
`
    );
    process.exit(2);
  }
  let schema;
  let mapping;
  try {
    schema = loadSchema(packageRoot);
    mapping = loadNotionMapping(packageRoot);
  } catch (err) {
    process.stderr.write(
      `failed to load schema/mapping from ${packageRoot}: ${err instanceof Error ? err.message : String(err)}
`
    );
    process.exit(2);
  }
  const result = validatePersistedProperties(normalized.input, schema, mapping);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  process.exit(result.ok ? 0 : result.issues.some((i) => i.kind === "invalid_input") ? 2 : 1);
}
main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}
`);
  process.exit(2);
});
