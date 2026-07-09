# Changelog

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
