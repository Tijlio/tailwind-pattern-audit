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
