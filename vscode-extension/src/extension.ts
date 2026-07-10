import * as vscode from "vscode";

import { AuditDecorations } from "./decorations";
import { updateDiagnostics } from "./diagnostics";
import type { AuditReport, DuplicateClassGroup, SimilarClassGroup } from "./report";
import { renderHtmlReport, runAudit } from "./runner";
import { AuditTreeProvider } from "./tree";
import { showGroupDetails, showHtmlReport, showSimilarDetails } from "./webview";

interface ExtensionState {
  report?: AuditReport;
  workspaceFolder?: vscode.WorkspaceFolder;
  ranAt?: Date;
}

export function activate(context: vscode.ExtensionContext): void {
  const treeProvider = new AuditTreeProvider();
  const diagnostics = vscode.languages.createDiagnosticCollection("tailwind-pattern-audit");
  const decorations = new AuditDecorations();
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 90);
  const state: ExtensionState = {};

  statusBar.command = "tailwindPatternAudit.openReport";
  statusBar.tooltip = "Open Tailwind Pattern Audit report";

  context.subscriptions.push(
    diagnostics,
    decorations,
    statusBar,
    vscode.window.registerTreeDataProvider("tailwindPatternAudit.findings", treeProvider),
    vscode.commands.registerCommand("tailwindPatternAudit.run", () =>
      runAndRender(treeProvider, diagnostics, decorations, statusBar, state),
    ),
    vscode.commands.registerCommand("tailwindPatternAudit.refresh", () =>
      runAndRender(treeProvider, diagnostics, decorations, statusBar, state),
    ),
    vscode.commands.registerCommand("tailwindPatternAudit.openReport", () =>
      openReport(context, state),
    ),
    vscode.commands.registerCommand(
      "tailwindPatternAudit.showGroupDetails",
      (group: DuplicateClassGroup) => showGroupDetails(context, group),
    ),
    vscode.commands.registerCommand(
      "tailwindPatternAudit.showSimilarDetails",
      (group: SimilarClassGroup) => showSimilarDetails(context, group),
    ),
    vscode.commands.registerCommand(
      "tailwindPatternAudit.openLocation",
      (uri: vscode.Uri, line: number, column: number) => openLocation(uri, line, column),
    ),
    vscode.languages.registerHoverProvider(
      { scheme: "file" },
      {
        provideHover: (document, position) => decorations.provideHover(document, position),
      },
    ),
    vscode.window.onDidChangeVisibleTextEditors(() => decorations.updateVisibleEditors()),
    vscode.window.onDidChangeActiveTextEditor(() => decorations.updateVisibleEditors()),
  );
}

export function deactivate(): void {
  // VS Code disposes subscriptions registered through the extension context.
}

async function runAndRender(
  treeProvider: AuditTreeProvider,
  diagnostics: vscode.DiagnosticCollection,
  decorations: AuditDecorations,
  statusBar: vscode.StatusBarItem,
  state: ExtensionState,
): Promise<void> {
  const workspaceFolder = getWorkspaceFolder();

  if (!workspaceFolder) {
    vscode.window.showWarningMessage("Open a workspace before running Tailwind Pattern Audit.");
    return;
  }

  try {
    treeProvider.setLoading();
    const report = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Window,
        title: "Running Tailwind Pattern Audit",
      },
      () => runAudit(workspaceFolder),
    );
    const ranAt = new Date();

    state.report = report;
    state.workspaceFolder = workspaceFolder;
    state.ranAt = ranAt;

    treeProvider.setReport(report, workspaceFolder, ranAt);
    updateDiagnostics(diagnostics, report, workspaceFolder);
    decorations.setReport(report, workspaceFolder);
    updateStatusBar(statusBar, report);
    vscode.window.showInformationMessage(
      `Tailwind Pattern Audit found ${report.groups.length} duplicate groups.`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    state.report = undefined;
    state.workspaceFolder = undefined;
    state.ranAt = undefined;
    treeProvider.setError(message);
    diagnostics.clear();
    decorations.clear();
    statusBar.hide();
    vscode.window.showErrorMessage(message);
  }
}

async function openReport(context: vscode.ExtensionContext, state: ExtensionState): Promise<void> {
  if (!state.report) {
    vscode.window.showWarningMessage("Run Tailwind Pattern Audit before opening the report.");
    return;
  }

  try {
    showHtmlReport(await renderHtmlReport(state.report), context);
  } catch (error) {
    vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error));
  }
}

function updateStatusBar(statusBar: vscode.StatusBarItem, report: AuditReport): void {
  const high = report.groups.filter((group) => group.recommendation.priority === "high").length;
  const components = report.groups.filter(
    (group) => group.recommendation.kind === "component",
  ).length;
  statusBar.text = `$(search) TW Audit: ${report.groups.length} groups · ${high} high · ${components} components`;
  statusBar.show();
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
