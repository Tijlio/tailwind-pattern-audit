# SARIF and Code Scanning

`tailwind-pattern-audit` can emit SARIF for code-scanning style workflows:

```bash
tailwind-pattern-audit --sarif --output tailwind-pattern-audit.sarif.json
```

Upload SARIF in GitHub Actions:

```yaml
name: Tailwind Pattern Audit SARIF

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read
  security-events: write

jobs:
  audit:
    runs-on: ubuntu-latest
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

SARIF rule IDs are grouped by recommendation kind:

- `tailwind-pattern-audit/duplicate-component-pattern`
- `tailwind-pattern-audit/duplicate-cva-pattern`
- `tailwind-pattern-audit/duplicate-utility-pattern`

Diagnostics use `tailwind-pattern-audit/<diagnostic-code>`.
