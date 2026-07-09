# CLI Reference

## Common Commands

```bash
tailwind-pattern-audit
tailwind-pattern-audit init
tailwind-pattern-audit config validate
tailwind-pattern-audit config print
tailwind-pattern-audit baseline create --baseline-output tailwind-audit-baseline.json
```

## Report Formats

```bash
tailwind-pattern-audit --format terminal
tailwind-pattern-audit --json
tailwind-pattern-audit --markdown
tailwind-pattern-audit --html
tailwind-pattern-audit --pr
tailwind-pattern-audit --github
tailwind-pattern-audit --sarif
```

Use `--output <path>` to write a report file:

```bash
tailwind-pattern-audit --markdown --output tailwind-audit.md
tailwind-pattern-audit --html --output tailwind-audit.html
tailwind-pattern-audit --sarif --output tailwind-pattern-audit.sarif.json
```

## Filtering

```bash
tailwind-pattern-audit --min-occurrences 3
tailwind-pattern-audit --min-classes 4
tailwind-pattern-audit --priority high medium
tailwind-pattern-audit --kind component cva
tailwind-pattern-audit --hide-layout-only
tailwind-pattern-audit --ignore-file "src/generated/**"
tailwind-pattern-audit --ignore-pattern "rounded-md border bg-white p-4"
```

## Similarity

Near-duplicate detection is opt-in:

```bash
tailwind-pattern-audit --similar --min-similarity 0.7
```

## CI Gates

```bash
tailwind-pattern-audit --fail-on duplicates --max-groups 0
tailwind-pattern-audit --fail-on diagnostics warnings errors
```

Use a baseline to ignore current duplicate groups while failing on new ones:

```bash
tailwind-pattern-audit baseline create --baseline-output tailwind-audit-baseline.json
tailwind-pattern-audit --baseline tailwind-audit-baseline.json --fail-on duplicates
```
