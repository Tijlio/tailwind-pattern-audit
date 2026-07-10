import path from "node:path";

import * as vscode from "vscode";

import type {
  AuditReport,
  ClassOccurrence,
  DuplicateClassGroup,
  ReportDiagnostic,
  SimilarClassGroup,
} from "./report";

type TreeNodeKind = "section" | "summary" | "group" | "similar" | "diagnostic" | "occurrence";

export class AuditTreeProvider implements vscode.TreeDataProvider<AuditTreeItem> {
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<
    AuditTreeItem | undefined | void
  >();

  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  private workspaceFolder: vscode.WorkspaceFolder | undefined;
  private roots: AuditTreeItem[] = [];

  setLoading(): void {
    this.roots = [
      new AuditTreeItem(
        "Running audit...",
        "summary",
        vscode.TreeItemCollapsibleState.None,
        [],
        undefined,
        "Scanning workspace",
      ),
    ];
    this.onDidChangeTreeDataEmitter.fire();
  }

  setReport(report: AuditReport, workspaceFolder: vscode.WorkspaceFolder, ranAt: Date): void {
    this.workspaceFolder = workspaceFolder;
    this.roots = buildRoots(report, workspaceFolder, ranAt);
    this.onDidChangeTreeDataEmitter.fire();
  }

  setError(message: string): void {
    this.roots = [
      new AuditTreeItem(
        "Audit failed",
        "summary",
        vscode.TreeItemCollapsibleState.None,
        [],
        undefined,
        message,
      ),
    ];
    this.onDidChangeTreeDataEmitter.fire();
  }

  clear(): void {
    this.workspaceFolder = undefined;
    this.roots = [];
    this.onDidChangeTreeDataEmitter.fire();
  }

  getTreeItem(element: AuditTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: AuditTreeItem): AuditTreeItem[] {
    if (!this.workspaceFolder && this.roots.length === 0) {
      return [
        new AuditTreeItem(
          "Run Tailwind Pattern Audit",
          "summary",
          vscode.TreeItemCollapsibleState.None,
          [],
          {
            command: "tailwindPatternAudit.run",
            title: "Run Tailwind Pattern Audit",
          },
          "No report loaded",
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
    description?: string,
  ) {
    super(label, collapsibleState);
    this.contextValue = kind;
    this.command = command;
    this.description = description;
  }
}

function buildRoots(
  report: AuditReport,
  workspaceFolder: vscode.WorkspaceFolder,
  ranAt: Date,
): AuditTreeItem[] {
  const highPriority = report.groups.filter((group) => group.recommendation.priority === "high");
  const components = report.groups.filter((group) => group.recommendation.kind === "component");
  const cva = report.groups.filter((group) => group.recommendation.kind === "cva");
  const utilities = report.groups.filter((group) => group.recommendation.kind === "utility");

  return [
    buildSummary(report, ranAt),
    buildGroupSection(
      "Review queue",
      highPriority,
      workspaceFolder,
      vscode.TreeItemCollapsibleState.Expanded,
    ),
    buildGroupSection(
      "Component candidates",
      components,
      workspaceFolder,
      vscode.TreeItemCollapsibleState.Collapsed,
    ),
    buildGroupSection(
      "CVA candidates",
      cva,
      workspaceFolder,
      vscode.TreeItemCollapsibleState.Collapsed,
    ),
    buildGroupSection(
      "Utility repeats",
      utilities,
      workspaceFolder,
      vscode.TreeItemCollapsibleState.Collapsed,
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

function buildSummary(report: AuditReport, ranAt: Date): AuditTreeItem {
  const high = report.groups.filter((group) => group.recommendation.priority === "high").length;
  const item = new AuditTreeItem(
    `${report.groups.length} groups · ${high} high · ${report.scannedFiles} files`,
    "summary",
    vscode.TreeItemCollapsibleState.None,
    [],
    {
      command: "tailwindPatternAudit.openReport",
      title: "Open HTML Report",
    },
    `Last run ${ranAt.toLocaleTimeString()}`,
  );
  item.tooltip = `${report.occurrences} occurrences · ${report.durationMs}ms`;
  return item;
}

function buildGroupSection(
  label: string,
  groups: DuplicateClassGroup[],
  workspaceFolder: vscode.WorkspaceFolder,
  collapsibleState: vscode.TreeItemCollapsibleState,
): AuditTreeItem {
  return new AuditTreeItem(
    `${label} (${groups.length})`,
    "section",
    collapsibleState,
    groups.map((group) => buildDuplicateGroup(group, workspaceFolder)),
  );
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
    {
      command: "tailwindPatternAudit.showGroupDetails",
      title: "Show Finding Details",
      arguments: [group],
    },
    `${group.recommendation.priority} ${group.recommendation.kind}`,
  );
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
    {
      command: "tailwindPatternAudit.showSimilarDetails",
      title: "Show Similar Finding Details",
      arguments: [group],
    },
    `${group.sharedTokens.length} shared classes`,
  );
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
  return new AuditTreeItem(
    diagnostic.message,
    "diagnostic",
    vscode.TreeItemCollapsibleState.None,
    [],
    command,
    diagnostic.code,
  );
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
    occurrence.source.name,
  );
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
