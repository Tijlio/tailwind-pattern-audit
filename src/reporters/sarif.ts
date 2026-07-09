import type { AuditReport, ClassOccurrence, Diagnostic, DuplicateClassGroup } from "../types.js";
import { getPrimaryPatternValue } from "./shared.js";

interface SarifLog {
  version: "2.1.0";
  $schema: string;
  runs: SarifRun[];
}

interface SarifRun {
  tool: {
    driver: {
      name: string;
      semanticVersion: string;
      informationUri: string;
      rules: SarifRule[];
    };
  };
  results: SarifResult[];
}

interface SarifRule {
  id: string;
  name: string;
  shortDescription: {
    text: string;
  };
  helpUri?: string;
}

interface SarifResult {
  ruleId: string;
  level: "error" | "note" | "warning";
  message: {
    text: string;
  };
  locations?: SarifLocation[];
  relatedLocations?: SarifLocation[];
  properties?: Record<string, unknown>;
}

interface SarifLocation {
  physicalLocation: {
    artifactLocation: {
      uri: string;
    };
    region?: {
      startLine: number;
      startColumn?: number;
    };
  };
  message?: {
    text: string;
  };
}

const DUPLICATE_RULE_ID = "tailwind-pattern-audit/duplicate-pattern";

export function generateSarif(report: AuditReport): string {
  const log: SarifLog = {
    version: "2.1.0",
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    runs: [
      {
        tool: {
          driver: {
            name: "tailwind-pattern-audit",
            semanticVersion: report.toolVersion,
            informationUri: "https://github.com/Tijlio/tailwind-pattern-audit",
            rules: buildRules(report),
          },
        },
        results: [
          ...report.groups.flatMap(formatDuplicateResult),
          ...report.diagnostics.flatMap(formatDiagnosticResult),
        ],
      },
    ],
  };

  return `${JSON.stringify(log, null, 2)}\n`;
}

function buildRules(report: AuditReport): SarifRule[] {
  const diagnosticRules = new Map<string, SarifRule>();

  for (const diagnostic of report.diagnostics) {
    if (diagnostic.severity === "info") {
      continue;
    }

    const ruleId = getDiagnosticRuleId(diagnostic);
    diagnosticRules.set(ruleId, {
      id: ruleId,
      name: diagnostic.code,
      shortDescription: {
        text: diagnostic.message,
      },
    });
  }

  return [
    {
      id: DUPLICATE_RULE_ID,
      name: "Repeated Tailwind class pattern",
      shortDescription: {
        text: "A static Tailwind class pattern appears multiple times.",
      },
      helpUri: "https://github.com/Tijlio/tailwind-pattern-audit#readme",
    },
    ...diagnosticRules.values(),
  ];
}

function formatDuplicateResult(group: DuplicateClassGroup): SarifResult[] {
  const primaryOccurrence = group.occurrences[0];

  if (!primaryOccurrence) {
    return [];
  }

  return [
    {
      ruleId: DUPLICATE_RULE_ID,
      level: group.recommendation.priority === "low" ? "note" : "warning",
      message: {
        text: [
          `Repeated Tailwind class pattern appears ${group.occurrenceCount} times.`,
          `Recommendation: ${group.recommendation.priority} ${group.recommendation.kind}.`,
          `Pattern: ${getPrimaryPatternValue(group)}`,
        ].join(" "),
      },
      locations: [formatOccurrenceLocation(primaryOccurrence, "Primary duplicate occurrence.")],
      relatedLocations: group.occurrences
        .slice(1)
        .map((occurrence) => formatOccurrenceLocation(occurrence, "Related duplicate occurrence.")),
      properties: {
        groupId: group.id,
        classCount: group.classCount,
        occurrenceCount: group.occurrenceCount,
        recommendation: group.recommendation,
        normalized: group.normalized,
      },
    },
  ];
}

function formatDiagnosticResult(diagnostic: Diagnostic): SarifResult[] {
  if (diagnostic.severity === "info") {
    return [];
  }

  return [
    {
      ruleId: getDiagnosticRuleId(diagnostic),
      level: diagnostic.severity === "error" ? "error" : "warning",
      message: {
        text: diagnostic.message,
      },
      locations: diagnostic.filePath ? [formatDiagnosticLocation(diagnostic)] : undefined,
    },
  ];
}

function formatOccurrenceLocation(occurrence: ClassOccurrence, message: string): SarifLocation {
  return {
    physicalLocation: {
      artifactLocation: {
        uri: occurrence.filePath,
      },
      region: {
        startLine: occurrence.line,
        startColumn: occurrence.column,
      },
    },
    message: {
      text: message,
    },
  };
}

function formatDiagnosticLocation(diagnostic: Diagnostic): SarifLocation {
  return {
    physicalLocation: {
      artifactLocation: {
        uri: diagnostic.filePath ?? "",
      },
      region: diagnostic.line
        ? {
            startLine: diagnostic.line,
            startColumn: diagnostic.column,
          }
        : undefined,
    },
  };
}

function getDiagnosticRuleId(diagnostic: Diagnostic): string {
  return `tailwind-pattern-audit/${diagnostic.code}`;
}
