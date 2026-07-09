import { describe, expect, it } from "vitest";

import { evaluateCiGate } from "../src/index.js";
import type { AuditReport } from "../src/index.js";

describe("evaluateCiGate", () => {
  it("fails when duplicate groups are disallowed", () => {
    const result = evaluateCiGate(reportWithDuplicates(), {
      failOn: ["duplicates"],
    });

    expect(result.failed).toBe(true);
    expect(result.reasons[0]).toContain("duplicate group");
  });

  it("fails when duplicate occurrence count exceeds the configured maximum", () => {
    const result = evaluateCiGate(reportWithDuplicates(), {
      failOn: [],
      maxOccurrences: 1,
    });

    expect(result.failed).toBe(true);
    expect(result.reasons[0]).toContain("maxOccurrences=1");
  });

  it("passes when thresholds are not exceeded", () => {
    const result = evaluateCiGate(reportWithDuplicates(), {
      failOn: [],
      maxGroups: 2,
      maxOccurrences: 4,
    });

    expect(result).toEqual({ failed: false, reasons: [] });
  });
});

function reportWithDuplicates(): AuditReport {
  return {
    schemaVersion: 1,
    toolVersion: "0.1.0",
    cwd: "/repo",
    scannedFiles: 2,
    occurrences: 2,
    diagnostics: [],
    durationMs: 10,
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
            line: 1,
            column: 1,
            raw: "px-4 py-2 text-sm font-medium",
            normalized: "font-medium px-4 py-2 text-sm",
            tokens: ["px-4", "py-2", "text-sm", "font-medium"],
            source: { extractor: "javascript", kind: "jsxAttribute", name: "className" },
          },
          {
            filePath: "src/B.tsx",
            line: 1,
            column: 1,
            raw: "font-medium text-sm py-2 px-4",
            normalized: "font-medium px-4 py-2 text-sm",
            tokens: ["font-medium", "text-sm", "py-2", "px-4"],
            source: { extractor: "javascript", kind: "jsxAttribute", name: "className" },
          },
        ],
      },
    ],
  };
}
