# @multipliers-dev/savepoints-lite

Instruction-only npm package for append-only **session Savepoints**: a router skill delegates to provider skills (Notion in v1) using the consumer’s existing **Notion MCP**. No executable runtime, custom MCP server, or local spool.

## Contents

After `npm install`, skills live under:

```text
node_modules/@multipliers-dev/savepoints-lite/skills/savepoints/SKILL.md
node_modules/@multipliers-dev/savepoints-lite/skills/savepoints-notion/SKILL.md
```

See [skills/README.md](./skills/README.md) for the full index.

## Prerequisites

- Node.js 22+
- Authenticated Notion MCP in the agent host (for the default Notion provider)

npm does not register skills with Cursor or Claude — consumer activation is documented in a future adoption release.

## Hub development

| Command | Purpose |
| --- | --- |
| `npm test` | Package and skill invariant tests |
| `npm run verify` | Skill tree + `npm pack --dry-run` tarball checks |
| `npm run verify:git-hooks` | Confirm Husky shims are runnable in this checkout |
