import { describe, it, expect } from "vitest";
import { mkdirSync, mkdtempSync, cpSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import {
  findPackageRootFrom,
  loadNotionMapping,
  loadSchema,
  resolvePackageRoot,
} from "../src/validate/load-contract.ts";
import { validatePersistedProperties } from "../src/validate/validate.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = join(root, "skills/bin/savepoints-lite-validate.mjs");

describe("validatePersistedProperties", () => {
  const schema = loadSchema(root);
  const mapping = loadNotionMapping(root);

  it("accepts a complete persisted record", () => {
    const result = validatePersistedProperties(
      {
        persisted: {
          Name: "repo — done",
          Repository: "multipliers-dev/savepoints-lite",
          Agent: "Cursor Agent",
        },
        page_id: "abc",
      },
      schema,
      mapping,
    );
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.page_id).toBe("abc");
  });

  it("reports missing persisted properties", () => {
    const result = validatePersistedProperties(
      {
        persisted: {
          Name: "only title",
          Repository: "",
          Agent: "Cursor Agent",
        },
      },
      schema,
      mapping,
    );
    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "missing_persisted_property",
          field: "repository",
          property: "Repository",
        }),
      ]),
    );
  });

  it("reports contract mismatch when a required field lacks a mapping", () => {
    const brokenMapping = {
      ...mapping,
      fields: {
        title: mapping.fields.title,
        // repository intentionally omitted
        agent: mapping.fields.agent,
      },
    };
    const result = validatePersistedProperties(
      {
        persisted: {
          Name: "t",
          Agent: "a",
        },
      },
      schema,
      brokenMapping,
    );
    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "contract_mismatch",
          field: "repository",
        }),
      ]),
    );
  });

  it("rejects malformed input without treating it as missing properties", () => {
    const result = validatePersistedProperties("nope", schema, mapping);
    expect(result.ok).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].kind).toBe("invalid_input");
  });

  it("rejects missing persisted object", () => {
    const result = validatePersistedProperties({ page_id: "x" }, schema, mapping);
    expect(result.ok).toBe(false);
    expect(result.issues[0].kind).toBe("invalid_input");
  });

  it("does not require optional session_id", () => {
    const result = validatePersistedProperties(
      {
        persisted: {
          Name: "n",
          Repository: "owner/repo",
          Agent: "Agent",
        },
      },
      schema,
      mapping,
    );
    expect(result.ok).toBe(true);
  });
});

describe("validation opt-in defaults", () => {
  it("packaged defaults disable post_write validation", async () => {
    const { parse } = await import("yaml");
    const { readFileSync } = await import("node:fs");
    const doc = parse(readFileSync(join(root, "skills/savepoints/defaults.yml"), "utf8"));
    expect(doc.validation?.post_write).toBe(false);
  });
});

describe("install-root resolution", () => {
  it("resolves package root from workspace via walk-up", () => {
    expect(findPackageRootFrom(join(root, "src/validate"))).toBe(root);
    expect(resolvePackageRoot(root)).toBe(root);
  });

  it("resolves schema/mapping from a simulated marketplace vendor tree", () => {
    expect(existsSync(cliPath)).toBe(true);
    const vendorRoot = mkdtempSync(join(tmpdir(), "savepoints-vendor-"));
    try {
      mkdirSync(join(vendorRoot, "skills"), { recursive: true });
      cpSync(join(root, "skills/savepoints"), join(vendorRoot, "skills/savepoints"), {
        recursive: true,
      });
      cpSync(
        join(root, "skills/savepoints-notion"),
        join(vendorRoot, "skills/savepoints-notion"),
        { recursive: true },
      );
      mkdirSync(join(vendorRoot, "skills/bin"), { recursive: true });
      cpSync(cliPath, join(vendorRoot, "skills/bin/savepoints-lite-validate.mjs"));

      expect(findPackageRootFrom(join(vendorRoot, "skills/bin"))).toBe(vendorRoot);
      const schema = loadSchema(vendorRoot);
      const mapping = loadNotionMapping(vendorRoot);
      expect(schema.fields.title.required).toBe(true);
      expect(mapping.fields.repository.property).toBe("Repository");

      const result = spawnSync(
        process.execPath,
        [join(vendorRoot, "skills/bin/savepoints-lite-validate.mjs"), "--input", JSON.stringify({
          persisted: {
            Name: "vendor — ok",
            Repository: "multipliers-dev/savepoints-lite",
            Agent: "Cursor Agent",
          },
        })],
        { encoding: "utf8" },
      );
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout).ok).toBe(true);
    } finally {
      rmSync(vendorRoot, { recursive: true, force: true });
    }
  });

  it("CLI from skills/bin discovers install root without --package-root", () => {
    expect(existsSync(cliPath)).toBe(true);
    const result = spawnSync(
      process.execPath,
      [
        cliPath,
        "--input",
        JSON.stringify({
          persisted: {
            Name: "npm layout",
            Repository: "owner/repo",
            Agent: "Agent",
          },
        }),
      ],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).ok).toBe(true);
  });

  it("reports verification-style failure when CLI cannot load contracts", () => {
    const emptyRoot = mkdtempSync(join(tmpdir(), "savepoints-empty-"));
    try {
      const result = spawnSync(
        process.execPath,
        [cliPath, "--package-root", emptyRoot, "--input", "{}"],
        { encoding: "utf8" },
      );
      expect(result.status).toBe(2);
      expect(result.stderr).toMatch(/could not locate Savepoints Lite install root/i);
    } finally {
      rmSync(emptyRoot, { recursive: true, force: true });
    }
  });
});
