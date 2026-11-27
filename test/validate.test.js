import { describe, it, expect } from "vitest";
import {
  mkdirSync,
  mkdtempSync,
  cpSync,
  rmSync,
  existsSync,
  readFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

import {
  findPackageRootFrom,
  loadNotionMapping,
  loadSchema,
  resolvePackageRoot,
} from "../src/validate/load-contract.ts";
import { interpretNotionPropertyValue } from "../src/validate/notion-value.ts";
import { validatePersistedProperties } from "../src/validate/validate.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = join(root, "skills/bin/savepoints-lite-validate.mjs");
const notionFetchResultRaw = readFileSync(
  join(root, "test/fixtures/notion-fetch-result.json"),
  "utf8",
);
const notionFetchFixture = JSON.parse(
  readFileSync(join(root, "test/fixtures/notion-fetch-persisted.json"), "utf8"),
);

describe("interpretNotionPropertyValue / fromPropertyObject", () => {
  it("uses populated text after empty rich_text", () => {
    expect(
      interpretNotionPropertyValue({
        type: "rich_text",
        rich_text: [],
        text: [{ plain_text: "from text key" }],
      }),
    ).toEqual({ kind: "present", text: "from text key" });
  });

  it("uses populated rich_text after empty title", () => {
    expect(
      interpretNotionPropertyValue({
        type: "title",
        title: [],
        rich_text: [{ plain_text: "fallback rich" }],
      }),
    ).toEqual({ kind: "present", text: "fallback rich" });
  });

  it("returns absent when all supported representations are empty", () => {
    expect(
      interpretNotionPropertyValue({
        title: [],
        rich_text: [],
        text: [],
      }),
    ).toEqual({ kind: "absent" });
  });

  it("keeps unsupported shapes distinct from absent", () => {
    expect(
      interpretNotionPropertyValue({
        type: "title",
        title: [{ no_plain_text: true }],
      }),
    ).toEqual({ kind: "unsupported" });
    expect(
      interpretNotionPropertyValue({
        rich_text: [],
        text: [{ broken: true }],
      }),
    ).toEqual({ kind: "unsupported" });
    expect(interpretNotionPropertyValue({ unrelated: 1 })).toEqual({
      kind: "unsupported",
    });
  });
});

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

  it("accepts realistic notion-fetch title/rich_text property objects", () => {
    const result = validatePersistedProperties(
      notionFetchFixture,
      schema,
      mapping,
    );
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.page_id).toBe(notionFetchFixture.page_id);
  });

  it("accepts bare title/rich_text arrays without wrapping property objects", () => {
    const result = validatePersistedProperties(
      {
        persisted: {
          Name: [{ plain_text: "bare title" }],
          Repository: [{ text: { content: "owner/repo" } }],
          Agent: [{ plain_text: "Agent" }],
        },
      },
      schema,
      mapping,
    );
    expect(result.ok).toBe(true);
  });

  it("reports unsupported_property_shape instead of missing for malformed values", () => {
    const result = validatePersistedProperties(
      {
        persisted: {
          Name: { type: "title", title: [{ no_plain_text: true }] },
          Repository: "owner/repo",
          Agent: "Agent",
        },
      },
      schema,
      mapping,
    );
    expect(result.ok).toBe(false);
    expect(result.issues).toEqual([
      expect.objectContaining({
        kind: "unsupported_property_shape",
        field: "title",
        property: "Name",
      }),
    ]);
    expect(result.issues.some((i) => i.kind === "missing_persisted_property")).toBe(
      false,
    );
  });

  it("accepts empty rich_text with populated text on required fields", () => {
    const result = validatePersistedProperties(
      {
        persisted: {
          Name: { type: "title", title: [{ plain_text: "ok" }] },
          Repository: {
            type: "rich_text",
            rich_text: [],
            text: [{ plain_text: "owner/repo" }],
          },
          Agent: {
            rich_text: [],
            text: [{ text: { content: "Agent" } }],
          },
        },
      },
      schema,
      mapping,
    );
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("reports missing when every supported representation is empty", () => {
    const result = validatePersistedProperties(
      {
        persisted: {
          Name: { title: [], rich_text: [], text: [] },
          Repository: "owner/repo",
          Agent: "Agent",
        },
      },
      schema,
      mapping,
    );
    expect(result.ok).toBe(false);
    expect(result.issues).toEqual([
      expect.objectContaining({
        kind: "missing_persisted_property",
        field: "title",
        property: "Name",
      }),
    ]);
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
        [join(vendorRoot, "skills/bin/savepoints-lite-validate.mjs")],
        {
          encoding: "utf8",
          input: JSON.stringify({
            persisted: {
              Name: "vendor — ok",
              Repository: "multipliers-dev/savepoints-lite",
              Agent: "Cursor Agent",
            },
          }),
        },
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
        [cliPath, "--package-root", emptyRoot, "--input", '{"persisted":{}}'],
        { encoding: "utf8" },
      );
      expect(result.status).toBe(2);
      expect(result.stderr).toMatch(/could not locate Savepoints Lite install root/i);
    } finally {
      rmSync(emptyRoot, { recursive: true, force: true });
    }
  });

  it("rejects --package-root without a value (including when followed by a flag)", () => {
    const missing = spawnSync(
      process.execPath,
      [cliPath, "--package-root"],
      { encoding: "utf8" },
    );
    expect(missing.status).toBe(2);
    expect(missing.stderr).toMatch(/--package-root requires a directory path/i);

    const followedByFlag = spawnSync(
      process.execPath,
      [cliPath, "--package-root", "--stdin"],
      { encoding: "utf8" },
    );
    expect(followedByFlag.status).toBe(2);
    expect(followedByFlag.stderr).toMatch(
      /--package-root requires a directory path/i,
    );
  });

  it("CLI accepts notion-fetch fixture without repair-style missing issues", () => {
    const result = spawnSync(
      process.execPath,
      [cliPath, "--input", JSON.stringify(notionFetchFixture)],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(0);
    const body = JSON.parse(result.stdout);
    expect(body.ok).toBe(true);
    expect(body.issues).toEqual([]);
  });

  it("simulated marketplace vendor tree validates notion-fetch fixture", () => {
    const vendorRoot = mkdtempSync(join(tmpdir(), "savepoints-vendor-fetch-"));
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

      const result = spawnSync(
        process.execPath,
        [join(vendorRoot, "skills/bin/savepoints-lite-validate.mjs")],
        { encoding: "utf8", input: notionFetchResultRaw },
      );
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout).ok).toBe(true);
    } finally {
      rmSync(vendorRoot, { recursive: true, force: true });
    }
  });
});

