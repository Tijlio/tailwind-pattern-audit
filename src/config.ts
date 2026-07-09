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

export async function resolveOptions(
  options: AnalyzeProjectOptions = {},
): Promise<ResolvedAnalyzeOptions> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const config = await loadConfig(cwd, options.configFile);

  return {
    cwd,
    include: options.include ?? config.include ?? DEFAULT_INCLUDE,
    exclude: options.exclude ?? config.exclude ?? DEFAULT_EXCLUDE,
    minOccurrences: options.minOccurrences ?? config.minOccurrences ?? 2,
    minClasses: options.minClasses ?? config.minClasses ?? 3,
    functions: options.functions ?? config.functions ?? DEFAULT_FUNCTIONS,
    configFile: options.configFile,
  };
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

  if (discoveredConfig.endsWith(".json")) {
    return JSON.parse(await readFile(discoveredConfig, "utf8")) as ConfigShape;
  }

  const moduleUrl = pathToFileURL(discoveredConfig);
  moduleUrl.searchParams.set("t", String(Date.now()));
  const module = (await import(moduleUrl.href)) as { default?: ConfigShape } & ConfigShape;

  return module.default ?? module;
}
