import { readFile } from "node:fs/promises";
import path from "node:path";

import { resolveOptions } from "./config.js";
import { javascriptExtractor } from "./extractors/javascript.js";
import { scanFiles } from "./scanner.js";
import type {
  AnalyzeOptions,
  AnalyzeProjectOptions,
  AuditReport,
  ClassOccurrence,
  Diagnostic,
  DuplicateClassRecommendation,
  DuplicateClassGroup,
  Extractor,
  ResolvedAnalyzeOptions,
} from "./types.js";
import { TOOL_VERSION } from "./version.js";

const EXTRACTORS: Extractor[] = [javascriptExtractor];

export async function analyzeProject(options: AnalyzeProjectOptions = {}): Promise<AuditReport> {
  const resolvedOptions = await resolveOptions(options);

  return analyzeResolvedProject(resolvedOptions);
}

export async function analyzeResolvedProject(
  resolvedOptions: ResolvedAnalyzeOptions,
): Promise<AuditReport> {
  const startedAt = performance.now();
  const files = await scanFiles(resolvedOptions);
  const report = await analyzeFilesWithResolvedOptions(files, resolvedOptions, startedAt);

  return {
    ...report,
    scannedFiles: files.length,
  };
}

export async function analyzeFiles(
  files: string[],
  options: AnalyzeOptions = {},
): Promise<AuditReport> {
  const startedAt = performance.now();
  const resolvedOptions = await resolveOptions(options);

  return analyzeFilesWithResolvedOptions(files, resolvedOptions, startedAt, options.scannedFiles);
}

async function analyzeFilesWithResolvedOptions(
  files: string[],
  options: ResolvedAnalyzeOptions,
  startedAt: number,
  scannedFiles = files.length,
): Promise<AuditReport> {
  const occurrences: ClassOccurrence[] = [];
  const diagnostics: Diagnostic[] = [];

  for (const file of files) {
    const filePath = path.resolve(options.cwd, file);
    const relativePath = normalizePath(path.relative(options.cwd, filePath));
    const extractor = findExtractor(filePath);

    if (!extractor) {
      continue;
    }

    const source = await readFile(filePath, "utf8");
    const result = extractor.extract({
      filePath,
      relativePath,
      source,
      options,
    });

    occurrences.push(...result.occurrences);
    diagnostics.push(...result.diagnostics);
  }

  const groups = buildDuplicateGroups(occurrences, options);

  return {
    schemaVersion: 1,
    toolVersion: TOOL_VERSION,
    cwd: options.cwd,
    scannedFiles,
    occurrences: occurrences.length,
    groups,
    diagnostics,
    durationMs: Math.round(performance.now() - startedAt),
  };
}

function findExtractor(filePath: string): Extractor | undefined {
  const extension = path.extname(filePath);
  return EXTRACTORS.find((extractor) => extractor.extensions.includes(extension));
}

function buildDuplicateGroups(
  occurrences: ClassOccurrence[],
  options: ResolvedAnalyzeOptions,
): DuplicateClassGroup[] {
  const grouped = new Map<string, ClassOccurrence[]>();

  for (const occurrence of occurrences) {
    if (occurrence.tokens.length < options.minClasses) {
      continue;
    }

    const current = grouped.get(occurrence.normalized) ?? [];
    current.push(occurrence);
    grouped.set(occurrence.normalized, current);
  }

  return [...grouped.entries()]
    .filter(([, groupOccurrences]) => groupOccurrences.length >= options.minOccurrences)
    .map(([normalized, groupOccurrences]) => ({
      normalized,
      occurrences: groupOccurrences.sort(compareOccurrences),
      classCount: groupOccurrences[0]?.tokens.length ?? 0,
      occurrenceCount: groupOccurrences.length,
      rawValues: buildRawValues(groupOccurrences),
      recommendation: buildRecommendation(groupOccurrences),
    }))
    .sort(compareGroups)
    .map((group, index) => ({
      id: `twpa-${String(index + 1).padStart(3, "0")}`,
      ...group,
    }));
}

function buildRecommendation(occurrences: ClassOccurrence[]): DuplicateClassRecommendation {
  const files = new Map<string, number>();

  for (const occurrence of occurrences) {
    files.set(occurrence.filePath, (files.get(occurrence.filePath) ?? 0) + 1);
  }

  const topFiles = [...files.entries()]
    .map(([filePath, count]) => ({ filePath, count }))
    .sort((a, b) => b.count - a.count || a.filePath.localeCompare(b.filePath))
    .slice(0, 3);
  const classCount = occurrences[0]?.tokens.length ?? 0;
  const sourceNames = new Set(occurrences.map((occurrence) => occurrence.source.name));
  const fileCount = files.size;
  const hasCvaSource = [...sourceNames].some((sourceName) => sourceName.startsWith("cva:"));
  const priority = getRecommendationPriority(occurrences.length, classCount, fileCount);

  if (hasCvaSource) {
    return {
      kind: "cva",
      priority,
      reason: "Repeated CVA class candidates may belong in shared variant definitions.",
      topFiles,
    };
  }

  if (fileCount > 1 && classCount >= 4) {
    return {
      kind: "component",
      priority,
      reason: "Repeated class sets across files are good component extraction candidates.",
      topFiles,
    };
  }

  return {
    kind: "utility",
    priority,
    reason: "Repeated class sets in a narrow area may fit a local utility or constant.",
    topFiles,
  };
}

function getRecommendationPriority(
  occurrenceCount: number,
  classCount: number,
  fileCount: number,
): DuplicateClassRecommendation["priority"] {
  if (occurrenceCount >= 4 || (occurrenceCount >= 3 && classCount >= 6) || fileCount >= 3) {
    return "high";
  }

  if (occurrenceCount >= 3 || classCount >= 5 || fileCount >= 2) {
    return "medium";
  }

  return "low";
}

function buildRawValues(occurrences: ClassOccurrence[]): Array<{ value: string; count: number }> {
  const counts = new Map<string, number>();

  for (const occurrence of occurrences) {
    counts.set(occurrence.raw, (counts.get(occurrence.raw) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

function compareGroups(
  a: Omit<DuplicateClassGroup, "id">,
  b: Omit<DuplicateClassGroup, "id">,
): number {
  return (
    b.occurrenceCount - a.occurrenceCount ||
    b.classCount - a.classCount ||
    a.normalized.localeCompare(b.normalized)
  );
}

function compareOccurrences(a: ClassOccurrence, b: ClassOccurrence): number {
  return a.filePath.localeCompare(b.filePath) || a.line - b.line || a.column - b.column;
}

function normalizePath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}
