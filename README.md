# tailwind-pattern-audit

[![npm version](https://img.shields.io/npm/v/tailwind-pattern-audit.svg)](https://www.npmjs.com/package/tailwind-pattern-audit)
[![CI](https://github.com/Tijlio/tailwind-pattern-audit/actions/workflows/ci.yml/badge.svg)](https://github.com/Tijlio/tailwind-pattern-audit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Find repeated Tailwind class patterns in JavaScript, TypeScript, HTML, Astro, Vue, and Svelte projects.

Requires Node.js 20 or newer.

```bash
pnpm add -D tailwind-pattern-audit
pnpm tailwind-pattern-audit --format markdown --output tailwind-audit.md
```

The tool focuses on deterministic evidence: duplicate static class strings, file and line
references, and JSON/Markdown/SARIF output that other tools can consume.

## CLI

```bash
tailwind-pattern-audit
tailwind-pattern-audit init
tailwind-pattern-audit config validate
tailwind-pattern-audit config print
tailwind-pattern-audit baseline create --baseline-output tailwind-audit-baseline.json
tailwind-pattern-audit --json
tailwind-pattern-audit --markdown
tailwind-pattern-audit --min-occurrences 3
tailwind-pattern-audit --min-classes 4
tailwind-pattern-audit --priority high medium
tailwind-pattern-audit --kind component cva
tailwind-pattern-audit --hide-layout-only
tailwind-pattern-audit --similar --min-similarity 0.7
tailwind-pattern-audit --format pr
tailwind-pattern-audit --format github --annotation-limit 25
tailwind-pattern-audit --format sarif --output tailwind-audit.sarif.json
tailwind-pattern-audit --include "src/**/*.{ts,tsx}"
tailwind-pattern-audit --json --output tailwind-audit-baseline.json
tailwind-pattern-audit --baseline tailwind-audit-baseline.json --fail-on duplicates
tailwind-pattern-audit --fail-on duplicates --max-groups 0
tailwind-pattern-audit --ignore-file "src/generated/**"
tailwind-pattern-audit --ignore-pattern "rounded-md border bg-white p-4"
```

`tailwind-pattern-audit init` creates a practical `tailwind-pattern-audit.config.json` with
focused source globs, `minClasses: 4`, and layout-only filtering for quieter first-run reports.
Generated configs include a `$schema` reference for editor autocomplete.

`tailwind-pattern-audit config validate` validates the resolved config without scanning files.
`tailwind-pattern-audit config print` prints the resolved config as JSON, including defaults.
`tailwind-pattern-audit baseline create` writes a JSON baseline from the current duplicate groups
so existing projects can turn on CI gates incrementally.

## Library

```ts
import { analyzeProject, formatReport, generateSarif } from "tailwind-pattern-audit";

const report = await analyzeProject({ cwd: process.cwd() });
console.log(formatReport(report, "markdown"));
console.log(generateSarif(report));
```

## GitHub Action

```yaml
permissions:
  contents: read
  pull-requests: write

- uses: Tijlio/tailwind-pattern-audit@v1
  with:
    format: pr
    comment: true
    annotations: true
    annotation-limit: 25
    fail-on: duplicates
    max-groups: 0
    hide-layout-only: true
    baseline: tailwind-audit-baseline.json
    similar: true
    min-similarity: 0.7
    ignore-files: |
      src/generated/**
    ignore-patterns: |
      rounded-md border bg-white p-4
    node-version: 24
```

Use `comment: true` with `format: pr` to post or update a compact pull request comment.
Use `annotations: true` to add duplicate groups and warning/error diagnostics to the GitHub
Checks UI.
Use `format: sarif` when you want a machine-readable report for code-scanning style tooling.

### Code Scanning

```yaml
permissions:
  contents: read
  security-events: write

steps:
  - uses: actions/checkout@v5
  - uses: actions/setup-node@v6
    with:
      node-version: 24
  - run: npx --yes tailwind-pattern-audit@latest --sarif --output tailwind-pattern-audit.sarif.json
  - uses: github/codeql-action/upload-sarif@v4
    with:
      sarif_file: tailwind-pattern-audit.sarif.json
```

## Inline Ignores

Use inline comments when a repeated pattern is intentional:

```tsx
// tailwind-pattern-audit-ignore-next-line
<div className="rounded-md border bg-white p-4" />

<div className="rounded-md border bg-white p-4" /> {/* tailwind-pattern-audit-ignore */}
```

```html
<!-- tailwind-pattern-audit-ignore-next-line -->
<section class="rounded-md border bg-white p-4">Ignored</section>
```

## Release

After the changelog and release changes are committed, create and push a version tag:

```bash
pnpm version patch # or minor/major/prerelease
git push origin main --follow-tags
```

`.github/workflows/release.yml` publishes matching `v*.*.*` tags to npm through trusted
publishing with npm provenance. Prerelease versions are published under the npm `next` dist tag.

## Scope

Supported in this release:

- `className="..."`
- `className={"..."}`
- static template literals
- static branches in JSX conditional class expressions
- combined static arguments passed to `cn`, `clsx`, `classnames`, and `twMerge`
- deterministic `cva` base, variant, and compound-variant class candidates
- static JSX `class` and `className` attributes
- static `class` attributes in `.html`, `.astro`, `.vue`, and `.svelte`
- static Astro `class:list` values
- `.js`, `.jsx`, `.ts`, `.tsx`, `.html`, `.astro`, `.vue`, and `.svelte`
- opt-in similar class set detection
- baseline filtering for CI adoption
- baseline creation for first-run CI adoption
- inline ignore comments for intentional duplicates
- report-level ignore controls for generated files and known repeated class patterns
- resolved config validation and printing
- JSON schema for `tailwind-pattern-audit.config.json`
- GitHub workflow annotation output
- SARIF report output
- JSON report performance metrics

Deferred but planned:

- richer Vue and Svelte dynamic class binding extraction
- CVA opportunity scoring
- JSX subtree pattern detection
- VS Code integration
- AI-assisted interpretation and codemods
