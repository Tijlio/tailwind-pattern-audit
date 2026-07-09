# Tailwind Pattern Audit Docs

`tailwind-pattern-audit` finds repeated static Tailwind class patterns and turns them into
actionable reports for local cleanup, CI, pull requests, and code scanning.

## Start Here

- [Getting started](getting-started.md)
- [CLI reference](cli.md)
- [Configuration](config.md)
- [GitHub Action](github-action.md)
- [SARIF and code scanning](sarif-code-scanning.md)
- [VS Code roadmap](vscode-roadmap.md)

## Product Shape

The CLI is the source of truth. The GitHub Action, SARIF output, future HTML report, and future
VS Code extension should all reuse the same report data instead of reimplementing scanning logic.

Keep the root `README.md` short and installation-focused. Use these docs for workflow details and
longer examples.
