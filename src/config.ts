import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { AnalyzeProjectOptions, ResolvedAnalyzeOptions } from "./types.js";

export const DEFAULT_INCLUDE = ["**/*.{js,jsx,ts,tsx}"];

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

const CONFIG_KEYS = new Set(["include", "exclude", "minOccurrences", "minClasses", "functions"]);

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

  return validateResolvedOptions({
    cwd,
    include,
    exclude,
    minOccurrences,
    minClasses,
    functions,
    configFile: options.configFile,
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
