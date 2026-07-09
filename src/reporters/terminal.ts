import type { AuditReport, DuplicateClassGroup, SimilarClassGroup } from "../types.js";
import {
  formatDiagnosticsSummary,
  getPrimaryPatternValue,
  summarizeKinds,
  summarizePriorities,
} from "./shared.js";

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
    lines.push("", `Diagnostics: ${formatDiagnosticsSummary(report)}`);
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function formatGroup(group: DuplicateClassGroup): string[] {
  const lines = [
    `${group.id}: ${group.occurrenceCount} occurrences, ${group.classCount} classes`,
    `  recommendation: ${group.recommendation.priority} ${group.recommendation.kind}`,
    `  ${getPrimaryPatternValue(group)}`,
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
    `  ${getPrimaryPatternValue(first)}`,
    `  ~ ${getPrimaryPatternValue(second)}`,
  ];
}
