import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, posix } from "node:path";
import { describe, it, expect } from "vitest";
import { parse as parseYaml } from "yaml";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const MAINTAINER_DATA_SOURCE_ID = "822cbc89-7c89-4863-af3a-2fe0cd8ab56e";

function readRoot(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function readPathsList(rel) {
  return readRoot(rel)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function registryDogfoodManifestRel(version) {
  return `scripts/expected-package-paths-registry-dogfood-${version}.txt`;
}

function readRegistryDogfoodManifest(version) {
  const rel = registryDogfoodManifestRel(version);
  expect(
    existsSync(join(root, rel)),
    `missing registry dogfood manifest for @${version}: ${rel}`,
  ).toBe(true);
  return readPathsList(rel);
}

function markdownLinkTargets(markdown) {
  const targets = [];
  const re = /\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  while ((match = re.exec(markdown)) !== null) {
    targets.push(match[2]);
  }
  return targets;
}

function isExternalOrAnchorLink(link) {
  return (
    link.startsWith("http://") ||
    link.startsWith("https://") ||
    link.startsWith("#") ||
    link.startsWith("mailto:")
  );
}

describe("package invariants", () => {
  it("package.json is publishable @multipliers-dev/savepoints-lite at 2.0.0", () => {
    const pkg = JSON.parse(readRoot("package.json"));
    expect(pkg.name).toBe("@multipliers-dev/savepoints-lite");
    expect(pkg.version).toBe("2.0.0");
    expect(pkg.private).not.toBe(true);
    expect(pkg.publishConfig?.access).toBe("public");
    expect(pkg.publishConfig?.provenance).toBe(true);
    expect(pkg.files).toEqual(
      expect.arrayContaining([
        "skills/**",
        "templates/**",
        "README.md",
        "LICENSE",
        "docs/adopt.md",
        "docs/architecture.md",
        "docs/publishing.md",
      ]),
    );
    expect(pkg.files).not.toContain("docs/**");
    expect(pkg.license).toBe("MIT");
    expect(pkg.scripts.typecheck).toBeUndefined();
    expect(pkg.scripts.verify).toBeDefined();
  });

  it("router defaults set storage.provider notion", () => {
    const doc = parseYaml(readRoot("skills/savepoints/defaults.yml"));
    expect(doc.storage?.provider).toBe("notion");
  });

  it("notion provider packaged defaults omit destination.data_source_id", () => {
    const doc = parseYaml(readRoot("skills/savepoints-notion/defaults.yml"));
    expect(doc?.destination?.data_source_id).toBeUndefined();
  });

  it("workspace release-candidate tarball paths exclude maintainer data_source_id", () => {
    const listed = readPathsList("scripts/expected-package-paths.txt");
    for (const rel of listed) {
      const content = readRoot(rel);
      expect(content).not.toContain(MAINTAINER_DATA_SOURCE_ID);
    }
  });

  it("README links consumer adoption and architecture docs", () => {
    const readme = readRoot("README.md");
    expect(readme).toMatch(/docs\/adopt\.md/);
    expect(readme).toMatch(/docs\/architecture\.md/);
    expect(readme).not.toMatch(/docs\/publishing\.md/);
    expect(readme).not.toMatch(/npm run verify/);
    expect(readme).toMatch(/2\.0\.0/);
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
    const listed = readPathsList("scripts/expected-package-paths.txt");
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

  it("maintainer adoption record stays out of npm files allowlist", () => {
    const pkg = JSON.parse(readRoot("package.json"));
    const files = pkg.files ?? [];
    expect(files.join(" ")).not.toMatch(/adoption-verification-record/);
    expect(existsSync(join(root, "docs/adoption-verification-record.md"))).toBe(
      true,
    );
    const listed = readPathsList("scripts/expected-package-paths.txt");
    expect(listed).not.toContain("docs/adoption-verification-record.md");
  });

  it("notion provider documents verified property types", () => {
    const skill = readRoot("skills/savepoints-notion/SKILL.md");
    expect(skill).toMatch(/Notion type/);
    expect(skill).toMatch(/`title`/);
    expect(skill).toMatch(/`created_time`/);
    expect(skill).toMatch(/Plain string/);
  });

  it("notion provider documents three-tier destination resolution and fail-open", () => {
    const skill = readRoot("skills/savepoints-notion/SKILL.md");
    expect(skill).toMatch(/tier 1/i);
    expect(skill).toMatch(/fail open without fallback/i);
    expect(skill).toMatch(/User Rules/i);
    expect(skill).not.toContain(MAINTAINER_DATA_SOURCE_ID);
  });

  it("notion provider returns failure when configuration blocks persistence", () => {
    const skill = readRoot("skills/savepoints-notion/SKILL.md");
    expect(skill).toMatch(/Return \*\*`failure`\*\* to the router/i);
    expect(skill).toMatch(
      /configuration prevented persistence.*no MCP write attempted/i,
    );
    expect(skill).toMatch(
      /`unconfirmed`.*a write was attempted but confirmation remains uncertain/i,
    );
  });

  it("router carries integration destination unchanged to provider", () => {
    const skill = readRoot("skills/savepoints/SKILL.md");
    expect(skill).toMatch(/carry this `destination` block unchanged/i);
    expect(skill).toMatch(/data_source_id/);
    expect(skill).toMatch(/does \*\*not\*\* call Notion MCP, read Cursor User Rules/i);
  });

  it("consumer savepoints-notion example template exists", () => {
    const example = readRoot("templates/consumer/savepoints-notion.yml.example");
    expect(example).toMatch(/YOUR_NOTION_DATA_SOURCE_ID/);
    const doc = parseYaml(example);
    expect(doc.destination?.data_source_id).toBe("YOUR_NOTION_DATA_SOURCE_ID");
  });

  it("notion provider requires synchronous create when supported", () => {
    const skill = readRoot("skills/savepoints-notion/SKILL.md");
    expect(skill).toMatch(/allow_async:\s*false/);
    expect(skill).toMatch(/savepoints-notion\.yml/i);
  });

  it("expected workspace release-candidate paths file matches verify script usage", () => {
    const listed = readPathsList("scripts/expected-package-paths.txt");
    expect(listed).toHaveLength(16);
    for (const rel of listed) {
      expect(existsSync(join(root, rel))).toBe(true);
    }
  });

  it("registry dogfood manifests exist per published pin version", () => {
    const v11 = readRegistryDogfoodManifest("1.1.0");
    expect(v11).toHaveLength(15);
    expect(v11).not.toContain(
      "templates/consumer/savepoints-notion.yml.example",
    );

    const v20 = readRegistryDogfoodManifest("2.0.0");
    expect(v20).toHaveLength(16);
    expect(v20).toContain("templates/consumer/savepoints-notion.yml.example");
    expect([...v20].sort()).toEqual(
      readPathsList("scripts/expected-package-paths.txt").sort(),
    );
  });

  it("tarball markdown relative links resolve within npm pack file set", () => {
    const tarballFiles = new Set(
      readPathsList("scripts/expected-package-paths.txt"),
    );
    const violations = [];
    for (const rel of [...tarballFiles].filter((p) => p.endsWith(".md"))) {
      const content = readRoot(rel);
      for (const link of markdownLinkTargets(content)) {
        if (isExternalOrAnchorLink(link)) {
          continue;
        }
        const [pathPart] = link.split("#");
        if (!pathPart) {
          continue;
        }
        const resolved = posix.normalize(
          posix.join(posix.dirname(rel), pathPart),
        );
        if (!tarballFiles.has(resolved)) {
          violations.push(`${rel}: (${link}) → ${resolved} not in tarball`);
        }
      }
    }
    expect(violations).toEqual([]);
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

  it("hub dogfoods published package with exact devDependency pin matching workspace", () => {
    const pkg = JSON.parse(readRoot("package.json"));
    const dogfoodVersion =
      pkg.devDependencies["@multipliers-dev/savepoints-lite"];
    expect(dogfoodVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(dogfoodVersion).toBe(pkg.version);
    readRegistryDogfoodManifest(dogfoodVersion);
  });

  it("hub activation uses AGENTS.md only (no Cursor savepoints rule)", () => {
    const routerPath =
      "node_modules/@multipliers-dev/savepoints-lite/skills/savepoints/SKILL.md";
    expect(existsSync(join(root, ".cursor/rules/savepoints-lite.mdc"))).toBe(
      false,
    );
    const agents = readRoot("AGENTS.md");
    expect(agents).toContain(routerPath);
    expect(agents).toMatch(/session log/i);
    expect(agents).toMatch(/does not count as recording an entry/i);
    expect(agents).not.toMatch(/savepoints-lite\.mdc/);
    const claude = readRoot("CLAUDE.md").trim();
    expect(claude).toBe("@AGENTS.md");
  });

  it("consumer AGENTS snippet is runtime-only (no adoption install prose)", () => {
    const routerPath =
      "node_modules/@multipliers-dev/savepoints-lite/skills/savepoints/SKILL.md";
    const snippet = readRoot("templates/consumer/AGENTS.md.snippet");
    expect(snippet).toContain(routerPath);
    expect(snippet).toMatch(/session log/i);
    expect(snippet).toMatch(/does not count as recording an entry/i);
    expect(snippet).not.toMatch(/savepoints-lite\.mdc/);
    expect(snippet).not.toMatch(/templates\/consumer/);
    expect(snippet).not.toMatch(/npm ci/i);
    expect(snippet).not.toMatch(/Pin `@multipliers-dev\/savepoints-lite`/);
  });

  it("does not ship a committed consumer fixture directory", () => {
    expect(existsSync(join(root, "fixtures/consumer"))).toBe(false);
  });

  function listFilesRecursive(dir) {
    const entries = readdirSync(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...listFilesRecursive(full));
      } else {
        files.push(full);
      }
    }
    return files;
  }

  it("installed registry dogfood artifact matches expected publish layout", () => {
    const workspacePkg = JSON.parse(readRoot("package.json"));
    const dogfoodVersion =
      workspacePkg.devDependencies["@multipliers-dev/savepoints-lite"];
    const installRoot = join(
      root,
      "node_modules/@multipliers-dev/savepoints-lite",
    );
    const installedRouter = join(
      installRoot,
      "skills/savepoints/SKILL.md",
    );
    expect(
      existsSync(installedRouter),
      `hub self-adoption: run npm ci so node_modules/@multipliers-dev/savepoints-lite@${dogfoodVersion} is installed`,
    ).toBe(true);
    const installedPkg = JSON.parse(
      readFileSync(join(installRoot, "package.json"), "utf8"),
    );
    expect(installedPkg.name).toBe("@multipliers-dev/savepoints-lite");
    expect(installedPkg.version).toBe(dogfoodVersion);

    const expectedRelFiles =
      readRegistryDogfoodManifest(dogfoodVersion).sort();
    const relFiles = listFilesRecursive(installRoot)
      .map((abs) => abs.slice(installRoot.length + 1))
      .sort();
    expect(relFiles).toEqual(expectedRelFiles);

    for (const rel of expectedRelFiles) {
      expect(existsSync(join(installRoot, rel))).toBe(true);
    }
    const unexpected = relFiles.filter((p) => !expectedRelFiles.includes(p));
    expect(unexpected).toEqual([]);

    expect(
      existsSync(join(installRoot, "docs/adoption-verification-record.md")),
    ).toBe(false);
    expect(
      existsSync(join(installRoot, ".cursor/rules/savepoints-lite.mdc")),
    ).toBe(false);

    if (dogfoodVersion === workspacePkg.version) {
      expect(installedPkg.files).toEqual(workspacePkg.files);
      expect(expectedRelFiles).toEqual(
        readPathsList("scripts/expected-package-paths.txt").sort(),
      );
    }

    const lock = readRoot("package-lock.json");
    expect(lock).toMatch(
      `"node_modules/@multipliers-dev/savepoints-lite":`,
    );
    expect(lock).not.toMatch(/"link":\s*true/);
  });
});
