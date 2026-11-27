#!/usr/bin/env node
/**
 * Optional deterministic post-write validator CLI.
 * Does not call Notion; agents pass persisted properties after MCP read-back.
 *
 * Usage:
 *   savepoints-lite-validate [--package-root <path>] [--stdin | --input <json>]
 *   <payload> | savepoints-lite-validate        (implicit stdin when piped)
 *
 * Input (stdin or --input) is normalized once, then validated: structured
 * `{ "persisted": {...} }` JSON is the contract; a notion-fetch result with a
 * <properties> block is accepted as an agent convenience.
 *
 * When --package-root is omitted, the install root is discovered by walking up
 * from this executable until skills/savepoints/schema.json and
 * skills/savepoints-notion/mapping.json are found (npm or vendor layout).
 *
 * Exit: 0 ok, 1 validation issues, 2 invalid CLI/input/runtime
 */
import { resolve } from "node:path";

import { loadNotionMapping, loadSchema, resolvePackageRoot } from "./load-contract.js";
import { normalizeCliInput } from "./normalize-input.js";
import { validatePersistedProperties } from "./validate.js";

/** Implicit stdin only: no first byte or EOF within this window means no input. */
const IMPLICIT_STDIN_IDLE_MS = 3000;

const ACCEPTED_FLAGS = "--stdin, --input <json>, --package-root <dir>, --help";

function printHelp(): void {
  process.stdout.write(`savepoints-lite-validate — deterministic Savepoint property check

Usage:
  savepoints-lite-validate <<'EOF'
  <properties>
  {...properties block from the notion-fetch result...}
  </properties>
  EOF
  savepoints-lite-validate < fetch-result.txt
  savepoints-lite-validate --input '<json>'
  savepoints-lite-validate --stdin
  savepoints-lite-validate --package-root <dir> --stdin

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

function parseArgs(argv: string[]): {
  packageRoot?: string;
  stdin: boolean;
  input?: string;
  help: boolean;
} {
  let packageRoot: string | undefined;
  let stdin = false;
  let input: string | undefined;
  let help = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      help = true;
    } else if (arg === "--stdin") {
      stdin = true;
    } else if (arg === "--package-root") {
      const next = argv[++i];
      if (next === undefined || next.startsWith("-")) {
        throw new Error(
          "--package-root requires a directory path (got missing or flag value)",
        );
      }
      packageRoot = next;
    } else if (arg === "--input") {
      const next = argv[++i];
      if (next === undefined || (next.startsWith("-") && next !== "-")) {
        throw new Error(
          "--input requires a JSON string (got missing or flag value)",
        );
      }
      input = next;
    } else {
      throw new Error(`unknown argument: ${arg} (accepted: ${ACCEPTED_FLAGS})`);
    }
  }

  return { packageRoot, stdin, input, help };
}

class NoInputError extends Error {
  constructor() {
    super("no input");
  }
}

/**
 * Read stdin to EOF. With `idleMs`, reject with NoInputError when no byte or
 * EOF arrives in that window (an idle open pipe); the guard ends at the first
 * byte.
 */
function readStdin(idleMs?: number): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const chunks: Buffer[] = [];
    let timer: NodeJS.Timeout | undefined;
    const stopTimer = () => {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
    };
    if (idleMs !== undefined) {
      timer = setTimeout(() => reject(new NoInputError()), idleMs);
    }
    process.stdin.on("data", (chunk: Buffer | string) => {
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

function failInvalidInput(message: string): never {
  process.stdout.write(
    JSON.stringify(
      { ok: false, issues: [{ kind: "invalid_input", message }] },
      null,
      2,
    ) + "\n",
  );
  process.exit(2);
}

async function main(): Promise<void> {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(2);
  }

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (args.stdin && args.input !== undefined) {
    process.stderr.write("use only one of --stdin or --input\n");
    process.exit(2);
  }

  const implicitStdin = !args.stdin && args.input === undefined;
  if (implicitStdin && process.stdin.isTTY) {
    process.stderr.write(
      "no input: pipe a notion-fetch result or JSON on stdin, or pass --input <json>\n",
    );
    printHelp();
    process.exit(2);
  }

  let raw: string;
  try {
    raw =
      args.input !== undefined
        ? args.input
        : await readStdin(implicitStdin ? IMPLICIT_STDIN_IDLE_MS : undefined);
  } catch (err) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
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

  let packageRoot: string;
  try {
    packageRoot = resolve(
      resolvePackageRoot(args.packageRoot ? resolve(args.packageRoot) : undefined),
    );
  } catch (err) {
    process.stderr.write(
      `${err instanceof Error ? err.message : String(err)}\n`,
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
      `failed to load schema/mapping from ${packageRoot}: ${
        err instanceof Error ? err.message : String(err)
      }\n`,
    );
    process.exit(2);
  }

  const result = validatePersistedProperties(normalized.input, schema, mapping);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  process.exit(result.ok ? 0 : result.issues.some((i) => i.kind === "invalid_input") ? 2 : 1);
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(2);
});
