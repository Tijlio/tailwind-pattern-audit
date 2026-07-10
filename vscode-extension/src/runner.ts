import { execFile } from "node:child_process";
import { promisify } from "node:util";

import * as vscode from "vscode";

import { parseAuditReport, type AuditReport } from "./report";

const execFileAsync = promisify(execFile);
const MAX_REPORT_BUFFER = 10 * 1024 * 1024;
const ANALYZER_PACKAGE = "tailwind-pattern-audit";

interface AnalyzerModule {
  analyzeProject(options: { cwd: string; similar: boolean }): Promise<unknown>;
  formatReport(report: unknown, format: "json"): string;
}

export async function runAudit(workspaceFolder: vscode.WorkspaceFolder): Promise<AuditReport> {
  const config = vscode.workspace.getConfiguration("tailwindPatternAudit", workspaceFolder.uri);
  const command = config.get("command", "").trim();
  const configuredArgs = config.get<string[]>("args", []);
  const includeSimilar = config.get("includeSimilar", true);

  if (!command) {
    return runBundledAudit(workspaceFolder, includeSimilar);
  }

  const args = [...configuredArgs, "--json"];

  if (includeSimilar) {
    args.push("--similar");
  }

  try {
    const { stdout } = await execFileAsync(command, args, {
      cwd: workspaceFolder.uri.fsPath,
      maxBuffer: MAX_REPORT_BUFFER,
      windowsHide: true,
    });

    return parseAuditReport(stdout);
  } catch (error) {
    throw new Error(formatRunError(command, args, error));
  }
}

async function runBundledAudit(
  workspaceFolder: vscode.WorkspaceFolder,
  includeSimilar: boolean,
): Promise<AuditReport> {
  try {
    const analyzer = await importAnalyzer();
    const report = await analyzer.analyzeProject({
      cwd: workspaceFolder.uri.fsPath,
      similar: includeSimilar,
    });

    return parseAuditReport(analyzer.formatReport(report, "json"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to run bundled Tailwind Pattern Audit.\n${message}`);
  }
}

async function importAnalyzer(): Promise<AnalyzerModule> {
  const imported = (await import(ANALYZER_PACKAGE)) as Partial<AnalyzerModule>;

  if (
    typeof imported.analyzeProject !== "function" ||
    typeof imported.formatReport !== "function"
  ) {
    throw new Error("Bundled tailwind-pattern-audit package did not expose the expected API.");
  }

  return {
    analyzeProject: imported.analyzeProject,
    formatReport: imported.formatReport,
  };
}

function formatRunError(command: string, args: string[], error: unknown): string {
  const details = isExecError(error)
    ? [error.message, error.stdout, error.stderr].filter(Boolean).join("\n")
    : String(error);

  return [`Failed to run: ${command} ${args.join(" ")}`, details].filter(Boolean).join("\n");
}

function isExecError(
  value: unknown,
): value is { message?: string; stdout?: string; stderr?: string } {
  return typeof value === "object" && value !== null;
}
