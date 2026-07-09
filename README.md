# tailwind-pattern-audit

Find repeated Tailwind class patterns in JavaScript and TypeScript projects.

Requires Node.js 20 or newer.

```bash
pnpm add -D tailwind-pattern-audit
pnpm tailwind-pattern-audit --format markdown --output tailwind-audit.md
```

This first slice focuses on deterministic evidence: duplicate static class strings, file and
line references, and JSON/Markdown output that other tools can consume.

## CLI

```bash
tailwind-pattern-audit
tailwind-pattern-audit --json
tailwind-pattern-audit --markdown
tailwind-pattern-audit --min-occurrences 3
tailwind-pattern-audit --min-classes 4
tailwind-pattern-audit --include "src/**/*.{ts,tsx}"
tailwind-pattern-audit --fail-on duplicates --max-groups 0
```

## Library

```ts
import { analyzeProject, formatReport } from "tailwind-pattern-audit";

const report = await analyzeProject({ cwd: process.cwd() });
console.log(formatReport(report, "markdown"));
```

## GitHub Action

```yaml
- uses: Tijlio/tailwind-pattern-audit@v0
  with:
    format: markdown
    output: tailwind-audit.md
    fail-on: duplicates
    max-groups: 0
    node-version: 22
```

## Scope

Supported in this release:

- `className="..."`
- `className={"..."}`
- static template literals
- static branches in JSX conditional class expressions
- combined static arguments passed to `cn`, `clsx`, `classnames`, and `twMerge`
- deterministic `cva` base, variant, and compound-variant class candidates
- `.js`, `.jsx`, `.ts`, and `.tsx`

Deferred but planned:

- Vue, Svelte, Astro, and HTML extractors
- similarity detection and CVA opportunity scoring
- JSX subtree pattern detection
- VS Code integration
- AI-assisted interpretation and codemods
