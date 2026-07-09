import type { AuditReport, DuplicateClassGroup } from "../types.js";

interface PatternSummary {
  normalized: string;
  rawValues: Array<{ value: string; count: number }>;
}

export function summarizePriorities(report: AuditReport): string {
  return [
    `high ${countBy(report, "priority", "high")}`,
    `medium ${countBy(report, "priority", "medium")}`,
    `low ${countBy(report, "priority", "low")}`,
  ].join(", ");
}

export function summarizeKinds(report: AuditReport): string {
  return [
    `component ${countBy(report, "kind", "component")}`,
    `utility ${countBy(report, "kind", "utility")}`,
    `cva ${countBy(report, "kind", "cva")}`,
  ].join(", ");
}

export function formatTopFiles(group: DuplicateClassGroup): string {
  return group.recommendation.topFiles
    .map((topFile) => `${topFile.filePath} (${topFile.count})`)
    .map(escapeMarkdownTable)
    .join("<br>");
}

export function getPrimaryPatternValue(pattern: PatternSummary): string {
  return pattern.rawValues[0]?.value ?? pattern.normalized;
}

export function formatDiagnosticsSummary(report: AuditReport): string {
  const warningCount = report.diagnostics.filter(
    (diagnostic) => diagnostic.severity !== "info",
  ).length;

  return `${report.diagnostics.length} (${warningCount} warnings/errors)`;
}

export function escapeMarkdownTable(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

export function escapeInlineCode(value: string): string {
  return value.replaceAll("`", "\\`").replaceAll("\n", " ");
}

export function formatInlineCodeForTable(value: string): string {
  return `\`${escapeMarkdownTable(escapeInlineCode(value))}\``;
}

function countBy(
  report: AuditReport,
  property: "kind" | "priority",
  value: DuplicateClassGroup["recommendation"]["kind" | "priority"],
): number {
  return report.groups.filter((group) => group.recommendation[property] === value).length;
}
