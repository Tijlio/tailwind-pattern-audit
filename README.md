# tailwind-pattern-audit

[![npm version](https://img.shields.io/npm/v/tailwind-pattern-audit.svg)](https://www.npmjs.com/package/tailwind-pattern-audit)
[![CI](https://github.com/Tijlio/tailwind-pattern-audit/actions/workflows/ci.yml/badge.svg)](https://github.com/Tijlio/tailwind-pattern-audit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Find repeated Tailwind class patterns in JavaScript and TypeScript projects.

Requires Node.js 20 or newer.

```bash
pnpm add -D tailwind-pattern-audit
pnpm tailwind-pattern-audit --format markdown --output tailwind-audit.md
```

The tool focuses on deterministic evidence: duplicate static class strings, file and line
references, and JSON/Markdown output that other tools can consume.

## CLI

```bash
tailwind-pattern-audit
tailwind-pattern-audit init
tailwind-pattern-audit --json
tailwind-pattern-audit --markdown
tailwind-pattern-audit --min-occurrences 3
tailwind-pattern-audit --min-classes 4
tailwind-pattern-audit --priority high medium
tailwind-pattern-audit --kind component cva
tailwind-pattern-audit --hide-layout-only
tailwind-pattern-audit --format pr
tailwind-pattern-audit --include "src/**/*.{ts,tsx}"
tailwind-pattern-audit --fail-on duplicates --max-groups 0
```

`tailwind-pattern-audit init` creates a practical `tailwind-pattern-audit.config.json` with
focused source globs, `minClasses: 4`, and layout-only filtering for quieter first-run reports.

## Library

```ts
import { analyzeProject, formatReport } from "tailwind-pattern-audit";

const report = await analyzeProject({ cwd: process.cwd() });
console.log(formatReport(report, "markdown"));
```

## GitHub Action

```yaml
- uses: Tijlio/tailwind-pattern-audit@v0.1.1
  with:
    format: markdown
    output: tailwind-audit.md
    fail-on: duplicates
    max-groups: 0
    hide-layout-only: true
    node-version: 22
```

Use `format: pr` for compact Markdown intended for PR comments.

## Release

After the changelog and release changes are committed, create and push a version tag:

```bash
pnpm version patch
git push origin main --follow-tags
```

`.github/workflows/release.yml` publishes matching `v*.*.*` tags to npm through trusted
publishing.

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
