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
    .filter((group) => matchesRecommendationFilters(group, options))
    .sort(compareGroups)
    .map((group, index) => ({
      id: `twpa-${String(index + 1).padStart(3, "0")}`,
      ...group,
    }));
}

function matchesRecommendationFilters(
  group: Omit<DuplicateClassGroup, "id">,
  options: ResolvedAnalyzeOptions,
): boolean {
  const priorityMatches =
    options.priority.length === 0 || options.priority.includes(group.recommendation.priority);
  const kindMatches = options.kind.length === 0 || options.kind.includes(group.recommendation.kind);
  const layoutMatches = !options.hideLayoutOnly || !isLayoutOnlyGroup(group);

  return priorityMatches && kindMatches && layoutMatches;
}

function isLayoutOnlyGroup(group: Omit<DuplicateClassGroup, "id">): boolean {
  return group.classCount > 0 && group.normalized.split(" ").every(isLayoutToken);
}

function isLayoutToken(token: string): boolean {
  const baseToken = normalizeLayoutToken(token);

  return (
    LAYOUT_EXACT_TOKENS.has(baseToken) ||
    LAYOUT_TOKEN_PREFIXES.some((prefix) => baseToken.startsWith(prefix))
  );
}

const LAYOUT_EXACT_TOKENS = new Set([
  "absolute",
  "block",
  "collapse",
  "container",
  "contents",
  "fixed",
  "flex",
  "flex-1",
  "flex-auto",
  "flex-col",
  "flex-col-reverse",
  "flex-initial",
  "flex-none",
  "flex-nowrap",
  "flex-row",
  "flex-row-reverse",
  "flex-wrap",
  "flex-wrap-reverse",
  "flow-root",
  "grid",
  "grid-flow-col",
  "grid-flow-col-dense",
  "grid-flow-dense",
  "grid-flow-row",
  "grid-flow-row-dense",
  "grow",
  "grow-0",
  "hidden",
  "inline",
  "inline-block",
  "inline-flex",
  "inline-grid",
  "invisible",
  "isolate",
  "isolation-auto",
  "not-sr-only",
  "relative",
  "shrink",
  "shrink-0",
  "sr-only",
  "static",
  "sticky",
  "visible",
]);

const LAYOUT_TOKEN_PREFIXES = [
  "aspect-",
  "auto-cols-",
  "auto-rows-",
  "basis-",
  "bottom-",
  "clear-",
  "col-",
  "col-end-",
  "col-span-",
  "col-start-",
  "columns-",
  "content-",
  "float-",
  "gap-",
  "gap-x-",
  "gap-y-",
  "grid-cols-",
  "grid-rows-",
  "h-",
  "inset-",
  "inset-x-",
  "inset-y-",
  "items-",
  "justify-",
  "left-",
  "m-",
  "max-h-",
  "max-w-",
  "mb-",
  "me-",
  "min-h-",
  "min-w-",
  "ml-",
  "mr-",
  "ms-",
  "mt-",
  "mx-",
  "my-",
  "object-",
  "order-",
  "overflow-",
  "overflow-x-",
  "overflow-y-",
  "overscroll-",
  "overscroll-x-",
  "overscroll-y-",
  "p-",
  "pb-",
  "pe-",
  "place-",
  "place-content-",
  "place-items-",
  "place-self-",
  "pl-",
  "pr-",
  "ps-",
  "pt-",
  "px-",
  "py-",
  "right-",
  "row-",
  "row-end-",
  "row-span-",
  "row-start-",
  "self-",
  "size-",
  "space-x-",
  "space-y-",
  "top-",
  "w-",
  "z-",
];

function normalizeLayoutToken(token: string): string {
  let baseToken = stripVariantPrefix(token);

  if (baseToken.startsWith("!")) {
    baseToken = baseToken.slice(1);
  }

  if (baseToken.startsWith("-")) {
    baseToken = baseToken.slice(1);
  }

  return baseToken;
}

function stripVariantPrefix(token: string): string {
  let bracketDepth = 0;
  let lastVariantSeparator = -1;

  for (let index = 0; index < token.length; index += 1) {
    const character = token[index];

    if (character === "[") {
      bracketDepth += 1;
    } else if (character === "]") {
      bracketDepth = Math.max(0, bracketDepth - 1);
    } else if (character === ":" && bracketDepth === 0) {
      lastVariantSeparator = index;
    }
  }

  return lastVariantSeparator === -1 ? token : token.slice(lastVariantSeparator + 1);
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
