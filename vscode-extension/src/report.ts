export interface AuditReport {
  schemaVersion: 1;
  toolVersion: string;
  cwd: string;
  scannedFiles: number;
  occurrences: number;
  groups: DuplicateClassGroup[];
  similarGroups?: SimilarClassGroup[];
  diagnostics: ReportDiagnostic[];
  durationMs: number;
}

export interface DuplicateClassGroup {
  id: string;
  normalized: string;
  classCount: number;
  occurrenceCount: number;
  rawValues: Array<{
    value: string;
    count: number;
  }>;
  recommendation: {
    kind: "component" | "cva" | "utility";
    priority: "high" | "medium" | "low";
    reason: string;
    topFiles: Array<{
      filePath: string;
      count: number;
    }>;
  };
  occurrences: ClassOccurrence[];
}

export interface SimilarClassGroup {
  id: string;
  similarity: number;
  sharedTokens: string[];
  candidates: SimilarClassCandidate[];
}

export interface SimilarClassCandidate {
  normalized: string;
  classCount: number;
  occurrenceCount: number;
  rawValues: Array<{
    value: string;
    count: number;
  }>;
  occurrences: ClassOccurrence[];
}

export interface ClassOccurrence {
  filePath: string;
  line: number;
  column: number;
  raw: string;
  normalized: string;
  tokens: string[];
  source: {
    extractor: string;
    kind: "jsxAttribute" | "helperCall" | "htmlAttribute";
    name: string;
  };
}

export interface ReportDiagnostic {
  severity: "info" | "warning" | "error";
  code: string;
  message: string;
  filePath?: string;
  line?: number;
  column?: number;
}

export function parseAuditReport(raw: string): AuditReport {
  const parsed = JSON.parse(raw) as unknown;

  if (!isRecord(parsed) || parsed.schemaVersion !== 1 || !Array.isArray(parsed.groups)) {
    throw new Error("Tailwind Pattern Audit returned an unsupported JSON report.");
  }

  return parsed as unknown as AuditReport;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
