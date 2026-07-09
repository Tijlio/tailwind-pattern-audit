import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

import { describe, expect, it } from "vitest";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dirname, "..");
const fixture = path.join(dirname, "fixtures/next-shadcn");
const cli = path.join(root, "src/cli.ts");

describe("CLI", () => {
  it("prints JSON reports to stdout", async () => {
    const result = await runCli(["--cwd", fixture, "--json"]);
    const report = JSON.parse(result.stdout) as { groups: unknown[]; scannedFiles: number };

    expect(result.exitCode).toBe(0);
    expect(report.scannedFiles).toBe(4);
    expect(report.groups.length).toBeGreaterThan(0);
    expect(result.stderr).toBe("");
  });

  it("writes reports to output files", async () => {
    const outputPath = path.join(fixture, `twpa-${crypto.randomUUID()}.md`);

    try {
      const result = await runCli([
        "--cwd",
        fixture,
        "--markdown",
        "--output",
        outputPath,
        "--quiet",
      ]);
      const output = await readFile(outputPath, "utf8");

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("");
      expect(output).toContain("# Tailwind Pattern Audit");
      expect(output).toContain("Recommendation:");
    } finally {
      await rm(outputPath, { force: true });
    }
  });

  it("returns a non-zero exit code when CI gate conditions fail", async () => {
    const result = await runCli(["--cwd", fixture, "--json", "--fail-on", "duplicates"]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('"groups"');
    expect(result.stderr).toContain("CI gate failed");
  });
});

interface CliResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

function runCli(args: string[]): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn("pnpm", ["exec", "tsx", cli, ...args], {
      cwd: root,
      shell: process.platform === "win32",
      env: {
        ...process.env,
        FORCE_COLOR: "0",
      },
    });
    const stdout: string[] = [];
    const stderr: string[] = [];

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => stdout.push(chunk));
    child.stderr.on("data", (chunk: string) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (exitCode) => {
      resolve({
        exitCode,
        stdout: stdout.join(""),
        stderr: stderr.join(""),
      });
    });
  });
}
