import path from "node:path";

import * as vscode from "vscode";

import type { AuditReport, ClassOccurrence, DuplicateClassGroup, ReportDiagnostic } from "./report";

export function updateDiagnostics(
  collection: vscode.DiagnosticCollection,
  report: AuditReport,
  workspaceFolder: vscode.WorkspaceFolder,
): void {
  const byFile = new Map<string, vscode.Diagnostic[]>();

  for (const group of report.groups) {
    for (const occurrence of group.occurrences) {
      pushDiagnostic(
        byFile,
        workspaceFolder,
        occurrence.filePath,
        createDuplicateDiagnostic(group, occurrence),
      );
    }
  }

  for (const diagnostic of report.diagnostics) {
    if (!diagnostic.filePath) {
      continue;
    }

    pushDiagnostic(
      byFile,
      workspaceFolder,
      diagnostic.filePath,
      createReportDiagnostic(diagnostic),
    );
  }

  collection.clear();
  collection.set(
    [...byFile.entries()].map(([filePath, diagnostics]) => [
      toUri(workspaceFolder, filePath),
      diagnostics,
    ]),
  );
}

function createDuplicateDiagnostic(
  group: DuplicateClassGroup,
  occurrence: ClassOccurrence,
): vscode.Diagnostic {
  const diagnostic = new vscode.Diagnostic(
    toRange(occurrence.line, occurrence.column),
    `${group.id}: repeated Tailwind ${group.recommendation.kind} candidate appears ${group.occurrenceCount} times.`,
    group.recommendation.priority === "low"
      ? vscode.DiagnosticSeverity.Information
      : vscode.DiagnosticSeverity.Warning,
  );
  diagnostic.source = "tailwind-pattern-audit";
  diagnostic.code = group.id;
  return diagnostic;
}

function createReportDiagnostic(diagnostic: ReportDiagnostic): vscode.Diagnostic {
  const vscodeDiagnostic = new vscode.Diagnostic(
    toRange(diagnostic.line ?? 1, diagnostic.column ?? 1),
    diagnostic.message,
    toSeverity(diagnostic.severity),
  );
  vscodeDiagnostic.source = "tailwind-pattern-audit";
  vscodeDiagnostic.code = diagnostic.code;
  return vscodeDiagnostic;
}

function pushDiagnostic(
  byFile: Map<string, vscode.Diagnostic[]>,
  workspaceFolder: vscode.WorkspaceFolder,
  filePath: string,
  diagnostic: vscode.Diagnostic,
): void {
  const key = toUri(workspaceFolder, filePath).toString();
  const diagnostics = byFile.get(key) ?? [];
  diagnostics.push(diagnostic);
  byFile.set(key, diagnostics);
}

function toSeverity(severity: ReportDiagnostic["severity"]): vscode.DiagnosticSeverity {
  switch (severity) {
    case "error":
      return vscode.DiagnosticSeverity.Error;
    case "warning":
      return vscode.DiagnosticSeverity.Warning;
    case "info":
      return vscode.DiagnosticSeverity.Information;
  }
}

function toRange(line: number, column: number): vscode.Range {
  const startLine = Math.max(line - 1, 0);
  const startColumn = Math.max(column - 1, 0);
  return new vscode.Range(startLine, startColumn, startLine, startColumn + 1);
}

function toUri(workspaceFolder: vscode.WorkspaceFolder, filePath: string): vscode.Uri {
  return vscode.Uri.file(path.resolve(workspaceFolder.uri.fsPath, filePath));
}
