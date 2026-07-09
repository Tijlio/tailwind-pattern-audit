import type { AuditReport, ClassOccurrence, Diagnostic, DuplicateClassGroup } from "../types.js";
import { getPrimaryPatternValue } from "./shared.js";

type SarifLevel = "error" | "note" | "warning";

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
  fullDescription?: {
    text: string;
  };
  defaultConfiguration?: {
    level: SarifLevel;
  };
  helpUri?: string;
  properties?: Record<string, unknown>;
}

interface SarifResult {
  ruleId: string;
  level: SarifLevel;
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

const DUPLICATE_RULE_IDS = {
  component: "tailwind-pattern-audit/duplicate-component-pattern",
  cva: "tailwind-pattern-audit/duplicate-cva-pattern",
  utility: "tailwind-pattern-audit/duplicate-utility-pattern",
} satisfies Record<DuplicateClassGroup["recommendation"]["kind"], string>;

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
    buildDuplicateRule("component", "Repeated component candidate", "warning"),
    buildDuplicateRule("cva", "Repeated CVA candidate", "warning"),
    buildDuplicateRule("utility", "Repeated utility candidate", "note"),
    ...diagnosticRules.values(),
  ];
}

function buildDuplicateRule(
  kind: DuplicateClassGroup["recommendation"]["kind"],
  name: string,
  level: SarifLevel,
): SarifRule {
  return {
    id: DUPLICATE_RULE_IDS[kind],
    name,
    shortDescription: {
      text: `A repeated Tailwind class pattern may be worth extracting as a ${kind}.`,
    },
    fullDescription: {
      text: "Tailwind Pattern Audit groups normalized static class strings and reports repeated patterns with extraction recommendations.",
    },
    defaultConfiguration: {
      level,
    },
    helpUri: "https://github.com/Tijlio/tailwind-pattern-audit#readme",
    properties: {
      tags: ["tailwind", "duplication", kind],
      precision: "high",
    },
  };
}

function formatDuplicateResult(group: DuplicateClassGroup): SarifResult[] {
  const primaryOccurrence = group.occurrences[0];

  if (!primaryOccurrence) {
    return [];
  }

  return [
    {
      ruleId: DUPLICATE_RULE_IDS[group.recommendation.kind],
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
        priority: group.recommendation.priority,
        kind: group.recommendation.kind,
        files: group.recommendation.topFiles.map((file) => file.filePath),
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
