# GitHub Action

Use the action to add PR comments, workflow annotations, and CI gates.

```yaml
name: Tailwind Pattern Audit

on:
  pull_request:

permissions:
  contents: read
  pull-requests: write

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: Tijlio/tailwind-pattern-audit@v1
        with:
          format: pr
          comment: true
          annotations: true
          annotation-limit: 25
          hide-layout-only: true
          fail-on: duplicates
          max-groups: 0
          baseline: tailwind-audit-baseline.json
```

## Adoption With A Baseline

Create a baseline locally and commit it:

```bash
tailwind-pattern-audit baseline create --baseline-output tailwind-audit-baseline.json
```

Then configure the action with:

```yaml
with:
  baseline: tailwind-audit-baseline.json
  fail-on: duplicates
```

This lets existing duplicate groups pass while new duplicate groups fail CI.
