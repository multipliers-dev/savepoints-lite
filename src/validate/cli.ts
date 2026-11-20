#!/usr/bin/env node
/**
 * Optional deterministic post-write validator CLI.
 * Does not call Notion; agents pass persisted properties after MCP read-back.
 *
 * Usage:
 *   savepoints-lite-validate --package-root <path> [--stdin | --input <json>]
 *
 * Exit: 0 ok, 1 validation issues, 2 invalid CLI/input/runtime
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { loadNotionMapping, loadSchema, resolvePackageRoot } from "./load-contract.js";
import { validatePersistedProperties } from "./validate.js";

function printHelp(): void {
  process.stdout.write(`savepoints-lite-validate — deterministic Savepoint property check

Usage:
  savepoints-lite-validate --package-root <dir> --stdin
  savepoints-lite-validate --package-root <dir> --input '<json>'

Input JSON:
  { "persisted": { "Name": "...", "Repository": "...", "Agent": "..." }, "page_id": "optional" }

Exit codes: 0 ok | 1 issues | 2 usage/runtime error
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
      packageRoot = argv[++i];
    } else if (arg === "--input") {
      input = argv[++i];
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  return { packageRoot, stdin, input, help };
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
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

  if (!args.stdin && args.input === undefined) {
    process.stderr.write("provide --stdin or --input <json>\n");
    printHelp();
    process.exit(2);
  }

  if (args.stdin && args.input !== undefined) {
    process.stderr.write("use only one of --stdin or --input\n");
    process.exit(2);
  }

  let raw: string;
  try {
    raw = args.stdin ? await readStdin() : (args.input as string);
  } catch (err) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(2);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    process.stdout.write(
      JSON.stringify(
        {
          ok: false,
          issues: [
            {
              kind: "invalid_input",
              message: "input is not valid JSON",
            },
          ],
        },
        null,
        2,
      ) + "\n",
    );
    process.exit(2);
  }

  const packageRoot = resolve(
    resolvePackageRoot(args.packageRoot ? resolve(args.packageRoot) : undefined),
  );

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

  const result = validatePersistedProperties(parsed, schema, mapping);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  process.exit(result.ok ? 0 : result.issues.some((i) => i.kind === "invalid_input") ? 2 : 1);
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(2);
});
