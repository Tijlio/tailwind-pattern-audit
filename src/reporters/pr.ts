import type { AuditReport, DuplicateClassGroup, SimilarClassGroup } from "../types.js";
import {
  formatDiagnosticsSummary,
  formatInlineCodeForTable,
  formatTopFiles,
  getPrimaryPatternValue,
  summarizeKinds,
  summarizePriorities,
} from "./shared.js";

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
    lines.push(`- Diagnostics: ${formatDiagnosticsSummary(report)}`);
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

function formatCandidateRow(group: DuplicateClassGroup): string {
  return `| ${[
    `\`${group.id}\``,
    group.recommendation.priority,
    group.recommendation.kind,
    String(group.occurrenceCount),
    String(group.classCount),
    formatInlineCodeForTable(getPrimaryPatternValue(group)),
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
    `${formatInlineCodeForTable(getPrimaryPatternValue(first))}<br>${formatInlineCodeForTable(
      getPrimaryPatternValue(second),
    )}`,
  ].join(" | ")} |`;
}
