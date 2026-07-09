import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type {
  AnalyzeProjectOptions,
  FailOnCondition,
  RecommendationKind,
  RecommendationPriority,
  ResolvedAnalyzeOptions,
} from "./types.js";

export const DEFAULT_INCLUDE = ["**/*.{js,jsx,ts,tsx,html,astro,vue,svelte}"];

export const DEFAULT_EXCLUDE = [
  "**/node_modules/**",
  "**/.next/**",
  "**/dist/**",
  "**/build/**",
  "**/coverage/**",
  "**/.turbo/**",
  "**/*.d.ts",
];

export const DEFAULT_FUNCTIONS = ["cn", "clsx", "classnames", "cva", "twMerge"];

const CONFIG_FILES = [
  "tailwind-pattern-audit.config.mjs",
  "tailwind-pattern-audit.config.cjs",
  "tailwind-pattern-audit.config.js",
  "tailwind-pattern-audit.config.json",
];

type ConfigShape = Omit<AnalyzeProjectOptions, "cwd" | "configFile">;

const CONFIG_KEYS = new Set([
  "include",
  "exclude",
  "minOccurrences",
  "minClasses",
  "functions",
  "priority",
  "kind",
  "hideLayoutOnly",
  "similar",
  "minSimilarity",
  "maxSimilarGroups",
  "failOn",
  "maxGroups",
  "maxOccurrences",
]);
const FAIL_ON_CONDITIONS = new Set<FailOnCondition>([
  "duplicates",
  "diagnostics",
  "warnings",
  "errors",
]);
const RECOMMENDATION_PRIORITIES = new Set<RecommendationPriority>(["high", "medium", "low"]);
const RECOMMENDATION_KINDS = new Set<RecommendationKind>(["component", "cva", "utility"]);

export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigValidationError";
  }
}

export async function resolveOptions(
  options: AnalyzeProjectOptions = {},
): Promise<ResolvedAnalyzeOptions> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const config = await loadConfig(cwd, options.configFile);
  const include = options.include ?? config.include ?? DEFAULT_INCLUDE;
  const exclude = options.exclude ?? config.exclude ?? DEFAULT_EXCLUDE;
  const minOccurrences = options.minOccurrences ?? config.minOccurrences ?? 2;
  const minClasses = options.minClasses ?? config.minClasses ?? 3;
  const functions = options.functions ?? config.functions ?? DEFAULT_FUNCTIONS;
  const priority = options.priority ?? config.priority ?? [];
  const kind = options.kind ?? config.kind ?? [];
  const hideLayoutOnly = options.hideLayoutOnly ?? config.hideLayoutOnly ?? false;
  const similar = options.similar ?? config.similar ?? false;
  const minSimilarity = options.minSimilarity ?? config.minSimilarity ?? 0.75;
  const maxSimilarGroups = options.maxSimilarGroups ?? config.maxSimilarGroups ?? 20;
  const failOn = options.failOn ?? config.failOn ?? [];
  const maxGroups = options.maxGroups ?? config.maxGroups;
  const maxOccurrences = options.maxOccurrences ?? config.maxOccurrences;

  return validateResolvedOptions({
    cwd,
    include,
    exclude,
    minOccurrences,
    minClasses,
    functions,
    priority,
    kind,
    hideLayoutOnly,
    similar,
    minSimilarity,
    maxSimilarGroups,
    configFile: options.configFile,
    failOn,
    maxGroups,
    maxOccurrences,
  });
}

