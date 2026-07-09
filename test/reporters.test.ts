import { describe, expect, it } from "vitest";

import { formatReport, type AuditReport } from "../src/index.js";

describe("formatReport", () => {
  const report: AuditReport = {
    schemaVersion: 1,
    toolVersion: "0.1.0",
    cwd: "/repo",
    scannedFiles: 2,
    occurrences: 2,
    durationMs: 12,
    diagnostics: [
      {
        severity: "warning",
        code: "parse_recovered",
        message: "Recovered parse issue\nwith details.",
        filePath: "src/B.tsx",
        line: 10,
        column: 4,
      },
      {
        severity: "info",
        code: "dynamic_classname_skipped",
        message: "Skipped dynamic className expression.",
        filePath: "src/C.tsx",
        line: 12,
        column: 6,
      },
    ],
    groups: [
      {
        id: "twpa-001",
        normalized: "font-medium px-4 py-2 text-sm",
        classCount: 4,
        occurrenceCount: 2,
        rawValues: [{ value: "px-4 py-2 text-sm font-medium", count: 2 }],
        recommendation: {
          kind: "component",
          priority: "medium",
          reason: "Repeated class sets across files are good component extraction candidates.",
          topFiles: [
            { filePath: "src/A.tsx", count: 1 },
            { filePath: "src/B.tsx", count: 1 },
          ],
        },
        occurrences: [
          {
            filePath: "src/A.tsx",
            line: 3,
            column: 18,
            raw: "px-4 py-2 text-sm font-medium",
            normalized: "font-medium px-4 py-2 text-sm",
            tokens: ["px-4", "py-2", "text-sm", "font-medium"],
            source: {
              extractor: "javascript",
              kind: "jsxAttribute",
              name: "className",
            },
          },
          {
            filePath: "src/B.tsx",
            line: 5,
            column: 21,
            raw: "px-4 py-2 text-sm font-medium",
            normalized: "font-medium px-4 py-2 text-sm",
            tokens: ["px-4", "py-2", "text-sm", "font-medium"],
            source: {
              extractor: "javascript",
              kind: "jsxAttribute",
              name: "className",
            },
          },
        ],
      },
    ],
    similarGroups: [
      {
        id: "twpa-sim-001",
        similarity: 0.714,
        sharedTokens: ["rounded-md", "border", "p-4"],
        candidates: [
          {
            normalized: "bg-white border p-4 rounded-md",
            classCount: 4,
            occurrenceCount: 1,
            rawValues: [{ value: "rounded-md border bg-white p-4", count: 1 }],
            occurrences: [
              {
                filePath: "src/CardA.tsx",
                line: 2,
                column: 12,
                raw: "rounded-md border bg-white p-4",
                normalized: "bg-white border p-4 rounded-md",
                tokens: ["rounded-md", "border", "bg-white", "p-4"],
                source: {
                  extractor: "javascript",
                  kind: "jsxAttribute",
                  name: "className",
                },
              },
            ],
          },
          {
            normalized: "bg-card border p-4 rounded-md",
            classCount: 4,
            occurrenceCount: 1,
            rawValues: [{ value: "rounded-md border bg-card p-4", count: 1 }],
            occurrences: [
              {
                filePath: "src/CardB.tsx",
                line: 2,
                column: 12,
                raw: "rounded-md border bg-card p-4",
                normalized: "bg-card border p-4 rounded-md",
                tokens: ["rounded-md", "border", "bg-card", "p-4"],
                source: {
                  extractor: "javascript",
                  kind: "jsxAttribute",
                  name: "className",
                },
              },
            ],
          },
        ],
      },
    ],
  };

  it("formats JSON with a stable schema version", () => {
    const json = JSON.parse(formatReport(report, "json")) as AuditReport;

    expect(json.schemaVersion).toBe(1);
    expect(json.groups[0]?.id).toBe("twpa-001");
  });

  it("formats markdown with evidence locations", () => {
    const markdown = formatReport(report, "markdown");

    expect(markdown).toContain("# Tailwind Pattern Audit");
    expect(markdown).toContain("## Top Candidates");
    expect(markdown).toContain("### Component Candidates");
    expect(markdown).toContain("[`twpa-001`](#twpa-001)");
    expect(markdown).toContain("## Duplicate Groups");
    expect(markdown).toContain("## Similar Groups");
    expect(markdown).toContain("twpa-sim-001");
    expect(markdown).toContain("src/A.tsx:3:18");
    expect(markdown).toContain("twpa-001");
    expect(markdown).toContain("Recommendation: medium component");
  });

  it("formats HTML with summary, candidates, evidence, and escaped content", () => {
    const html = formatReport(report, "html");

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("<title>Tailwind Pattern Audit</title>");
    expect(html).toContain("Duplicate groups");
    expect(html).toContain("Top Candidates");
    expect(html).toContain('href="#twpa-001"');
    expect(html).toContain("src/A.tsx:3:18");
    expect(html).toContain("Similar Groups");
    expect(html).toContain("Diagnostics");
    expect(html).toContain("Recovered parse issue");
    expect(html).not.toContain("<script");
  });

  it("formats terminal output with a compact summary", () => {
    const terminal = formatReport(report, "terminal");

    expect(terminal).toContain("Duplicate groups: 1");
    expect(terminal).toContain("Similar groups: 1");
    expect(terminal).toContain("twpa-001: 2 occurrences, 4 classes");
    expect(terminal).toContain("recommendation: medium component");
  });

  it("formats PR output without full evidence tables", () => {
    const pr = formatReport(report, "pr");

    expect(pr).toContain("## Tailwind Pattern Audit");
    expect(pr).toContain("### Top Candidates");
    expect(pr).toContain("### Similar Candidates");
    expect(pr).toContain("| `twpa-001` | medium | component | 2 | 4 |");
    expect(pr).not.toContain("src/A.tsx:3:18");
  });

  it("formats GitHub workflow annotations", () => {
    const github = formatReport(report, "github", { annotationLimit: 1 });

    expect(github).toContain(
      "::warning file=src/A.tsx,line=3,col=18,title=Tailwind Pattern Audit twpa-001::",
    );
    expect(github).toContain("Repeated Tailwind class pattern appears 2 times.");
    expect(github).toContain("Pattern: px-4 py-2 text-sm font-medium");
    expect(github).toContain(
      "::warning file=src/B.tsx,line=10,col=4,title=Tailwind Pattern Audit parse_recovered::Recovered parse issue%0Awith details.",
    );
    expect(github).not.toContain("dynamic_classname_skipped");
  });

  it("formats SARIF output for duplicate groups and diagnostics", () => {
    const sarif = JSON.parse(formatReport(report, "sarif")) as {
      version: string;
      runs: Array<{
        tool: { driver: { rules: Array<{ id: string; properties?: { tags?: string[] } }> } };
        results: Array<{
          ruleId: string;
          level: string;
          properties?: { priority?: string; kind?: string; files?: string[] };
          locations?: Array<{
            physicalLocation: {
              artifactLocation: { uri: string };
              region?: { startLine: number; startColumn?: number };
            };
          }>;
          relatedLocations?: unknown[];
        }>;
      }>;
    };

    expect(sarif.version).toBe("2.1.0");
    expect(sarif.runs[0]?.tool.driver.rules.map((rule) => rule.id)).toContain(
      "tailwind-pattern-audit/duplicate-component-pattern",
    );
    expect(sarif.runs[0]?.tool.driver.rules[0]?.properties?.tags).toContain("tailwind");
    expect(sarif.runs[0]?.results[0]).toMatchObject({
      ruleId: "tailwind-pattern-audit/duplicate-component-pattern",
      level: "warning",
      properties: {
        priority: "medium",
        kind: "component",
        files: ["src/A.tsx", "src/B.tsx"],
      },
    });
    expect(sarif.runs[0]?.results[0]?.locations?.[0]?.physicalLocation.artifactLocation.uri).toBe(
      "src/A.tsx",
    );
    expect(sarif.runs[0]?.results[0]?.relatedLocations).toHaveLength(1);
    expect(
      sarif.runs[0]?.results.some(
        (result) => result.ruleId === "tailwind-pattern-audit/parse_recovered",
      ),
    ).toBe(true);
  });
});
