# Tailwind Pattern Audit VS Code Extension

Read-only MVP scaffold for viewing `tailwind-pattern-audit` JSON reports in VS Code.

Current behavior:

- runs the bundled `tailwind-pattern-audit` library and consumes JSON output
- groups duplicate findings into review-oriented Tree View sections
- opens detail panels for duplicate and similar groups
- publishes duplicate findings and diagnostics to the Problems panel
- decorates repeated classes and provides editor hovers
- opens files at reported line and column
- contributes a dedicated Activity Bar view
- opens the full HTML report in a VS Code webview

The extension uses the public package API and does not reimplement scanning logic. A command
override is available for local development or testing a different CLI build.
