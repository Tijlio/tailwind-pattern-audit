import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const root = process.cwd();
const fixtureProject = path.join(root, "test/fixtures/next-shadcn");
const cliEntry = path.join(root, "dist/cli.js");

const outputDirectory = await mkdtemp(path.join(os.tmpdir(), "twpa-smoke-"));

try {
  const jsonReportPath = path.join(outputDirectory, "tailwind-audit.json");
  const htmlReportPath = path.join(outputDirectory, "tailwind-audit.html");
  const sarifReportPath = path.join(outputDirectory, "tailwind-audit.sarif.json");

  await runCli(["--cwd", fixtureProject, "--json", "--output", jsonReportPath]);
  await runCli(["--cwd", fixtureProject, "--html", "--similar", "--output", htmlReportPath]);
  await runCli(["--cwd", fixtureProject, "--sarif", "--output", sarifReportPath]);

  await assertNonEmptyFile(jsonReportPath);
  await assertNonEmptyFile(htmlReportPath);
  await assertNonEmptyFile(sarifReportPath);

  validateJsonReport(await readJson(jsonReportPath));
  validateHtmlReport(await readFile(htmlReportPath, "utf8"));
  validateSarifReport(await readJson(sarifReportPath));

  console.log(`Smoke reports generated in ${outputDirectory}`);
} finally {
  await rm(outputDirectory, { recursive: true, force: true });
}

async function runCli(args: string[]): Promise<void> {
  try {
    await execFileAsync(process.execPath, [cliEntry, ...args], {
      cwd: root,
      windowsHide: true,
    });
  } catch (error) {
    if (isExecError(error)) {
      throw new Error(
        [
          `Command failed: node ${path.relative(root, cliEntry)} ${args.join(" ")}`,
          error.stdout,
          error.stderr,
        ]
          .filter(Boolean)
          .join("\n"),
      );
    }

    throw error;
  }
}

async function assertNonEmptyFile(filePath: string): Promise<void> {
  const file = await stat(filePath);
  assert(file.size > 0, `${filePath} should not be empty`);
}

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, "utf8")) as unknown;
}

function validateJsonReport(value: unknown): void {
  assert(isRecord(value), "JSON report should be an object");
  assert(value.schemaVersion === 1, "JSON report should use schemaVersion 1");
  assert(typeof value.toolVersion === "string", "JSON report should include toolVersion");
  assert(typeof value.scannedFiles === "number", "JSON report should include scannedFiles");
  assert(Array.isArray(value.groups), "JSON report should include groups");
  assert(Array.isArray(value.diagnostics), "JSON report should include diagnostics");
}

function validateHtmlReport(value: string): void {
  assert(
    value.includes("<title>Tailwind Pattern Audit</title>"),
    "HTML report should include title",
  );
  assert(value.includes("Duplicate Groups"), "HTML report should include duplicate groups section");
}

function validateSarifReport(value: unknown): void {
  assert(isRecord(value), "SARIF report should be an object");
  assert(value.version === "2.1.0", "SARIF report should use version 2.1.0");
  assert(Array.isArray(value.runs), "SARIF report should include runs");
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isExecError(value: unknown): value is { stdout?: string; stderr?: string } {
  return isRecord(value);
}
