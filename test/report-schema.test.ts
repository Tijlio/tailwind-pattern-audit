import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";

import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

import { analyzeProject, AUDIT_REPORT_SCHEMA, formatReport } from "../src/index.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));

describe("AUDIT_REPORT_SCHEMA", () => {
  it("validates generated JSON reports", async () => {
    const ajv = new Ajv2020();
    const validate = ajv.compile(AUDIT_REPORT_SCHEMA);
    const report = await analyzeProject({
      cwd: path.join(dirname, "fixtures/next-shadcn"),
      minClasses: 4,
    });
    const parsed = JSON.parse(formatReport(report, "json")) as unknown;

    expect(validate(parsed), JSON.stringify(validate.errors, null, 2)).toBe(true);
  });

  it("validates generated JSON reports with similar groups", async () => {
    const ajv = new Ajv2020();
    const validate = ajv.compile(AUDIT_REPORT_SCHEMA);
    const report = await analyzeProject({
      cwd: path.join(dirname, "fixtures/next-shadcn"),
      minClasses: 4,
      similar: true,
      minSimilarity: 0.6,
    });
    const parsed = JSON.parse(formatReport(report, "json")) as unknown;

    expect(validate(parsed), JSON.stringify(validate.errors, null, 2)).toBe(true);
  });

  it("validates generated JSON reports with markup occurrences", async () => {
    const ajv = new Ajv2020();
    const validate = ajv.compile(AUDIT_REPORT_SCHEMA);
    const cwd = await createTempProject({
      "src/One.html": `<div class="rounded-md border bg-white p-4"></div>`,
      "src/Two.astro": `<section class="p-4 bg-white border rounded-md"></section>`,
    });
    const report = await analyzeProject({ cwd, minClasses: 4 });
    const parsed = JSON.parse(formatReport(report, "json")) as unknown;

    expect(validate(parsed), JSON.stringify(validate.errors, null, 2)).toBe(true);
  });

  it("rejects report objects with undeclared fields", () => {
    const ajv = new Ajv2020();
    const validate = ajv.compile(AUDIT_REPORT_SCHEMA);

    expect(
      validate({
        schemaVersion: 1,
        toolVersion: "0.1.0",
        cwd: "/repo",
        scannedFiles: 0,
        occurrences: 0,
        groups: [],
        diagnostics: [],
        durationMs: 0,
        extra: true,
      }),
    ).toBe(false);
  });
});

async function createTempProject(files: Record<string, string>): Promise<string> {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "twpa-schema-"));

  await Promise.all(
    Object.entries(files).map(async ([relativePath, contents]) => {
      const filePath = path.join(cwd, relativePath);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, contents);
    }),
  );

  return cwd;
}
