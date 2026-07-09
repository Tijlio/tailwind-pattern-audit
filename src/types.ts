export type ReportFormat = "terminal" | "json" | "markdown" | "pr";
export type FailOnCondition = "duplicates" | "diagnostics" | "warnings" | "errors";
export type RecommendationKind = "component" | "cva" | "utility";
export type RecommendationPriority = "high" | "medium" | "low";

export interface AnalyzeProjectOptions {
  cwd?: string;
  include?: string[];
  exclude?: string[];
  minOccurrences?: number;
  minClasses?: number;
  functions?: string[];
  priority?: RecommendationPriority[];
  kind?: RecommendationKind[];
  hideLayoutOnly?: boolean;
  similar?: boolean;
  minSimilarity?: number;
  maxSimilarGroups?: number;
  configFile?: string | false;
  failOn?: FailOnCondition[];
  maxGroups?: number;
  maxOccurrences?: number;
}

export interface AnalyzeOptions extends AnalyzeProjectOptions {
  scannedFiles?: number;
}

export interface ResolvedAnalyzeOptions {
  cwd: string;
  include: string[];
  exclude: string[];
  minOccurrences: number;
  minClasses: number;
  functions: string[];
  priority: RecommendationPriority[];
  kind: RecommendationKind[];
  hideLayoutOnly: boolean;
  similar: boolean;
  minSimilarity: number;
  maxSimilarGroups: number;
  configFile: string | false | undefined;
  failOn: FailOnCondition[];
  maxGroups?: number;
  maxOccurrences?: number;
}

export interface Extractor {
  id: string;
  extensions: string[];
  extract(input: ExtractInput): ExtractResult;
}

export interface ExtractInput {
  filePath: string;
  relativePath: string;
  source: string;
  options: ResolvedAnalyzeOptions;
}

export interface ExtractResult {
  occurrences: ClassOccurrence[];
  diagnostics: Diagnostic[];
}

export interface ClassOccurrence {
  filePath: string;
  line: number;
  column: number;
  raw: string;
  normalized: string;
  tokens: string[];
  source: ClassOccurrenceSource;
}

export interface ClassOccurrenceSource {
  extractor: string;
  kind: "jsxAttribute" | "helperCall";
  name: string;
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
  recommendation: DuplicateClassRecommendation;
  occurrences: ClassOccurrence[];
}

export interface DuplicateClassRecommendation {
  kind: RecommendationKind;
  priority: RecommendationPriority;
  reason: string;
  topFiles: Array<{
    filePath: string;
    count: number;
  }>;
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

export interface Diagnostic {
  severity: "info" | "warning" | "error";
  code: string;
  message: string;
  filePath?: string;
  line?: number;
  column?: number;
}

export interface AuditReport {
  schemaVersion: 1;
  toolVersion: string;
  cwd: string;
  scannedFiles: number;
  occurrences: number;
  groups: DuplicateClassGroup[];
  similarGroups?: SimilarClassGroup[];
  diagnostics: Diagnostic[];
  durationMs: number;
}

export interface GateResult {
  failed: boolean;
  reasons: string[];
}
