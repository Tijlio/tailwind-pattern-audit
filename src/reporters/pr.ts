import type { AuditReport, DuplicateClassGroup, SimilarClassGroup } from "../types.js";

const PR_CANDIDATE_LIMIT = 10;
const PR_SIMILAR_LIMIT = 5;

export function generatePr(report: AuditReport): string {
  const lines = [
    "## Tailwind Pattern Audit",
    "",
    `- Duplicate groups: ${report.groups.length}`,
    `- Similar groups: ${report.similarGroups?.length ?? 0}`,
    `- Static class occurrences: ${report.occurrences}`,
    `- Scanned files: ${report.scannedFiles}`,
    `- Priority summary: ${summarizePriorities(report)}`,
    `- Kind summary: ${summarizeKinds(report)}`,
  ];

  if (report.diagnostics.length > 0) {
    const warningCount = report.diagnostics.filter(
      (diagnostic) => diagnostic.severity !== "info",
    ).length;
    lines.push(`- Diagnostics: ${report.diagnostics.length} (${warningCount} warnings/errors)`);
  }

  lines.push("");

  if (report.groups.length === 0) {
    lines.push("No duplicate Tailwind class patterns found.");
  } else {
    lines.push("### Top Candidates", "");
    lines.push("| ID | Priority | Kind | Occurrences | Classes | Pattern | Top files |");
    lines.push("| --- | --- | --- | ---: | ---: | --- | --- |");

    for (const group of report.groups.slice(0, PR_CANDIDATE_LIMIT)) {
      lines.push(formatCandidateRow(group));
    }

    if (report.groups.length > PR_CANDIDATE_LIMIT) {
      lines.push(
        "",
        `Showing 10 of ${report.groups.length} groups. Use markdown or JSON for full evidence.`,
      );
    }
  }

  if (report.similarGroups && report.similarGroups.length > 0) {
    lines.push("", "### Similar Candidates", "");
    lines.push("| ID | Similarity | Shared | Patterns |");
    lines.push("| --- | ---: | ---: | --- |");

    for (const group of report.similarGroups.slice(0, PR_SIMILAR_LIMIT)) {
      lines.push(formatSimilarRow(group));
    }

    if (report.similarGroups.length > PR_SIMILAR_LIMIT) {
      lines.push("", `Showing 5 of ${report.similarGroups.length} similar groups.`);
    }
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

function formatCandidateRow(group: DuplicateClassGroup): string {
  return `| ${[
    `\`${group.id}\``,
    group.recommendation.priority,
    group.recommendation.kind,
    String(group.occurrenceCount),
    String(group.classCount),
    formatInlineCodeForTable(group.rawValues[0]?.value ?? group.normalized),
    formatTopFiles(group),
  ].join(" | ")} |`;
}

function formatSimilarRow(group: SimilarClassGroup): string {
  const [first, second] = group.candidates;

  if (!first || !second) {
    return `| \`${group.id}\` | ${Math.round(group.similarity * 100)}% | ${group.sharedTokens.length} |  |`;
  }

  return `| ${[
    `\`${group.id}\``,
    `${Math.round(group.similarity * 100)}%`,
    String(group.sharedTokens.length),
    `${formatInlineCodeForTable(first.rawValues[0]?.value ?? first.normalized)}<br>${formatInlineCodeForTable(
      second.rawValues[0]?.value ?? second.normalized,
    )}`,
  ].join(" | ")} |`;
}

function formatTopFiles(group: DuplicateClassGroup): string {
  return group.recommendation.topFiles
    .map((topFile) => `${topFile.filePath} (${topFile.count})`)
    .map(escapeMarkdownTable)
    .join("<br>");
}

function escapeMarkdownTable(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function escapeInlineCode(value: string): string {
  return value.replaceAll("`", "\\`").replaceAll("\n", " ");
}

function formatInlineCodeForTable(value: string): string {
  return `\`${escapeMarkdownTable(escapeInlineCode(value))}\``;
}
