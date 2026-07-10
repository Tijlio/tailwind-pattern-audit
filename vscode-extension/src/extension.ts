import * as vscode from "vscode";

import { updateDiagnostics } from "./diagnostics";
import { runAudit } from "./runner";
import { AuditTreeProvider } from "./tree";

export function activate(context: vscode.ExtensionContext): void {
  const treeProvider = new AuditTreeProvider();
  const diagnostics = vscode.languages.createDiagnosticCollection("tailwind-pattern-audit");

  context.subscriptions.push(
    diagnostics,
    vscode.window.registerTreeDataProvider("tailwindPatternAudit.findings", treeProvider),
    vscode.commands.registerCommand("tailwindPatternAudit.run", () =>
      runAndRender(treeProvider, diagnostics),
    ),
    vscode.commands.registerCommand("tailwindPatternAudit.refresh", () =>
      runAndRender(treeProvider, diagnostics),
    ),
    vscode.commands.registerCommand(
      "tailwindPatternAudit.openLocation",
      (uri: vscode.Uri, line: number, column: number) => openLocation(uri, line, column),
    ),
  );
}

export function deactivate(): void {
  // VS Code disposes subscriptions registered through the extension context.
}

async function runAndRender(
  treeProvider: AuditTreeProvider,
  diagnostics: vscode.DiagnosticCollection,
): Promise<void> {
  const workspaceFolder = getWorkspaceFolder();

  if (!workspaceFolder) {
    vscode.window.showWarningMessage("Open a workspace before running Tailwind Pattern Audit.");
    return;
  }

  try {
    const report = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Window,
        title: "Running Tailwind Pattern Audit",
      },
      () => runAudit(workspaceFolder),
    );

    treeProvider.setReport(report, workspaceFolder);
    updateDiagnostics(diagnostics, report, workspaceFolder);
    vscode.window.showInformationMessage(
      `Tailwind Pattern Audit found ${report.groups.length} duplicate groups.`,
    );
  } catch (error) {
    treeProvider.clear();
    diagnostics.clear();
    vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error));
  }
}

function getWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
  const folders = vscode.workspace.workspaceFolders;

  if (!folders || folders.length === 0) {
    return undefined;
  }

  const activeDocument = vscode.window.activeTextEditor?.document.uri;

  if (activeDocument) {
    return vscode.workspace.getWorkspaceFolder(activeDocument) ?? folders[0];
  }

  return folders[0];
}

async function openLocation(uri: vscode.Uri, line: number, column: number): Promise<void> {
  const document = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(document);
  const position = new vscode.Position(line, column);
  editor.selection = new vscode.Selection(position, position);
  editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
}
