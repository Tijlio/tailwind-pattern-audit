# VS Code Roadmap

The VS Code extension should reuse the CLI and report schema instead of implementing a second
scanner.

## Milestones

1. Add an HTML report to the CLI.
2. Scaffold a VS Code extension that shells out to `tailwind-pattern-audit --json`.
3. Show duplicate groups, similar groups, and diagnostics in a read-only Tree View.
4. Open source files at the reported line and column.
5. Add hovers, decorations, and CodeLens actions for repeated patterns.
6. Add commands for config validation, baseline creation, and ignore workflows.
7. Reuse the HTML report as a VS Code webview.

## Extension Commands

Planned commands:

- `Tailwind Pattern Audit: Run`
- `Tailwind Pattern Audit: Validate Config`
- `Tailwind Pattern Audit: Print Config`
- `Tailwind Pattern Audit: Create Baseline`
- `Tailwind Pattern Audit: Open Report`

## Product Rule

Editor results, CI output, SARIF, Markdown, and future HTML reports should all agree because they
come from the same `AuditReport` data.