async function loadConfig(
  cwd: string,
  configFile: AnalyzeProjectOptions["configFile"],
): Promise<ConfigShape> {
  if (configFile === false) {
    return {};
  }

  const explicitConfig = typeof configFile === "string" ? path.resolve(cwd, configFile) : undefined;
  const discoveredConfig =
    explicitConfig ?? CONFIG_FILES.map((file) => path.join(cwd, file)).find(existsSync);

  if (!discoveredConfig) {
    return {};
  }

  if (!existsSync(discoveredConfig)) {
    throw new ConfigValidationError(`Config file not found: ${discoveredConfig}`);
  }

  let config: unknown;

  if (discoveredConfig.endsWith(".json")) {
    try {
      config = JSON.parse(await readFile(discoveredConfig, "utf8")) as unknown;
    } catch (error) {
      throw new ConfigValidationError(
        `Unable to parse config file ${discoveredConfig}: ${formatError(error)}`,
      );
    }
  } else {
    try {
      const moduleUrl = pathToFileURL(discoveredConfig);
      moduleUrl.searchParams.set("t", String(Date.now()));
      const module = (await import(moduleUrl.href)) as { default?: unknown };
      config = module.default ?? module;
    } catch (error) {
      throw new ConfigValidationError(
        `Unable to load config file ${discoveredConfig}: ${formatError(error)}`,
      );
    }
  }

  return validateConfigShape(config, discoveredConfig);
}

function validateConfigShape(config: unknown, source: string): ConfigShape {
  if (!isPlainObject(config)) {
    throw new ConfigValidationError(`Config file ${source} must export an object.`);
  }

  for (const key of Object.keys(config)) {
    if (!CONFIG_KEYS.has(key)) {
      throw new ConfigValidationError(`Unsupported config option "${key}" in ${source}.`);
    }
  }

  const input = config as Record<string, unknown>;

  return {
    include: validateOptionalStringArray(input.include, "include", source),
    exclude: validateOptionalStringArray(input.exclude, "exclude", source),
    minOccurrences: validateOptionalPositiveInteger(input.minOccurrences, "minOccurrences", source),
    minClasses: validateOptionalPositiveInteger(input.minClasses, "minClasses", source),
    functions: validateOptionalStringArray(input.functions, "functions", source),
    priority: validateOptionalRecommendationPriority(input.priority, source),
    kind: validateOptionalRecommendationKind(input.kind, source),
    hideLayoutOnly: validateOptionalBoolean(input.hideLayoutOnly, "hideLayoutOnly", source),
    similar: validateOptionalBoolean(input.similar, "similar", source),
    minSimilarity: validateOptionalSimilarity(input.minSimilarity, "minSimilarity", source),
    maxSimilarGroups: validateOptionalNonNegativeInteger(
      input.maxSimilarGroups,
      "maxSimilarGroups",
      source,
    ),
    failOn: validateOptionalFailOn(input.failOn, source),
    maxGroups: validateOptionalNonNegativeInteger(input.maxGroups, "maxGroups", source),
    maxOccurrences: validateOptionalNonNegativeInteger(
      input.maxOccurrences,
      "maxOccurrences",
      source,
    ),
  };
}

function validateResolvedOptions(options: ResolvedAnalyzeOptions): ResolvedAnalyzeOptions {
  return {
    ...options,
    include: validateStringArray(options.include, "include", "options"),
    exclude: validateStringArray(options.exclude, "exclude", "options"),
    minOccurrences: validatePositiveInteger(options.minOccurrences, "minOccurrences", "options"),
    minClasses: validatePositiveInteger(options.minClasses, "minClasses", "options"),
    functions: validateStringArray(options.functions, "functions", "options"),
    priority: validateRecommendationPriority(options.priority, "options"),
    kind: validateRecommendationKind(options.kind, "options"),
    hideLayoutOnly: validateBoolean(options.hideLayoutOnly, "hideLayoutOnly", "options"),
    similar: validateBoolean(options.similar, "similar", "options"),
    minSimilarity: validateSimilarity(options.minSimilarity, "minSimilarity", "options"),
    maxSimilarGroups: validateNonNegativeInteger(
      options.maxSimilarGroups,
      "maxSimilarGroups",
      "options",
    ),
    failOn: validateFailOn(options.failOn, "options"),
    maxGroups: validateOptionalNonNegativeInteger(options.maxGroups, "maxGroups", "options"),
    maxOccurrences: validateOptionalNonNegativeInteger(
      options.maxOccurrences,
      "maxOccurrences",
      "options",
    ),
  };
}

