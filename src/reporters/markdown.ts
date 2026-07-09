import type { AuditReport, DuplicateClassGroup, SimilarClassGroup } from "../types.js";
import {
  escapeInlineCode,
  escapeMarkdownTable,
  formatInlineCodeForTable,
  formatTopFiles,
  getPrimaryPatternValue,
  summarizeKinds,
  summarizePriorities,
} from "./shared.js";

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

  appendDuplicateSections(lines, report);
  appendSimilarSections(lines, report);
  appendDiagnosticsSection(lines, report);

  return `${lines.join("\n").trimEnd()}\n`;
}

function appendDuplicateSections(lines: string[], report: AuditReport): void {
  if (report.groups.length === 0) {
    lines.push("No duplicate Tailwind class patterns found.", "");
    return;
  }

  lines.push(...formatTopCandidates(report), "", "## Duplicate Groups", "");

  for (const group of report.groups) {
    lines.push(...formatGroup(group), "");
  }
}

function appendSimilarSections(lines: string[], report: AuditReport): void {
  if (!report.similarGroups || report.similarGroups.length === 0) {
    return;
  }

  lines.push("## Similar Groups", "");

  for (const group of report.similarGroups) {
    lines.push(...formatSimilarGroup(group), "");
  }
}

function appendDiagnosticsSection(lines: string[], report: AuditReport): void {
  if (report.diagnostics.length === 0) {
    return;
  }

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
    formatInlineCodeForTable(getPrimaryPatternValue(group)),
  ].join(" | ")} |`;
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
    getPrimaryPatternValue(group),
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
    formatInlineCodeForTable(getPrimaryPatternValue(candidate)),
  ].join(" | ")} |`;
}
