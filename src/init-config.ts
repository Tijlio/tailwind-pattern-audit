import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { DEFAULT_EXCLUDE, DEFAULT_FUNCTIONS } from "./config.js";
import type { AnalyzeProjectOptions } from "./types.js";

const DEFAULT_INIT_CONFIG_FILE = "tailwind-pattern-audit.config.json";

export interface InitConfigOptions {
  cwd?: string;
  force?: boolean;
}

export interface InitConfigResult {
  filePath: string;
}

class ConfigInitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigInitError";
  }
}

const DEFAULT_INIT_CONFIG = {
  include: [
    "src/**/*.{js,jsx,ts,tsx,html,astro,vue,svelte}",
    "app/**/*.{js,jsx,ts,tsx,html,astro,vue,svelte}",
    "pages/**/*.{js,jsx,ts,tsx,html,astro,vue,svelte}",
    "components/**/*.{js,jsx,ts,tsx,html,astro,vue,svelte}",
  ],
  exclude: [...DEFAULT_EXCLUDE, "**/.vercel/**", "**/storybook-static/**"],
  minOccurrences: 2,
  minClasses: 4,
  priority: ["high", "medium"],
  hideLayoutOnly: true,
  functions: DEFAULT_FUNCTIONS,
} satisfies AnalyzeProjectOptions;

export async function initConfig(options: InitConfigOptions = {}): Promise<InitConfigResult> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const filePath = path.join(cwd, DEFAULT_INIT_CONFIG_FILE);

  await mkdir(cwd, { recursive: true });

  try {
    await writeFile(filePath, `${JSON.stringify(DEFAULT_INIT_CONFIG, null, 2)}\n`, {
      flag: options.force ? "w" : "wx",
    });
  } catch (error) {
    if (isFileExistsError(error)) {
      throw new ConfigInitError(
        `${DEFAULT_INIT_CONFIG_FILE} already exists. Use --force to overwrite it.`,
      );
    }

    throw error;
  }

  return { filePath };
}

function isFileExistsError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "EEXIST";
}
