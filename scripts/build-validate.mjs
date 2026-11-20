import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as esbuild from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const entry = resolve(root, "src/validate/cli.ts");
// Ship beside canonical skills so marketplace vendor sync (skills/ tree) can
// copy the same self-contained CLI without consumer node_modules deps.
const outfile = resolve(root, "skills/bin/savepoints-lite-validate.mjs");

const generatedBanner = `/*!
 * GENERATED FILE — DO NOT EDIT.
 * Source: src/validate/cli.ts (+ validate.ts, load-contract.ts, notion-value.ts).
 * Rebuild: npm run build (commit skills/bin/ with the package — required for
 * marketplace vendor sync without consumer builds).
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
