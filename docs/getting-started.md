# Getting Started

Install the CLI in a project that uses Tailwind classes:

```bash
pnpm add -D tailwind-pattern-audit
```

Run a first audit:

```bash
pnpm tailwind-pattern-audit --markdown --output tailwind-audit.md
```

For a browsable report, write a self-contained HTML file:

```bash
pnpm tailwind-pattern-audit --html --output tailwind-audit.html
```

For a quieter first pass on mature projects, hide layout-only repeats:

```bash
pnpm tailwind-pattern-audit --markdown --hide-layout-only --output tailwind-audit.md
```

Create a starter config:

```bash
pnpm tailwind-pattern-audit init
pnpm tailwind-pattern-audit config validate
```

Create a baseline when adopting CI in a project that already has repeated patterns:

```bash
pnpm tailwind-pattern-audit baseline create --baseline-output tailwind-audit-baseline.json
pnpm tailwind-pattern-audit --baseline tailwind-audit-baseline.json --fail-on duplicates
```

## Recommended Rollout

1. Run a Markdown or HTML report locally.
2. Review the top component and utility candidates.
3. Add inline ignores or `ignorePatterns` for intentional repeats.
4. Create a baseline for existing findings.
5. Enable CI gates for new duplicate groups.
