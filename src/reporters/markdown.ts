import type { AuditReport, DuplicateClassGroup, SimilarClassGroup } from "../types.js";

const TOP_CANDIDATE_LIMIT = 5;

export function generateMarkdown(report: AuditReport): string {
  const lines = [
    "# Tailwind Pattern Audit",
    "",
    `- Tool version: ${report.toolVersion}`,
    `- Scanned files: ${report.scannedFiles}`,
    `- Static class occurrences: ${report.occurrences}`,
    `- Duplicate groups: ${report.groups.length}`,
    `- Similar groups: ${report.similarGroups?.length ?? 0}`,
    `- Priority summary: ${summarizePriorities(report)}`,
    `- Kind summary: ${summarizeKinds(report)}`,
    `- Duration: ${report.durationMs}ms`,
    "",
  ];

  if (report.groups.length === 0) {
    lines.push("No duplicate Tailwind class patterns found.", "");
  } else {
    lines.push(...formatTopCandidates(report), "", "## Duplicate Groups", "");

    for (const group of report.groups) {
      lines.push(...formatGroup(group), "");
    }
  }

  if (report.similarGroups && report.similarGroups.length > 0) {
    lines.push("## Similar Groups", "");

    for (const group of report.similarGroups) {
      lines.push(...formatSimilarGroup(group), "");
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

function formatTopCandidates(report: AuditReport): string[] {
  const lines = ["## Top Candidates", ""];
  const sections = [
    ["Component Candidates", "component"],
    ["CVA Candidates", "cva"],
    ["Utility Candidates", "utility"],
  ] as const;

  for (const [title, kind] of sections) {
    const groups = report.groups
      .filter((group) => group.recommendation.kind === kind)
      .slice(0, TOP_CANDIDATE_LIMIT);

    if (groups.length === 0) {
      continue;
    }

    lines.push(`### ${title}`, "");
    lines.push("| ID | Priority | Occurrences | Classes | Top files | Pattern |");
    lines.push("| --- | --- | ---: | ---: | --- | --- |");

    for (const group of groups) {
      lines.push(formatTopCandidateRow(group));
    }

    lines.push("");
  }

  return lines;
}

function formatTopCandidateRow(group: DuplicateClassGroup): string {
  return `| ${[
    `[\`${group.id}\`](#${group.id})`,
    group.recommendation.priority,
    String(group.occurrenceCount),
    String(group.classCount),
    formatTopFiles(group),
    formatInlineCodeForTable(group.rawValues[0]?.value ?? group.normalized),
  ].join(" | ")} |`;
}

function formatTopFiles(group: DuplicateClassGroup): string {
  return group.recommendation.topFiles
    .map((topFile) => `${topFile.filePath} (${topFile.count})`)
    .map(escapeMarkdownTable)
    .join("<br>");
}

function formatGroup(group: DuplicateClassGroup): string[] {
  const lines = [
    `### ${group.id}`,
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

function formatSimilarGroup(group: SimilarClassGroup): string[] {
  const [first, second] = group.candidates;

  if (!first || !second) {
    return [];
  }

  return [
    `### ${group.id}`,
    "",
    `- Similarity: ${Math.round(group.similarity * 100)}%`,
    `- Shared classes: ${group.sharedTokens.length}`,
    "",
    "| Candidate | Occurrences | Classes | Pattern |",
    "| --- | ---: | ---: | --- |",
    formatSimilarCandidateRow(first),
    formatSimilarCandidateRow(second),
    "",
    "Shared tokens:",
    "",
    "```text",
    group.sharedTokens.join(" "),
    "```",
  ];
}

function formatSimilarCandidateRow(candidate: SimilarClassGroup["candidates"][number]): string {
  return `| ${[
    candidate.occurrences[0]?.filePath ?? "",
    String(candidate.occurrenceCount),
    String(candidate.classCount),
    formatInlineCodeForTable(candidate.rawValues[0]?.value ?? candidate.normalized),
  ].join(" | ")} |`;
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
