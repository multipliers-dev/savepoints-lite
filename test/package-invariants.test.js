import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, it, expect } from "vitest";
import { parse as parseYaml } from "yaml";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readRoot(rel) {
  return readFileSync(join(root, rel), "utf8");
}

describe("package invariants", () => {
  it("package.json is publishable @multipliers-dev/savepoints-lite", () => {
    const pkg = JSON.parse(readRoot("package.json"));
    expect(pkg.name).toBe("@multipliers-dev/savepoints-lite");
    expect(pkg.private).not.toBe(true);
    expect(pkg.publishConfig?.access).toBe("public");
    expect(pkg.publishConfig?.provenance).toBe(true);
    expect(pkg.files).toEqual(
      expect.arrayContaining(["skills/**", "README.md", "LICENSE", "docs/**"]),
    );
    expect(pkg.license).toBe("MIT");
    expect(pkg.scripts.typecheck).toBeUndefined();
    expect(pkg.scripts.verify).toBeDefined();
  });

  it("router defaults set storage.provider notion", () => {
    const doc = parseYaml(readRoot("skills/savepoints/defaults.yml"));
    expect(doc.storage?.provider).toBe("notion");
  });

  it("notion provider defaults set destination.data_source_id", () => {
    const doc = parseYaml(readRoot("skills/savepoints-notion/defaults.yml"));
    expect(doc.destination?.data_source_id).toBe(
      "822cbc89-7c89-4863-af3a-2fe0cd8ab56e",
    );
  });

  it("README links consumer adoption and architecture docs", () => {
    const readme = readRoot("README.md");
    expect(readme).toMatch(/docs\/adopt\.md/);
    expect(readme).toMatch(/docs\/architecture\.md/);
    expect(readme).not.toMatch(/docs\/publishing\.md/);
    expect(readme).not.toMatch(/npm run verify/);
  });

  it("README does not claim Cursor or Claude integration verified", () => {
    const readme = readRoot("README.md");
    expect(readme).not.toMatch(/integration (has been |is )verified/i);
    expect(readme).not.toMatch(/verified (in|on|with) (Cursor|Claude)/i);
  });

  it("LICENSE exists with MIT copyright and is listed for tarball", () => {
    const licensePath = join(root, "LICENSE");
    expect(existsSync(licensePath)).toBe(true);
    const license = readRoot("LICENSE");
    expect(license).toMatch(/^MIT License\n\nCopyright \(c\) 2026 Michael Truong/m);
    const listed = readRoot("scripts/expected-package-paths.txt")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    expect(listed).toContain("LICENSE");
  });

  it("documentation files exist for tarball", () => {
    for (const rel of [
      "docs/adopt.md",
      "docs/architecture.md",
      "docs/publishing.md",
    ]) {
      expect(existsSync(join(root, rel))).toBe(true);
    }
  });

  it("notion provider documents verified property types", () => {
    const skill = readRoot("skills/savepoints-notion/SKILL.md");
    expect(skill).toMatch(/Notion type/);
    expect(skill).toMatch(/`title`/);
    expect(skill).toMatch(/`created_time`/);
    expect(skill).toMatch(/Plain string/);
  });

  it("notion provider requires synchronous create when supported", () => {
    const skill = readRoot("skills/savepoints-notion/SKILL.md");
    expect(skill).toMatch(/allow_async:\s*false/);
    expect(skill).toMatch(/absent.*savepoints-notion\.yml/i);
  });

  it("expected package paths file matches verify script usage", () => {
    const listed = readRoot("scripts/expected-package-paths.txt")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    expect(listed).toHaveLength(12);
    for (const rel of listed) {
      expect(existsSync(join(root, rel))).toBe(true);
    }
  });

  it("required skill files exist", () => {
    const paths = [
      "skills/savepoints/SKILL.md",
      "skills/savepoints/schema.md",
      "skills/savepoints/defaults.yml",
      "skills/savepoints-notion/SKILL.md",
      "skills/savepoints-notion/defaults.yml",
      "skills/README.md",
    ];
    for (const rel of paths) {
      expect(existsSync(join(root, rel))).toBe(true);
    }
  });

  it("hooks.json has no Savepoints capture hooks", () => {
    const hooks = readRoot(".cursor/hooks.json");
    expect(hooks).not.toMatch(/savepoints-lite/i);
    expect(hooks).not.toMatch(/observe\.sh/);
  });
});
