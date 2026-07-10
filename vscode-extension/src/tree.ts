import path from "node:path";

import * as vscode from "vscode";

import type {
  AuditReport,
  ClassOccurrence,
  DuplicateClassGroup,
  ReportDiagnostic,
  SimilarClassGroup,
} from "./report";

type TreeNodeKind = "section" | "group" | "similar" | "diagnostic" | "occurrence";

export class AuditTreeProvider implements vscode.TreeDataProvider<AuditTreeItem> {
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<
    AuditTreeItem | undefined | void
  >();

  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  private workspaceFolder: vscode.WorkspaceFolder | undefined;
  private roots: AuditTreeItem[] = [];

  setReport(report: AuditReport, workspaceFolder: vscode.WorkspaceFolder): void {
    this.workspaceFolder = workspaceFolder;
    this.roots = buildRoots(report, workspaceFolder);
    this.onDidChangeTreeDataEmitter.fire();
  }

  clear(): void {
    this.roots = [];
    this.onDidChangeTreeDataEmitter.fire();
  }

  getTreeItem(element: AuditTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: AuditTreeItem): AuditTreeItem[] {
    if (!this.workspaceFolder) {
      return [
        new AuditTreeItem(
          "Run Tailwind Pattern Audit",
          "section",
          vscode.TreeItemCollapsibleState.None,
          [],
          {
            command: "tailwindPatternAudit.run",
            title: "Run Tailwind Pattern Audit",
          },
        ),
      ];
    }

    return element ? element.children : this.roots;
  }
}

export class AuditTreeItem extends vscode.TreeItem {
  constructor(
    label: string,
    readonly kind: TreeNodeKind,
    collapsibleState: vscode.TreeItemCollapsibleState,
    readonly children: AuditTreeItem[] = [],
    command?: vscode.Command,
  ) {
    super(label, collapsibleState);
    this.contextValue = kind;
    this.command = command;
  }
}

function buildRoots(report: AuditReport, workspaceFolder: vscode.WorkspaceFolder): AuditTreeItem[] {
  return [
    new AuditTreeItem(
      `Duplicate groups (${report.groups.length})`,
      "section",
      vscode.TreeItemCollapsibleState.Expanded,
      report.groups.map((group) => buildDuplicateGroup(group, workspaceFolder)),
    ),
    new AuditTreeItem(
      `Similar groups (${report.similarGroups?.length ?? 0})`,
      "section",
      vscode.TreeItemCollapsibleState.Collapsed,
      (report.similarGroups ?? []).map((group) => buildSimilarGroup(group, workspaceFolder)),
    ),
    new AuditTreeItem(
      `Diagnostics (${report.diagnostics.length})`,
      "section",
      vscode.TreeItemCollapsibleState.Collapsed,
      report.diagnostics.map((diagnostic) => buildDiagnostic(diagnostic, workspaceFolder)),
    ),
  ];
}

function buildDuplicateGroup(
  group: DuplicateClassGroup,
  workspaceFolder: vscode.WorkspaceFolder,
): AuditTreeItem {
  const item = new AuditTreeItem(
    `${group.id}: ${group.occurrenceCount} occurrences`,
    "group",
    vscode.TreeItemCollapsibleState.Collapsed,
    group.occurrences.map((occurrence) => buildOccurrence(occurrence, workspaceFolder)),
  );
  item.description = `${group.recommendation.priority} ${group.recommendation.kind}`;
  item.tooltip = group.recommendation.reason;
  return item;
}

function buildSimilarGroup(
  group: SimilarClassGroup,
  workspaceFolder: vscode.WorkspaceFolder,
): AuditTreeItem {
  const item = new AuditTreeItem(
    `${group.id}: ${Math.round(group.similarity * 100)}% similar`,
    "similar",
    vscode.TreeItemCollapsibleState.Collapsed,
    group.candidates.flatMap((candidate) =>
      candidate.occurrences.map((occurrence) => buildOccurrence(occurrence, workspaceFolder)),
    ),
  );
  item.description = `${group.sharedTokens.length} shared classes`;
  item.tooltip = group.sharedTokens.join(" ");
  return item;
}

function buildDiagnostic(
  diagnostic: ReportDiagnostic,
  workspaceFolder: vscode.WorkspaceFolder,
): AuditTreeItem {
  const command =
    diagnostic.filePath && diagnostic.line
      ? openLocationCommand(
          workspaceFolder,
          diagnostic.filePath,
          diagnostic.line,
          diagnostic.column ?? 1,
        )
      : undefined;
  const item = new AuditTreeItem(
    diagnostic.message,
    "diagnostic",
    vscode.TreeItemCollapsibleState.None,
    [],
    command,
  );
  item.description = diagnostic.code;
  return item;
}

function buildOccurrence(
  occurrence: ClassOccurrence,
  workspaceFolder: vscode.WorkspaceFolder,
): AuditTreeItem {
  const item = new AuditTreeItem(
    `${occurrence.filePath}:${occurrence.line}:${occurrence.column}`,
    "occurrence",
    vscode.TreeItemCollapsibleState.None,
    [],
    openLocationCommand(workspaceFolder, occurrence.filePath, occurrence.line, occurrence.column),
  );
  item.description = occurrence.source.name;
  item.tooltip = occurrence.raw;
  return item;
}

function openLocationCommand(
  workspaceFolder: vscode.WorkspaceFolder,
  filePath: string,
  line: number,
  column: number,
): vscode.Command {
  return {
    command: "tailwindPatternAudit.openLocation",
    title: "Open Location",
    arguments: [
      vscode.Uri.file(path.resolve(workspaceFolder.uri.fsPath, filePath)),
      Math.max(line - 1, 0),
      Math.max(column - 1, 0),
    ],
  };
}
