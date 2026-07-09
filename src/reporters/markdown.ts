import type { AuditReport, DuplicateClassGroup } from "../types.js";

export function generateMarkdown(report: AuditReport): string {
  const lines = [
    "# Tailwind Pattern Audit",
    "",
    `- Tool version: ${report.toolVersion}`,
    `- Scanned files: ${report.scannedFiles}`,
    `- Static class occurrences: ${report.occurrences}`,
    `- Duplicate groups: ${report.groups.length}`,
    `- Priority summary: ${summarizePriorities(report)}`,
    `- Kind summary: ${summarizeKinds(report)}`,
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

function summarizePriorities(report: AuditReport): string {
  return [
    `high ${countBy(report, "priority", "high")}`,
    `medium ${countBy(report, "priority", "medium")}`,
    `low ${countBy(report, "priority", "low")}`,
  ].join(", ");
}

function summarizeKinds(report: AuditReport): string {
  return [
    `component ${countBy(report, "kind", "component")}`,
    `utility ${countBy(report, "kind", "utility")}`,
    `cva ${countBy(report, "kind", "cva")}`,
  ].join(", ");
}

function countBy(
  report: AuditReport,
  property: "kind" | "priority",
  value: DuplicateClassGroup["recommendation"]["kind" | "priority"],
): number {
  return report.groups.filter((group) => group.recommendation[property] === value).length;
}

function formatGroup(group: DuplicateClassGroup): string[] {
  const lines = [
    `## ${group.id}`,
    "",
    `- Occurrences: ${group.occurrenceCount}`,
    `- Classes: ${group.classCount}`,
    `- Recommendation: ${group.recommendation.priority} ${group.recommendation.kind}`,
    `- Reason: ${group.recommendation.reason}`,
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

  if (group.recommendation.topFiles.length > 0) {
    lines.push("", "Top files:");

    for (const topFile of group.recommendation.topFiles) {
      lines.push(`- ${topFile.filePath} (${topFile.count})`);
    }
  }

  return lines;
}

function escapeMarkdownTable(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function escapeInlineCode(value: string): string {
  return value.replaceAll("`", "\\`").replaceAll("\n", " ");
}
