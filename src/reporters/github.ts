import type { AuditReport, Diagnostic, DuplicateClassGroup } from "../types.js";
import { getPrimaryPatternValue } from "./shared.js";

const DEFAULT_ANNOTATION_LIMIT = 50;

export function generateGithubAnnotations(
  report: AuditReport,
  annotationLimit = DEFAULT_ANNOTATION_LIMIT,
): string {
  const limit = Math.max(0, Math.floor(annotationLimit));
  const lines = [
    ...report.groups.slice(0, limit).flatMap(formatDuplicateAnnotation),
    ...report.diagnostics.flatMap(formatDiagnosticAnnotation),
  ];

  if (report.groups.length > limit) {
    lines.push(
      formatWorkflowCommand(
        "notice",
        { title: "Tailwind Pattern Audit" },
        `Showing ${limit} of ${report.groups.length} duplicate group annotations.`,
      ),
    );
  }

  return lines.length > 0 ? `${lines.join("\n")}\n` : "";
}

function formatDuplicateAnnotation(group: DuplicateClassGroup): string[] {
  const occurrence = group.occurrences[0];

  if (!occurrence) {
    return [];
  }

  return [
    formatWorkflowCommand(
      "warning",
      {
        file: occurrence.filePath,
        line: occurrence.line,
        col: occurrence.column,
        title: `Tailwind Pattern Audit ${group.id}`,
      },
      [
        `Repeated Tailwind class pattern appears ${group.occurrenceCount} times.`,
        `Recommendation: ${group.recommendation.priority} ${group.recommendation.kind}.`,
        `Pattern: ${truncate(getPrimaryPatternValue(group), 240)}`,
      ].join(" "),
    ),
  ];
}

function formatDiagnosticAnnotation(diagnostic: Diagnostic): string[] {
  if (diagnostic.severity === "info") {
    return [];
  }

  return [
    formatWorkflowCommand(
      diagnostic.severity === "error" ? "error" : "warning",
      {
        file: diagnostic.filePath,
        line: diagnostic.line,
        col: diagnostic.column,
        title: `Tailwind Pattern Audit ${diagnostic.code}`,
      },
      diagnostic.message,
    ),
  ];
}

function formatWorkflowCommand(
  command: "error" | "notice" | "warning",
  properties: Record<string, number | string | undefined>,
  message: string,
): string {
  const propertyString = Object.entries(properties)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([name, value]) => `${name}=${escapeProperty(String(value))}`)
    .join(",");

  return `::${command}${propertyString ? ` ${propertyString}` : ""}::${escapeData(message)}`;
}

function escapeProperty(value: string): string {
  return escapeData(value).replaceAll(":", "%3A").replaceAll(",", "%2C");
}

function escapeData(value: string): string {
  return value.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
}

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}...`;
}
