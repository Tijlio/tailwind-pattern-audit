import { execFile } from "node:child_process";
import { promisify } from "node:util";

import * as vscode from "vscode";

import { parseAuditReport, type AuditReport } from "./report";

const execFileAsync = promisify(execFile);
const MAX_REPORT_BUFFER = 10 * 1024 * 1024;

export async function runAudit(workspaceFolder: vscode.WorkspaceFolder): Promise<AuditReport> {
  const config = vscode.workspace.getConfiguration("tailwindPatternAudit", workspaceFolder.uri);
  const command = config.get("command", "npx");
  const configuredArgs = config.get<string[]>("args", ["--yes", "tailwind-pattern-audit@latest"]);
  const includeSimilar = config.get("includeSimilar", true);
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
