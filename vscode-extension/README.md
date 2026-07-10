# Tailwind Pattern Audit VS Code Extension

Read-only MVP scaffold for viewing `tailwind-pattern-audit` JSON reports in VS Code.

Current behavior:

- runs the CLI with `--json`
- shows duplicate groups, similar groups, and diagnostics in a Tree View
- publishes duplicate findings and diagnostics to the Problems panel
- opens files at reported line and column

The extension shells out to the CLI and does not reimplement scanning logic.
