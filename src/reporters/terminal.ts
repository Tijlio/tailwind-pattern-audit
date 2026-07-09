import type { AuditReport, DuplicateClassGroup, SimilarClassGroup } from "../types.js";

export function generateTerminal(report: AuditReport): string {
  const lines = [
    "Tailwind Pattern Audit",
    "",
    `Scanned files: ${report.scannedFiles}`,
    `Static class occurrences: ${report.occurrences}`,
    `Duplicate groups: ${report.groups.length}`,
    `Similar groups: ${report.similarGroups?.length ?? 0}`,
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

  if (report.similarGroups && report.similarGroups.length > 0) {
    lines.push("", "Similar class sets:", "");

    for (const group of report.similarGroups.slice(0, 10)) {
      lines.push(...formatSimilarGroup(group), "");
    }

    if (report.similarGroups.length > 10) {
      lines.push(`Showing 10 of ${report.similarGroups.length} similar groups.`);
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

function formatSimilarGroup(group: SimilarClassGroup): string[] {
  const [first, second] = group.candidates;

  if (!first || !second) {
    return [];
  }

  return [
    `${group.id}: ${Math.round(group.similarity * 100)}% similar, ${group.sharedTokens.length} shared classes`,
    `  ${first.rawValues[0]?.value ?? first.normalized}`,
    `  ~ ${second.rawValues[0]?.value ?? second.normalized}`,
  ];
}