function runCli(args, input) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    encoding: "utf8",
    ...(input === undefined ? {} : { input }),
  });
}

const completeInput = JSON.stringify(notionFetchFixture);
const missingRepositoryInput = JSON.stringify({
  persisted: { Name: "n", Repository: "", Agent: "a" },
});

describe("CLI input handling", () => {
  it("reads implicit stdin when piped (no flag)", () => {
    const ok = runCli([], completeInput);
    expect(ok.status).toBe(0);
    expect(JSON.parse(ok.stdout)).toMatchObject({ ok: true, issues: [] });

    const missing = runCli([], missingRepositoryInput);
    expect(missing.status).toBe(1);
    expect(JSON.parse(missing.stdout).issues[0].kind).toBe(
      "missing_persisted_property",
    );
  });

  it("exits 2 on empty implicit stdin", () => {
    const result = runCli([], "");
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/no input/);
  });

  it("exits 2 on input with neither structured JSON nor a properties block", () => {
    const result = runCli([], "this is not json");
    expect(result.status).toBe(2);
    expect(JSON.parse(result.stdout).issues[0].kind).toBe("invalid_input");
  });

  it("exits 2 within the idle window on an open, silent pipe", async () => {
    const started = Date.now();
    const child = spawn(process.execPath, [cliPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    const status = await new Promise((resolveStatus) => {
      child.on("exit", (code) => resolveStatus(code));
    });
    expect(status).toBe(2);
    expect(Date.now() - started).toBeLessThan(8000);
  }, 12000);

  it("keeps explicit --stdin and --input behavior", () => {
    expect(runCli(["--stdin"], completeInput).status).toBe(0);
    expect(runCli(["--input", completeInput]).status).toBe(0);
    expect(runCli(["--stdin"], "").status).toBe(2);
  });

  it("rejects --stdin together with --input", () => {
    const result = runCli(["--stdin", "--input", completeInput], completeInput);
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/only one of --stdin or --input/);
  });

  it("rejects unknown flags and lists the accepted ones", () => {
    const result = runCli(["--page-id", "abc"]);
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/unknown argument: --page-id/);
    expect(result.stderr).toMatch(/--stdin/);
    expect(result.stderr).toMatch(/--input/);
  });

  it("accepts a notion-fetch envelope on stdin via normalization", () => {
    const result = runCli([], notionFetchResultRaw);
    expect(result.status).toBe(0);
    const body = JSON.parse(result.stdout);
    expect(body.ok).toBe(true);
    expect(body.page_id).toBe(JSON.parse(notionFetchResultRaw).page_id);
    expect(body.warnings).toBeUndefined();
  });

  it("accepts the envelope via --input and --stdin", () => {
    expect(runCli(["--input", notionFetchResultRaw]).status).toBe(0);
    expect(runCli(["--stdin"], notionFetchResultRaw).status).toBe(0);
  });

  it("accepts a raw properties block", () => {
    const text = JSON.parse(notionFetchResultRaw).text;
    const block = /<properties>[\s\S]*?<\/properties>/.exec(text)[0];
    const result = runCli([], block);
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).page_id).toBeUndefined();
  });

  it("reports a missing property found through a fetch result", () => {
    const text =
      '<properties>{"Name":"n","Agent":"a"}</properties>';
    const result = runCli([], JSON.stringify({ text }));
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout).issues[0]).toMatchObject({
      kind: "missing_persisted_property",
      property: "Repository",
    });
  });

  it("exits 2 for an envelope with no or broken block", () => {
    expect(runCli([], JSON.stringify({ text: "nothing here" })).status).toBe(2);
    expect(
      runCli([], JSON.stringify({ text: "<properties>{bad</properties>" })).status,
    ).toBe(2);
  });

  it("does not add a warnings key for owner/repo", () => {
    const result = runCli([], completeInput);
    expect("warnings" in JSON.parse(result.stdout)).toBe(false);
  });

  it("warns (advisory) on a bare repository without changing ok or exit code", () => {
    const result = runCli(
      [],
      JSON.stringify({
        persisted: { Name: "n", Repository: "resumes", Agent: "a" },
      }),
    );
    expect(result.status).toBe(0);
    const body = JSON.parse(result.stdout);
    expect(body.ok).toBe(true);
    expect(body.issues).toEqual([]);
    expect(body.warnings).toHaveLength(1);
    expect(body.warnings[0].kind).toBe("repository_format");
  });

  it("warns on a compound repository value", () => {
    const result = runCli(
      [],
      JSON.stringify({
        persisted: { Name: "n", Repository: "a/b; c/d", Agent: "a" },
      }),
    );
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).warnings[0].kind).toBe("repository_format");
  });

  it("keeps an empty repository as an issue with no warning", () => {
    const result = runCli([], missingRepositoryInput);
    const body = JSON.parse(result.stdout);
    expect(result.status).toBe(1);
    expect(body.issues[0].kind).toBe("missing_persisted_property");
    expect(body.warnings).toBeUndefined();
  });
});

describe("repository_format warning (core validator)", () => {
  const schema = loadSchema(root);
  const mapping = loadNotionMapping(root);
  const withRepository = (Repository) =>
    validatePersistedProperties(
      { persisted: { Name: "n", Repository, Agent: "a" } },
      schema,
      mapping,
    );

  it("checks the interpreted text of structured Notion values", () => {
    const bare = withRepository({
      type: "rich_text",
      rich_text: [{ plain_text: "resumes" }],
    });
    expect(bare.ok).toBe(true);
    expect(bare.warnings?.map((w) => w.kind)).toEqual(["repository_format"]);

    const good = withRepository({
      type: "rich_text",
      rich_text: [{ plain_text: "owner/repo" }],
    });
    expect(good.warnings).toBeUndefined();
  });

  it("never turns a warning into an issue", () => {
    const result = withRepository("two words/repo");
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.warnings).toHaveLength(1);
  });
});
