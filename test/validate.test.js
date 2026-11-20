import { describe, it, expect } from "vitest";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadNotionMapping, loadSchema } from "../src/validate/load-contract.ts";
import { validatePersistedProperties } from "../src/validate/validate.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

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
