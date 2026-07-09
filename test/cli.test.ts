import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
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

  it("initializes a config file", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "twpa-cli-"));

    try {
      const result = await runCli(["init", "--cwd", cwd]);
      const configPath = path.join(cwd, "tailwind-pattern-audit.config.json");
      const config = JSON.parse(await readFile(configPath, "utf8")) as {
        $schema?: string;
        minClasses?: number;
        hideLayoutOnly?: boolean;
        include?: unknown[];
      };

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Created");
      expect(result.stderr).toBe("");
      expect(config.$schema).toBe(
        "https://raw.githubusercontent.com/Tijlio/tailwind-pattern-audit/main/schemas/config.schema.json",
      );
      expect(config.minClasses).toBe(4);
      expect(config.hideLayoutOnly).toBe(true);
      expect(config.include?.length).toBeGreaterThan(0);
    } finally {
      await rm(cwd, { force: true, recursive: true });
    }
  });

  it("validates and prints resolved config", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "twpa-cli-config-"));

    try {
      await writeFile(
        path.join(cwd, "tailwind-pattern-audit.config.json"),
        JSON.stringify({ minClasses: 4, hideLayoutOnly: true }),
      );

      const validate = await runCli(["config", "validate", "--cwd", cwd]);
      const print = await runCli(["config", "print", "--cwd", cwd]);
      const resolved = JSON.parse(print.stdout) as {
        cwd: string;
        minClasses: number;
        hideLayoutOnly: boolean;
      };

      expect(validate.exitCode).toBe(0);
      expect(validate.stdout).toContain("Configuration OK");
      expect(validate.stderr).toBe("");
      expect(print.exitCode).toBe(0);
      expect(resolved.cwd).toBe(cwd);
      expect(resolved.minClasses).toBe(4);
      expect(resolved.hideLayoutOnly).toBe(true);
    } finally {
      await rm(cwd, { force: true, recursive: true });
    }
  });

  it("creates baseline reports", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "twpa-cli-baseline-"));
    const outputPath = path.join(cwd, "baseline.json");

    try {
      await cp(fixture, cwd, { recursive: true });

      const result = await runCli([
        "baseline",
        "create",
        "--cwd",
        cwd,
        "--baseline-output",
        outputPath,
        "--min-classes",
        "4",
        "--hide-layout-only",
        "--baseline-quiet",
      ]);
      const baseline = JSON.parse(await readFile(outputPath, "utf8")) as {
        groups: unknown[];
        performance?: { filesPerSecond: number };
      };

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("");
      expect(result.stderr).toBe("");
      expect(baseline.groups).toHaveLength(3);
      expect(baseline.performance?.filesPerSecond).toEqual(expect.any(Number));
    } finally {
      await rm(cwd, { force: true, recursive: true });
    }
  });

  it("filters reports by recommendation kind", async () => {
    const result = await runCli(["--cwd", fixture, "--json", "--kind", "cva"]);
    const report = JSON.parse(result.stdout) as {
      groups: Array<{ recommendation: { kind: string } }>;
    };

    expect(result.exitCode).toBe(0);
    expect(report.groups.length).toBeGreaterThan(0);
    expect(report.groups.every((group) => group.recommendation.kind === "cva")).toBe(true);
  });

  it("prints compact PR reports", async () => {
    const result = await runCli(["--cwd", fixture, "--pr"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("## Tailwind Pattern Audit");
    expect(result.stdout).toContain("### Top Candidates");
    expect(result.stdout).not.toContain("## Duplicate Groups");
    expect(result.stderr).toBe("");
  });

  it("prints GitHub workflow annotations", async () => {
    const result = await runCli(["--cwd", fixture, "--github", "--annotation-limit", "1"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("::warning file=");
    expect(result.stdout).toContain("Tailwind Pattern Audit twpa-001");
    expect(result.stdout).toContain("Showing 1 of");
    expect(result.stderr).toBe("");
  });

  it("prints SARIF reports", async () => {
    const result = await runCli(["--cwd", fixture, "--sarif"]);
    const sarif = JSON.parse(result.stdout) as {
      version: string;
      runs: Array<{ results: unknown[] }>;
    };

    expect(result.exitCode).toBe(0);
    expect(sarif.version).toBe("2.1.0");
    expect(sarif.runs[0]?.results.length).toBeGreaterThan(0);
    expect(result.stderr).toBe("");
  });

  it("filters reports with CLI ignore options", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "twpa-cli-ignore-"));

    try {
      await cp(fixture, cwd, { recursive: true });
      await writeFile(
        path.join(cwd, "tailwind-pattern-audit.config.json"),
        JSON.stringify({
          ignorePatterns: ["inline-flex items-center rounded-md px-4 py-2 text-sm font-medium"],
        }),
      );

      const result = await runCli([
        "--cwd",
        cwd,
        "--json",
        "--ignore-file",
        "src/components/ui/**",
      ]);
      const report = JSON.parse(result.stdout) as {
        groups: Array<{ normalized: string; occurrences: Array<{ filePath: string }> }>;
      };

      expect(result.exitCode).toBe(0);
      expect(
        report.groups.some(
          (group) =>
            group.normalized ===
            "font-medium inline-flex items-center px-4 py-2 rounded-md text-sm",
        ),
      ).toBe(false);
      expect(
        report.groups.some((group) =>
          group.occurrences.some((occurrence) =>
            occurrence.filePath.startsWith("src/components/ui/"),
          ),
        ),
      ).toBe(false);
      expect(result.stderr).toBe("");
    } finally {
      await rm(cwd, { force: true, recursive: true });
    }
  });

  it("prints similar groups in JSON reports when enabled", async () => {
    const result = await runCli([
      "--cwd",
      fixture,
      "--json",
      "--similar",
      "--min-similarity",
      "0.7",
    ]);
    const report = JSON.parse(result.stdout) as {
      similarGroups?: unknown[];
    };

    expect(result.exitCode).toBe(0);
    expect(report.similarGroups).toBeDefined();
    expect(result.stderr).toBe("");
  });

  it("filters duplicate groups from a baseline report before CI gates run", async () => {
    const outputPath = path.join(fixture, `twpa-baseline-${crypto.randomUUID()}.json`);

    try {
      const baseline = await runCli([
        "--cwd",
        fixture,
        "--json",
        "--output",
        outputPath,
        "--quiet",
      ]);
      const result = await runCli([
        "--cwd",
        fixture,
        "--json",
        "--baseline",
        outputPath,
        "--fail-on",
        "duplicates",
      ]);
      const report = JSON.parse(result.stdout) as { groups: unknown[] };

      expect(baseline.exitCode).toBe(0);
      expect(result.exitCode).toBe(0);
      expect(report.groups).toHaveLength(0);
      expect(result.stderr).toBe("");
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
