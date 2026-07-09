import type { AuditReport, DuplicateClassGroup } from "../types.js";

export function generateTerminal(report: AuditReport): string {
  const lines = [
    "Tailwind Pattern Audit",
    "",
    `Scanned files: ${report.scannedFiles}`,
    `Static class occurrences: ${report.occurrences}`,
    `Duplicate groups: ${report.groups.length}`,
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

function formatGroup(group: DuplicateClassGroup): string[] {
  const lines = [
    `${group.id}: ${group.occurrenceCount} occurrences, ${group.classCount} classes`,
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
