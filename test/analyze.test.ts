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

  it("filters duplicate groups found in a baseline report", async () => {
    const fixture = await createFixture({
      "src/One.tsx": `
        export function One() {
          return <button className="rounded-md border bg-white p-4" />;
        }
      `,
      "src/Two.tsx": `
        export function Two() {
          return <a className="p-4 bg-white border rounded-md" />;
        }
      `,
    });
    const baseline = await analyzeProject({ cwd: fixture, minClasses: 4 });
    await writeFile(path.join(fixture, "tailwind-audit-baseline.json"), JSON.stringify(baseline));

    const report = await analyzeProject({
      cwd: fixture,
      minClasses: 4,
      baseline: "tailwind-audit-baseline.json",
    });

    expect(baseline.groups).toHaveLength(1);
    expect(report.groups).toHaveLength(0);
  });

  it("filters duplicate groups by ignored normalized class patterns", async () => {
    const fixture = await createFixture({
      "src/One.tsx": `
        export function One() {
          return <button className="rounded-md border bg-white p-4" />;
        }
      `,
      "src/Two.tsx": `
        export function Two() {
          return <a className="p-4 bg-white border rounded-md" />;
        }
      `,
    });

    const report = await analyzeProject({
      cwd: fixture,
      minClasses: 4,
      ignorePatterns: ["p-4 bg-white border rounded-md"],
    });

    expect(report.occurrences).toBe(0);
    expect(report.groups).toHaveLength(0);
  });

  it("filters report evidence and diagnostics by ignored file globs", async () => {
    const fixture = await createFixture({
      "src/One.tsx": `
        export function One({ active }: { active: boolean }) {
          return (
            <>
              <button className="rounded-md border bg-white p-4" />
              <div className={active ? classes.active : classes.inactive} />
            </>
          );
        }
      `,
      "src/ignored/Two.tsx": `
        export function Two({ active }: { active: boolean }) {
          return (
            <>
              <a className="p-4 bg-white border rounded-md" />
              <div className={active ? classes.active : classes.inactive} />
            </>
          );
        }
      `,
    });

    const report = await analyzeProject({
      cwd: fixture,
      minClasses: 4,
      ignoreFiles: ["src/ignored/**"],
    });

    expect(report.scannedFiles).toBe(2);
    expect(report.occurrences).toBe(1);
    expect(report.groups).toHaveLength(0);
    expect(report.diagnostics).toHaveLength(1);
    expect(report.diagnostics[0]?.filePath).toBe("src/One.tsx");
  });

  it("extracts static branches from JSX conditional className expressions", async () => {
    const fixture = await createFixture({
      "src/Conditional.tsx": `
        export function Conditional({ active }: { active: boolean }) {
          return (
            <button className={active ? "px-4 py-2 text-sm font-medium" : "px-2 py-1 text-xs font-medium"} />
          );
        }
      `,
      "src/Static.tsx": `
        export function Static() {
          return <a className="font-medium text-sm py-2 px-4" />;
        }
      `,
    });

    const report = await analyzeProject({ cwd: fixture });

    expect(report.groups).toHaveLength(1);
    expect(report.groups[0]?.occurrenceCount).toBe(2);
    expect(report.diagnostics).toHaveLength(0);
  });

  it("combines static array and object helper arguments into one class pattern", async () => {
    const fixture = await createFixture({
      "src/Helpers.tsx": `
        export function A({ active }: { active: boolean }) {
          return <div className={cn(["rounded-md", "border"], { "bg-white p-4": active }, "text-sm")} />;
        }

        export function B() {
          return <section className={clsx("text-sm p-4 bg-white border rounded-md")} />;
        }
      `,
    });

    const report = await analyzeProject({ cwd: fixture });

    expect(report.groups).toHaveLength(1);
    expect(report.groups[0]?.occurrenceCount).toBe(2);
    expect(report.groups[0]?.rawValues.map((rawValue) => rawValue.value)).toEqual([
      "rounded-md border bg-white p-4 text-sm",
      "text-sm p-4 bg-white border rounded-md",
    ]);
  });

  it("extracts static class attributes from HTML and Astro markup", async () => {
    const fixture = await createFixture({
      "src/page.html": `
        <main>
          <section class="rounded-md border bg-white p-4">HTML card</section>
        </main>
      `,
      "src/Card.astro": `---
const ignored = '<div class="rounded-md border bg-white p-4"></div>';
---
<article class="p-4 bg-white border rounded-md">Astro card</article>
      `,
    });

    const report = await analyzeProject({ cwd: fixture, minClasses: 4 });

    expect(report.groups).toHaveLength(1);
    expect(report.groups[0]).toMatchObject({
      occurrenceCount: 2,
      normalized: "bg-white border p-4 rounded-md",
    });
    expect(report.groups[0]?.occurrences.map((occurrence) => occurrence.source)).toEqual([
      { extractor: "html", kind: "htmlAttribute", name: "class" },
      { extractor: "html", kind: "htmlAttribute", name: "class" },
    ]);
  });

  it("extracts static class:list values from Astro markup", async () => {
    const fixture = await createFixture({
      "src/page.html": `
        <section class="rounded-md border bg-white p-4">HTML card</section>
      `,
      "src/Card.astro": `---
const active = Astro.props.active;
---
<article class:list={["rounded-md border", { "bg-white p-4": active, hidden: false }]}>
  Astro card
</article>
      `,
    });

    const report = await analyzeProject({ cwd: fixture, minClasses: 4 });

    expect(report.groups).toHaveLength(1);
    expect(report.groups[0]).toMatchObject({
      occurrenceCount: 2,
      normalized: "bg-white border p-4 rounded-md",
    });
    expect(report.groups[0]?.occurrences.map((occurrence) => occurrence.source.name)).toContain(
      "class:list",
    );
  });

  it("extracts static class attributes from Vue and Svelte markup", async () => {
    const fixture = await createFixture({
      "src/Card.vue": `
        <template>
          <section class="rounded-md border bg-white p-4">Vue card</section>
        </template>

        <script setup>
        const ignored = '<div class="rounded-md border bg-white p-4"></div>';
        </script>
      `,
      "src/Card.svelte": `
        <script>
          const ignored = '<div class="rounded-md border bg-white p-4"></div>';
        </script>

        <article class="p-4 bg-white border rounded-md">Svelte card</article>
      `,
    });

    const report = await analyzeProject({ cwd: fixture, minClasses: 4 });

    expect(report.groups).toHaveLength(1);
    expect(report.groups[0]).toMatchObject({
      occurrenceCount: 2,
      normalized: "bg-white border p-4 rounded-md",
    });
    expect(report.groups[0]?.occurrences.map((occurrence) => occurrence.filePath)).toEqual([
      "src/Card.svelte",
      "src/Card.vue",
    ]);
  });

  it("extracts CVA base, variant, and compound variant class candidates", async () => {
    const fixture = await createFixture({
      "src/button.ts": `
        import { cva } from "class-variance-authority";

        export const button = cva("inline-flex items-center rounded-md px-4 py-2", {
          variants: {
            intent: {
              primary: "bg-blue-600 text-white hover:bg-blue-700",
              secondary: "bg-white text-slate-900 hover:bg-slate-50"
            }
          },
          compoundVariants: [
            { intent: "primary", class: "shadow-sm ring-1 ring-blue-500" }
          ]
        });

        export const linkButton = cva("py-2 inline-flex rounded-md items-center px-4", {
          variants: {
            intent: {
              primary: "hover:bg-blue-700 text-white bg-blue-600"
            }
          }
        });
      `,
    });

    const report = await analyzeProject({ cwd: fixture });
    const sourceNames = report.groups.flatMap((group) =>
      group.occurrences.map((occurrence) => occurrence.source.name),
    );

    expect(report.groups).toHaveLength(2);
    expect(sourceNames).toContain("cva:base");
    expect(sourceNames).toContain("cva:variant");
  });

  it("records dynamic className expressions as diagnostics instead of duplicate evidence", async () => {
    const fixture = await createFixture({
      "src/Dynamic.tsx": `
        export function Dynamic({ active }: { active: boolean }) {
          return <div className={active ? classes.active : classes.inactive} />;
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

  it("honors inline ignore comments in JavaScript and JSX files", async () => {
    const fixture = await createFixture({
      "src/One.tsx": `
        export function One() {
          return <div className="rounded-md border bg-white p-4" />;
        }
      `,
      "src/Two.tsx": `
        export function Two({ active }: { active: boolean }) {
          return (
            <>
              {/* tailwind-pattern-audit-ignore-next-line */}
              <section className="p-4 bg-white border rounded-md" />
              <article className={active ? classes.active : classes.inactive} /> {/* tailwind-pattern-audit-ignore */}
              <button className={cn("rounded-md border bg-white p-4")} /> {/* tailwind-pattern-audit-ignore */}
            </>
          );
        }
      `,
    });

    const report = await analyzeProject({ cwd: fixture, minClasses: 4 });

    expect(report.groups).toHaveLength(0);
    expect(report.diagnostics).toHaveLength(0);
  });

  it("honors inline ignore comments in markup files", async () => {
    const fixture = await createFixture({
      "src/page.html": `
        <section class="rounded-md border bg-white p-4">HTML card</section>
      `,
      "src/Card.astro": `
        <!-- tailwind-pattern-audit-ignore-next-line -->
        <article class="p-4 bg-white border rounded-md">Astro card</article>
        <div class:list={["rounded-md border bg-white p-4"]}>Ignored list</div> <!-- tailwind-pattern-audit-ignore -->
      `,
    });

    const report = await analyzeProject({ cwd: fixture, minClasses: 4 });

    expect(report.groups).toHaveLength(0);
    expect(report.diagnostics).toHaveLength(0);
  });

  it("can hide duplicate groups made only of layout primitives", async () => {
    const fixture = await createFixture({
      "src/One.tsx": `
        export function One() {
          return (
            <>
              <div className="flex items-center justify-between gap-2" />
              <button className="rounded-md border bg-white p-4" />
            </>
          );
        }
      `,
      "src/Two.tsx": `
        export function Two() {
          return (
            <>
              <section className="gap-2 flex justify-between items-center" />
              <a className="p-4 bg-white border rounded-md" />
            </>
          );
        }
      `,
    });

    const report = await analyzeProject({ cwd: fixture, hideLayoutOnly: true });

    expect(report.groups).toHaveLength(1);
    expect(report.groups[0]?.normalized).toBe("bg-white border p-4 rounded-md");
  });

  it("detects similar static class sets when enabled", async () => {
    const fixture = await createFixture({
      "src/One.tsx": `
        export function One() {
          return <button className="rounded-md border bg-white p-4 text-sm font-medium" />;
        }
      `,
      "src/Two.tsx": `
        export function Two() {
          return <a className="rounded-md border bg-card p-4 text-sm font-medium" />;
        }
      `,
    });

    const report = await analyzeProject({
      cwd: fixture,
      similar: true,
      minSimilarity: 0.7,
    });

    expect(report.groups).toHaveLength(0);
    expect(report.similarGroups).toHaveLength(1);
    expect(report.similarGroups?.[0]).toMatchObject({
      id: "twpa-sim-001",
      similarity: 0.714,
      sharedTokens: ["rounded-md", "border", "p-4", "text-sm", "font-medium"],
    });
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
