import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { analyzeProject } from "../src/index.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));

describe("fixture projects", () => {
  it("finds duplicate patterns in a Next-style shadcn fixture", async () => {
    const fixturePath = path.join(dirname, "fixtures/next-shadcn");
    const report = await analyzeProject({ cwd: fixturePath, minClasses: 4 });
    const sourceNames = new Set(
      report.groups.flatMap((group) =>
        group.occurrences.map((occurrence) => occurrence.source.name),
      ),
    );

    expect(report.scannedFiles).toBe(4);
    expect(report.groups.length).toBeGreaterThanOrEqual(3);
    expect(sourceNames).toContain("className");
    expect(sourceNames).toContain("clsx");
    expect(sourceNames).toContain("cn");
    expect(sourceNames).toContain("cva:base");
    expect(report.groups.some((group) => group.occurrenceCount >= 3)).toBe(true);
  });
});
