import type { AuditReport, DuplicateClassGroup } from "../types.js";

export function generateMarkdown(report: AuditReport): string {
  const lines = [
    "# Tailwind Pattern Audit",
    "",
    `- Tool version: ${report.toolVersion}`,
    `- Scanned files: ${report.scannedFiles}`,
    `- Static class occurrences: ${report.occurrences}`,
    `- Duplicate groups: ${report.groups.length}`,
    `- Duration: ${report.durationMs}ms`,
    "",
  ];

  if (report.groups.length === 0) {
    lines.push("No duplicate Tailwind class patterns found.", "");
  } else {
    for (const group of report.groups) {
      lines.push(...formatGroup(group), "");
    }
  }

  if (report.diagnostics.length > 0) {
    lines.push("## Diagnostics", "");
    lines.push("| Severity | Code | Location | Message |");
    lines.push("| --- | --- | --- | --- |");

    for (const diagnostic of report.diagnostics) {
      const location = diagnostic.filePath
        ? `${diagnostic.filePath}${diagnostic.line ? `:${diagnostic.line}:${diagnostic.column ?? 1}` : ""}`
        : "";
      lines.push(
        `| ${diagnostic.severity} | \`${diagnostic.code}\` | ${location} | ${escapeMarkdownTable(
          diagnostic.message,
        )} |`,
      );
    }

    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function formatGroup(group: DuplicateClassGroup): string[] {
  const lines = [
    `## ${group.id}`,
    "",
    `- Occurrences: ${group.occurrenceCount}`,
    `- Classes: ${group.classCount}`,
    "",
    "```text",
    group.rawValues[0]?.value ?? group.normalized,
    "```",
    "",
    "| File | Source | Raw variant |",
    "| --- | --- | --- |",
  ];

  for (const occurrence of group.occurrences) {
    lines.push(
      `| ${occurrence.filePath}:${occurrence.line}:${occurrence.column} | ${occurrence.source.name} | \`${escapeInlineCode(
        occurrence.raw,
      )}\` |`,
    );
  }

  return lines;
}

function escapeMarkdownTable(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function escapeInlineCode(value: string): string {
  return value.replaceAll("`", "\\`").replaceAll("\n", " ");
}
