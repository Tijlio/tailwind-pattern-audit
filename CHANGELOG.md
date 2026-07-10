# Changelog

## 1.2.1

- Added packaged HTML report documentation and screenshot assets.
- Added packaged report schema documentation and copy-paste integration examples.
- Added CI and release smoke checks for generated JSON, HTML, and SARIF reports.

## 1.2.0

- Added self-contained HTML report output with `--format html` and `--html`.
- Exported `generateHtml` from the public reporter API.
- Documented the HTML report as the bridge toward the future VS Code webview.

## 1.1.0

- Added `config validate` and `config print` commands for CI and local config debugging.
- Added `baseline create` for first-run CI adoption without hand-writing baseline commands.
- Added JSX `class` attribute extraction for Solid and Preact style components.
- Added structured JSON report performance metrics.
- Improved SARIF output with recommendation-kind rule IDs and richer result metadata.
- Added issue templates, contribution guidance, and a security policy.

## 1.0.0

- Added SARIF report output with `--format sarif` and `--sarif`.
- Added report-level ignore controls for generated files and known repeated class patterns.
- Added `ignoreFiles` and `ignorePatterns` config options and GitHub Action inputs.
- Fixed the JSON report schema so markup occurrence sources validate correctly.
- Added prerelease-aware npm publishing for future release candidates.

## 0.1.13

- Added `--format github` for GitHub workflow annotation output.
- Added `--github` and `--annotation-limit` CLI options.
- Added `annotations` and `annotation-limit` inputs to the GitHub Action.

## 0.1.12

- Added a published JSON schema for `tailwind-pattern-audit.config.json`.
- Generated config files now include a `$schema` reference for editor autocomplete.
- Allowed `$schema` metadata in config validation.

## 0.1.11

- Added inline ignore comments for intentional duplicate class patterns.
- Suppressed ignored dynamic `className` diagnostics alongside ignored static evidence.
- Documented same-line and next-line ignore usage for JSX and markup files.

## 0.1.10

- Shared static string extraction between JavaScript and markup extractors.
- Reduced reporter duplication with common summary, escaping, and pattern formatting helpers.
- Refactored config option merging and similar-group pairing for lower maintenance risk.
- Removed internal-only exports from the generated package surface.

## 0.1.9

- Added `comment: true` support to the GitHub Action for posting or updating PR comments.
- Documented pull request comment permissions and refreshed the supported scope list.

## 0.1.8

- Added `--baseline` support for ignoring duplicate groups present in a previous JSON report.
- Added `baseline` config and GitHub Action inputs.
- Documented the baseline workflow for CI adoption.

## 0.1.7

- Added static `class` attribute extraction for `.vue` and `.svelte` files.
- Expanded default scan globs and starter config to include Vue and Svelte files.
- Updated package and action descriptions for Vue and Svelte support.

## 0.1.6

- Updated bundled GitHub Actions dependencies to current Node 24-based major versions.

## 0.1.5

- Added static Astro `class:list` extraction for string, array, object, logical, and conditional values.
- Updated CI, release, and action defaults to Node.js 24.
- Updated the GitHub Action metadata description for HTML and Astro support.

## 0.1.4

- Added static `class` attribute extraction for `.html` and `.astro` files.
- Added Astro frontmatter handling so script strings are not counted as markup evidence.
- Expanded default scan globs and starter config to include HTML and Astro files.

## 0.1.3

- Added opt-in near-duplicate class set detection with `--similar`.
- Added `--min-similarity` and `--max-similar-groups` controls.
- Added similar-group output to terminal, Markdown, PR, and JSON reports.

## 0.1.2

- Added layout-only duplicate filtering with `--hide-layout-only`.
- Added compact PR-comment report output with `--format pr` and `--pr`.
- Added release instructions to the README.
- Made the CLI/report version read from package metadata.

## 0.1.1

- Added npm trusted-publishing release workflow.
- Added `tailwind-pattern-audit init` for generating a starter config.
- Added recommendation filtering by priority and kind.
- Added priority and kind summaries to terminal and Markdown reports.
- Added README status badges.
- Improved Markdown reports with grouped top-candidate sections.
- Updated the release workflow to use an npm CLI version with trusted publishing support.

## 0.1.0

- Initial npm release.
- Added JavaScript and TypeScript static Tailwind class extraction.
- Added duplicate grouping, recommendations, JSON/Markdown/terminal reports, CI gate controls, and GitHub Action support.
