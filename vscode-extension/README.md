# Tailwind Pattern Audit VS Code Extension

Read-only MVP scaffold for viewing `tailwind-pattern-audit` JSON reports in VS Code.

Current behavior:

- runs the bundled `tailwind-pattern-audit` library and consumes JSON output
- shows duplicate groups, similar groups, and diagnostics in a Tree View
- publishes duplicate findings and diagnostics to the Problems panel
- opens files at reported line and column
- contributes a dedicated Activity Bar view

The extension uses the public package API and does not reimplement scanning logic. A command
override is available for local development or testing a different CLI build.
