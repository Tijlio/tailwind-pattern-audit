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
    diagnostics: [],
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
  };

  it("formats JSON with a stable schema version", () => {
    const json = JSON.parse(formatReport(report, "json")) as AuditReport;

    expect(json.schemaVersion).toBe(1);
    expect(json.groups[0]?.id).toBe("twpa-001");
  });

  it("formats markdown with evidence locations", () => {
    const markdown = formatReport(report, "markdown");

    expect(markdown).toContain("# Tailwind Pattern Audit");
    expect(markdown).toContain("src/A.tsx:3:18");
    expect(markdown).toContain("twpa-001");
    expect(markdown).toContain("Recommendation: medium component");
  });

  it("formats terminal output with a compact summary", () => {
    const terminal = formatReport(report, "terminal");

    expect(terminal).toContain("Duplicate groups: 1");
    expect(terminal).toContain("twpa-001: 2 occurrences, 4 classes");
    expect(terminal).toContain("recommendation: medium component");
  });
});
