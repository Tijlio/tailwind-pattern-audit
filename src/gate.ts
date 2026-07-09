import type { AuditReport, GateResult, ResolvedAnalyzeOptions } from "./types.js";

export function evaluateCiGate(
  report: AuditReport,
  options: Pick<ResolvedAnalyzeOptions, "failOn" | "maxGroups" | "maxOccurrences">,
): GateResult {
  const reasons: string[] = [];
  const duplicateOccurrences = report.groups.reduce(
    (total, group) => total + group.occurrenceCount,
    0,
  );

  if (options.failOn.includes("duplicates") && report.groups.length > 0) {
    reasons.push(`Found ${report.groups.length} duplicate group(s).`);
  }

  if (options.failOn.includes("diagnostics") && report.diagnostics.length > 0) {
    reasons.push(`Found ${report.diagnostics.length} diagnostic(s).`);
  }

  if (
    options.failOn.includes("warnings") &&
    report.diagnostics.some((diagnostic) => diagnostic.severity === "warning")
  ) {
    reasons.push("Found warning diagnostics.");
  }

  if (
    options.failOn.includes("errors") &&
    report.diagnostics.some((diagnostic) => diagnostic.severity === "error")
  ) {
    reasons.push("Found error diagnostics.");
  }

  if (options.maxGroups !== undefined && report.groups.length > options.maxGroups) {
    reasons.push(
      `Found ${report.groups.length} duplicate group(s), exceeding maxGroups=${options.maxGroups}.`,
    );
  }

  if (options.maxOccurrences !== undefined && duplicateOccurrences > options.maxOccurrences) {
    reasons.push(
      `Found ${duplicateOccurrences} duplicate occurrence(s), exceeding maxOccurrences=${options.maxOccurrences}.`,
    );
  }

  return {
    failed: reasons.length > 0,
    reasons,
  };
}