function validateOptionalStringArray(
  value: unknown,
  name: string,
  source: string,
): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  return validateStringArray(value, name, source);
}

function validateStringArray(value: unknown, name: string, source: string): string[] {
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string" || item.length === 0)
  ) {
    throw new ConfigValidationError(`${source}: "${name}" must be an array of non-empty strings.`);
  }

  return value;
}

function validateOptionalPositiveInteger(
  value: unknown,
  name: string,
  source: string,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  return validatePositiveInteger(value, name, source);
}

function validatePositiveInteger(value: unknown, name: string, source: string): number {
  if (!Number.isInteger(value) || typeof value !== "number" || value < 1) {
    throw new ConfigValidationError(`${source}: "${name}" must be a positive integer.`);
  }

  return value;
}

function validateOptionalNonNegativeInteger(
  value: unknown,
  name: string,
  source: string,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isInteger(value) || typeof value !== "number" || value < 0) {
    throw new ConfigValidationError(`${source}: "${name}" must be a non-negative integer.`);
  }

  return value;
}

function validateNonNegativeInteger(value: unknown, name: string, source: string): number {
  if (!Number.isInteger(value) || typeof value !== "number" || value < 0) {
    throw new ConfigValidationError(`${source}: "${name}" must be a non-negative integer.`);
  }

  return value;
}

function validateOptionalFailOn(value: unknown, source: string): FailOnCondition[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  return validateFailOn(value, source);
}

function validateOptionalBoolean(
  value: unknown,
  name: string,
  source: string,
): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  return validateBoolean(value, name, source);
}

function validateOptionalSimilarity(
  value: unknown,
  name: string,
  source: string,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  return validateSimilarity(value, name, source);
}

function validateSimilarity(value: unknown, name: string, source: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > 1) {
    throw new ConfigValidationError(
      `${source}: "${name}" must be a number greater than 0 and up to 1.`,
    );
  }

  return value;
}

function validateBoolean(value: unknown, name: string, source: string): boolean {
  if (typeof value !== "boolean") {
    throw new ConfigValidationError(`${source}: "${name}" must be a boolean.`);
  }

  return value;
}

function validateOptionalRecommendationPriority(
  value: unknown,
  source: string,
): RecommendationPriority[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  return validateRecommendationPriority(value, source);
}

function validateRecommendationPriority(value: unknown, source: string): RecommendationPriority[] {
  if (
    !Array.isArray(value) ||
    value.some(
      (item) =>
        typeof item !== "string" || !RECOMMENDATION_PRIORITIES.has(item as RecommendationPriority),
    )
  ) {
    throw new ConfigValidationError(
      `${source}: "priority" must be an array containing high, medium, or low.`,
    );
  }

  return Array.from(new Set(value)) as RecommendationPriority[];
}

function validateOptionalRecommendationKind(
  value: unknown,
  source: string,
): RecommendationKind[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  return validateRecommendationKind(value, source);
}

function validateRecommendationKind(value: unknown, source: string): RecommendationKind[] {
  if (
    !Array.isArray(value) ||
    value.some(
      (item) => typeof item !== "string" || !RECOMMENDATION_KINDS.has(item as RecommendationKind),
    )
  ) {
    throw new ConfigValidationError(
      `${source}: "kind" must be an array containing component, cva, or utility.`,
    );
  }

  return Array.from(new Set(value)) as RecommendationKind[];
}

function validateFailOn(value: unknown, source: string): FailOnCondition[] {
  if (
    !Array.isArray(value) ||
    value.some(
      (item) => typeof item !== "string" || !FAIL_ON_CONDITIONS.has(item as FailOnCondition),
    )
  ) {
    throw new ConfigValidationError(
      `${source}: "failOn" must be an array containing duplicates, diagnostics, warnings, or errors.`,
    );
  }

  return Array.from(new Set(value)) as FailOnCondition[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
