# Changelog

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
