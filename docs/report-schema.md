# Report Schema

The JSON report is the stable contract between the CLI, GitHub Action, HTML report, SARIF output,
future VS Code extension, and third-party tools.

Generate a JSON report with:

```bash
tailwind-pattern-audit --json --output tailwind-audit.json
```

## Versioning

`schemaVersion` describes the report data shape. It is separate from the npm package version.

Current report schema:

```json
{
  "schemaVersion": 1
}
```

For `schemaVersion: 1`, documented fields keep their meaning across patch and minor releases.
New optional fields may be added in minor releases. Removing documented fields, renaming them, or
changing their meaning requires a new major schema version.

## Stable Top-Level Fields

```ts
interface AuditReport {
  schemaVersion: 1;
  toolVersion: string;
  cwd: string;
  scannedFiles: number;
  occurrences: number;
  groups: DuplicateClassGroup[];
  similarGroups?: SimilarClassGroup[];
  diagnostics: Diagnostic[];
  durationMs: number;
  performance?: AuditReportPerformance;
}
```

Field notes:

- `toolVersion` is the package version that produced the report.
- `cwd` is the project root used for the audit.
- `scannedFiles` is the number of files scanned after include and exclude filtering.
- `occurrences` is the number of static class occurrences found.
- `groups` contains exact duplicate normalized class sets.
- `similarGroups` is present when similar pattern detection is enabled and matches are found.
- `diagnostics` contains parser and analysis warnings or errors.
- `durationMs` is the total audit duration.
- `performance` is optional timing data for tooling and CI visibility.

## Duplicate Groups

Each duplicate group represents one normalized class set found in multiple places:

```ts
interface DuplicateClassGroup {
  id: string;
  normalized: string;
  classCount: number;
  occurrenceCount: number;
  rawValues: Array<{ value: string; count: number }>;
  recommendation: DuplicateClassRecommendation;
  occurrences: ClassOccurrence[];
}
```

The `id` is stable only within one generated report. Do not store it as a permanent identifier
across separate audit runs. For persistent comparisons, use `normalized` plus occurrence locations.

## Recommendations

```ts
interface DuplicateClassRecommendation {
  kind: "component" | "cva" | "utility";
  priority: "high" | "medium" | "low";
  reason: string;
  topFiles: Array<{ filePath: string; count: number }>;
}
```

Recommendations are deterministic hints. They should be treated as product guidance, not automatic
refactor instructions.

## Occurrences

```ts
interface ClassOccurrence {
  filePath: string;
  line: number;
  column: number;
  raw: string;
  normalized: string;
  tokens: string[];
  source: {
    extractor: string;
    kind: "jsxAttribute" | "helperCall" | "htmlAttribute";
    name: string;
  };
}
```

Use `filePath`, `line`, and `column` for editor integrations. Use `raw` when showing the exact
source string, and `normalized` when grouping or comparing class sets.

## Similar Groups

Similar groups are emitted only when similar detection is enabled:

```bash
tailwind-pattern-audit --json --similar --output tailwind-audit.json
```

```ts
interface SimilarClassGroup {
  id: string;
  similarity: number;
  sharedTokens: string[];
  candidates: SimilarClassCandidate[];
}
```

The current schema returns two candidates per similar group. Future schema versions may expand this
if larger clusters become useful.

## Diagnostics

```ts
interface Diagnostic {
  severity: "info" | "warning" | "error";
  code: string;
  message: string;
  filePath?: string;
  line?: number;
  column?: number;
}
```

Diagnostics are intended for CLI output, GitHub annotations, editor Problems panels, and CI logs.

## Validation

JavaScript and TypeScript consumers can import the schema object:

```ts
import { AUDIT_REPORT_SCHEMA } from "tailwind-pattern-audit";
```

The schema is a JSON Schema 2020-12 object. The repository test suite validates generated reports
against it.

## Consumer Guidance

For integrations:

- Read JSON output from `tailwind-pattern-audit --json`.
- Depend only on documented fields.
- Ignore unknown optional fields if they appear in future versions.
- Prefer `normalized` for grouping and `filePath`/`line`/`column` for navigation.
- Do not import private source files from the package.
- Do not reimplement scanning logic in wrappers.

For VS Code specifically:

- Run the CLI or call the public library API.
- Parse the JSON report.
- Use `groups` for a tree view.
- Use `diagnostics` and occurrence locations for the Problems panel.
- Keep fixes and codemods outside the read-only MVP.
