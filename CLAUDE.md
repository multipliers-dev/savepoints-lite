@AGENTS.md

## Savepoints Lite (hub dogfooding)

This hub repository installs the **published** `@multipliers-dev/savepoints-lite` package and activates Savepoints through instructions only (no lifecycle hooks).

After `npm ci`, read and follow the installed router:

`node_modules/@multipliers-dev/savepoints-lite/skills/savepoints/SKILL.md`

Do not use the repository `skills/` directory as the router source when executing Savepoints — `node_modules` is authoritative. Cursor also loads `.cursor/rules/savepoints-lite.mdc` (`alwaysApply: true`).
