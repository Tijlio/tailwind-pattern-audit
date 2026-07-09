import type { AuditReport, DuplicateClassGroup } from "../types.js";

export function generateTerminal(report: AuditReport): string {
  const lines = [
    "Tailwind Pattern Audit",
    "",
    `Scanned files: ${report.scannedFiles}`,
    `Static class occurrences: ${report.occurrences}`,
    `Duplicate groups: ${report.groups.length}`,
    `By priority: ${summarizePriorities(report)}`,
    `By kind: ${summarizeKinds(report)}`,
    `Duration: ${report.durationMs}ms`,
    "",
  ];

  if (report.groups.length === 0) {
    lines.push("No duplicate Tailwind class patterns found.");
  } else {
    for (const group of report.groups.slice(0, 20)) {
      lines.push(...formatGroup(group), "");
    }

    if (report.groups.length > 20) {
      lines.push(
        `Showing 20 of ${report.groups.length} groups. Use --json or --markdown for full output.`,
      );
    }
  }

  if (report.diagnostics.length > 0) {
    const warningCount = report.diagnostics.filter(
      (diagnostic) => diagnostic.severity !== "info",
    ).length;
    lines.push("", `Diagnostics: ${report.diagnostics.length} (${warningCount} warnings/errors)`);
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
    `${group.id}: ${group.occurrenceCount} occurrences, ${group.classCount} classes`,
    `  recommendation: ${group.recommendation.priority} ${group.recommendation.kind}`,
    `  ${group.rawValues[0]?.value ?? group.normalized}`,
  ];

  for (const occurrence of group.occurrences.slice(0, 5)) {
    lines.push(
      `  - ${occurrence.filePath}:${occurrence.line}:${occurrence.column} (${occurrence.source.name})`,
    );
  }

  if (group.occurrences.length > 5) {
    lines.push(`  - ...and ${group.occurrences.length - 5} more`);
  }

  return lines;
}
