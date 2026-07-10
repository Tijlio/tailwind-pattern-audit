import path from "node:path";

import * as vscode from "vscode";

import type { AuditReport, ClassOccurrence, DuplicateClassGroup } from "./report";

interface DecoratedOccurrence {
  group: DuplicateClassGroup;
  occurrence: ClassOccurrence;
  range: vscode.Range;
}

export class AuditDecorations implements vscode.Disposable {
  private readonly decorationType = vscode.window.createTextEditorDecorationType({
    borderWidth: "0 0 1px 0",
    borderStyle: "solid",
    borderColor: new vscode.ThemeColor("editorWarning.foreground"),
    backgroundColor: new vscode.ThemeColor("editor.findMatchHighlightBackground"),
    overviewRulerColor: new vscode.ThemeColor("editorWarning.foreground"),
    overviewRulerLane: vscode.OverviewRulerLane.Right,
  });

  private report: AuditReport | undefined;
  private workspaceFolder: vscode.WorkspaceFolder | undefined;
  private readonly occurrenceByFile = new Map<string, DecoratedOccurrence[]>();

  setReport(report: AuditReport, workspaceFolder: vscode.WorkspaceFolder): void {
    this.report = report;
    this.workspaceFolder = workspaceFolder;
    this.occurrenceByFile.clear();

    for (const group of report.groups) {
      for (const occurrence of group.occurrences) {
        const uri = toUri(workspaceFolder, occurrence.filePath).toString();
        const occurrences = this.occurrenceByFile.get(uri) ?? [];
        occurrences.push({
          group,
          occurrence,
          range: toRange(occurrence),
        });
        this.occurrenceByFile.set(uri, occurrences);
      }
    }

    this.updateVisibleEditors();
  }

  clear(): void {
    this.report = undefined;
    this.workspaceFolder = undefined;
    this.occurrenceByFile.clear();
    this.updateVisibleEditors();
  }

  updateVisibleEditors(): void {
    for (const editor of vscode.window.visibleTextEditors) {
      this.updateEditor(editor);
    }
  }

  provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | undefined {
    const match = this.findOccurrence(document.uri, position);

    if (!match) {
      return undefined;
    }

    const markdown = new vscode.MarkdownString(undefined, true);
    markdown.isTrusted = true;
    markdown.appendMarkdown(
      `**${match.group.id}** · ${match.group.occurrenceCount} occurrences\n\n`,
    );
    markdown.appendMarkdown(
      `\`${match.group.recommendation.priority} ${match.group.recommendation.kind}\`\n\n`,
    );
    markdown.appendMarkdown(`${match.group.recommendation.reason}\n\n`);
    markdown.appendCodeblock(match.occurrence.raw, "html");

    return new vscode.Hover(markdown, match.range);
  }

  dispose(): void {
    this.decorationType.dispose();
  }

  private updateEditor(editor: vscode.TextEditor): void {
    const matches = this.occurrenceByFile.get(editor.document.uri.toString()) ?? [];
    editor.setDecorations(
      this.decorationType,
      matches.map((match) => ({
        range: match.range,
        hoverMessage: `${match.group.id}: ${match.group.occurrenceCount} repeated Tailwind occurrences`,
      })),
    );
  }

  private findOccurrence(
    uri: vscode.Uri,
    position: vscode.Position,
  ): DecoratedOccurrence | undefined {
    return this.occurrenceByFile
      .get(uri.toString())
      ?.find((match) => match.range.contains(position));
  }
}

function toRange(occurrence: ClassOccurrence): vscode.Range {
  const startLine = Math.max(occurrence.line - 1, 0);
  const startColumn = Math.max(occurrence.column - 1, 0);
  const length = Math.max(occurrence.raw.length, 1);
  return new vscode.Range(startLine, startColumn, startLine, startColumn + length);
}

function toUri(workspaceFolder: vscode.WorkspaceFolder, filePath: string): vscode.Uri {
  return vscode.Uri.file(path.resolve(workspaceFolder.uri.fsPath, filePath));
}
