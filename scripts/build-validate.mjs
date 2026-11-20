import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as esbuild from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const entry = resolve(root, "src/validate/cli.ts");
const outfile = resolve(root, "dist/savepoints-lite-validate.mjs");

const generatedBanner = `/*!
 * GENERATED FILE — DO NOT EDIT.
 * Source: src/validate/cli.ts (+ validate.ts, load-contract.ts).
 * Rebuild: npm run build
 */`;

mkdirSync(dirname(outfile), { recursive: true });

await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  platform: "node",
  format: "esm",
  target: ["node22"],
  outfile,
  banner: { js: generatedBanner },
  legalComments: "none",
  minify: false,
  sourcemap: false,
  charset: "utf8",
  logLevel: "info",
  packages: "bundle",
});

const body = readFileSync(outfile, "utf8").replace(/^#!.*\n/, "");
writeFileSync(outfile, `#!/usr/bin/env node\n${body}`);
chmodSync(outfile, 0o755);

console.log(`ok built ${outfile}`);
