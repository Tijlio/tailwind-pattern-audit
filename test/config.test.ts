import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { analyzeProject } from "../src/index.js";

describe("config validation", () => {
  it("fails clearly when an explicit config file is missing", async () => {
    const cwd = await createTempProject();

    await expect(analyzeProject({ cwd, configFile: "missing.config.json" })).rejects.toThrow(
      /Config file not found/,
    );
  });

  it("rejects unsupported config options", async () => {
    const cwd = await createTempProject({
      "tailwind-pattern-audit.config.json": JSON.stringify({
        include: ["src/**/*.tsx"],
        unsupported: true,
      }),
    });

    await expect(analyzeProject({ cwd })).rejects.toThrow(
      /Unsupported config option "unsupported"/,
    );
  });

  it("accepts JSON schema metadata in config files", async () => {
    const cwd = await createTempProject({
      "tailwind-pattern-audit.config.json": JSON.stringify({
        $schema:
          "https://raw.githubusercontent.com/Tijlio/tailwind-pattern-audit/main/schemas/config.schema.json",
        minClasses: 4,
      }),
    });

    const report = await analyzeProject({ cwd });

    expect(report.groups).toHaveLength(0);
  });

  it("accepts report ignore controls in config files", async () => {
    const cwd = await createTempProject({
      "tailwind-pattern-audit.config.json": JSON.stringify({
        ignoreFiles: ["src/ignored/**"],
        ignorePatterns: ["rounded-md border bg-white p-4"],
      }),
    });

    const report = await analyzeProject({ cwd });

    expect(report.groups).toHaveLength(0);
  });

  it("rejects invalid threshold values from config", async () => {
    const cwd = await createTempProject({
      "tailwind-pattern-audit.config.json": JSON.stringify({
        minOccurrences: 0,
      }),
    });

    await expect(analyzeProject({ cwd })).rejects.toThrow(
      /"minOccurrences" must be a positive integer/,
    );
  });

  it("rejects invalid CI failure conditions from config", async () => {
    const cwd = await createTempProject({
      "tailwind-pattern-audit.config.json": JSON.stringify({
        failOn: ["duplicates", "unknown"],
      }),
    });

    await expect(analyzeProject({ cwd })).rejects.toThrow(/"failOn" must be an array/);
  });

  it("rejects invalid recommendation filters from config", async () => {
    const cwd = await createTempProject({
      "tailwind-pattern-audit.config.json": JSON.stringify({
        priority: ["urgent"],
        kind: ["component"],
      }),
    });

    await expect(analyzeProject({ cwd })).rejects.toThrow(/"priority" must be an array/);
  });

  it("rejects invalid boolean options from config", async () => {
    const cwd = await createTempProject({
      "tailwind-pattern-audit.config.json": JSON.stringify({
        hideLayoutOnly: "yes",
      }),
    });

    await expect(analyzeProject({ cwd })).rejects.toThrow(/"hideLayoutOnly" must be a boolean/);
  });

  it("rejects invalid similarity thresholds from config", async () => {
    const cwd = await createTempProject({
      "tailwind-pattern-audit.config.json": JSON.stringify({
        minSimilarity: 1.5,
      }),
    });

    await expect(analyzeProject({ cwd })).rejects.toThrow(
      /"minSimilarity" must be a number greater than 0 and up to 1/,
    );
  });

  it("rejects invalid baseline paths from config", async () => {
    const cwd = await createTempProject({
      "tailwind-pattern-audit.config.json": JSON.stringify({
        baseline: "",
      }),
    });

    await expect(analyzeProject({ cwd })).rejects.toThrow(/"baseline" must be a non-empty string/);
  });
});

async function createTempProject(files: Record<string, string> = {}): Promise<string> {
  const cwd = await mkdir(path.join(os.tmpdir(), `twpa-config-${crypto.randomUUID()}`), {
    recursive: true,
  });

  if (!cwd) {
    throw new Error("Unable to create temp project.");
  }

  await Promise.all(
    Object.entries(files).map(async ([relativePath, contents]) => {
      const filePath = path.join(cwd, relativePath);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, contents);
    }),
  );

  return cwd;
}
