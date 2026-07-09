export type ReportFormat = "terminal" | "json" | "markdown";

export interface AnalyzeProjectOptions {
  cwd?: string;
  include?: string[];
  exclude?: string[];
  minOccurrences?: number;
  minClasses?: number;
  functions?: string[];
  configFile?: string | false;
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
  configFile: string | false | undefined;
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
  diagnostics: Diagnostic[];
  durationMs: number;
}
