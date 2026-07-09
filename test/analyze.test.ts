import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { analyzeFiles, analyzeProject } from "../src/index.js";

describe("analyzeFiles", () => {
  it("groups duplicate static className values across files", async () => {
    const fixture = await createFixture({
      "src/One.tsx": `
        export function One() {
          return <button className="px-4 py-2 text-sm font-medium">Save</button>;
        }
      `,
      "src/Two.tsx": `
        export function Two() {
          return <a className={"font-medium text-sm py-2 px-4"}>Open</a>;
        }
      `,
    });

    const report = await analyzeFiles(
      [path.join(fixture, "src/One.tsx"), path.join(fixture, "src/Two.tsx")],
      { cwd: fixture },
    );

    expect(report.groups).toHaveLength(1);
    expect(report.groups[0]).toMatchObject({
      id: "twpa-001",
      occurrenceCount: 2,
      classCount: 4,
    });
    expect(report.groups[0]?.occurrences.map((occurrence) => occurrence.filePath)).toEqual([
      "src/One.tsx",
      "src/Two.tsx",
    ]);
  });

  it("extracts static class strings from configured helper calls", async () => {
    const fixture = await createFixture({
      "src/Card.tsx": `
        import { cn } from "./cn";

        export function A() {
          return <div className={cn("rounded-md border bg-white p-4", false && "hidden")} />;
        }

        export function B() {
          return <section className={cn("p-4 bg-white border rounded-md")} />;
        }
      `,
    });

    const report = await analyzeProject({ cwd: fixture, minClasses: 3 });

    expect(report.groups).toHaveLength(1);
    expect(report.groups[0]?.occurrenceCount).toBe(2);
    expect(report.diagnostics).toHaveLength(0);
    expect(
      report.groups[0]?.occurrences.every((occurrence) => occurrence.source.name === "cn"),
    ).toBe(true);
  });

  it("records dynamic className expressions as diagnostics instead of duplicate evidence", async () => {
    const fixture = await createFixture({
      "src/Dynamic.tsx": `
        export function Dynamic({ active }: { active: boolean }) {
          return <div className={active ? "text-sm font-medium px-4" : "text-xs font-medium px-2"} />;
        }
      `,
    });

    const report = await analyzeProject({ cwd: fixture });

    expect(report.groups).toHaveLength(0);
    expect(report.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "dynamic_classname_skipped",
        filePath: "src/Dynamic.tsx",
      }),
    );
  });
});

async function createFixture(files: Record<string, string>): Promise<string> {
  const fixture = await mkdtemp(path.join(os.tmpdir(), "twpa-"));

  await Promise.all(
    Object.entries(files).map(async ([relativePath, contents]) => {
      const filePath = path.join(fixture, relativePath);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, contents);
    }),
  );

  return fixture;
}
