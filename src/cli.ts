#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { Command } from "commander";

import { analyzeProject } from "./analyze.js";
import { formatReport } from "./reporters/index.js";
import type { ReportFormat } from "./types.js";
import { TOOL_VERSION } from "./version.js";

const program = new Command();

program
  .name("tailwind-pattern-audit")
  .description("Find repeated Tailwind class patterns in JavaScript and TypeScript projects.")
  .version(TOOL_VERSION)
  .option("--cwd <path>", "Project directory to scan.", process.cwd())
  .option("--include <glob...>", "Glob pattern(s) to include.")
  .option("--exclude <glob...>", "Glob pattern(s) to exclude.")
  .option("--min-occurrences <number>", "Minimum duplicate occurrences to report.", parseInteger)
  .option(
    "--min-classes <number>",
    "Minimum class count required for a class string.",
    parseInteger,
  )
  .option("--functions <name...>", "Helper function names to scan for static class arguments.")
  .option("--format <format>", "Output format: terminal, json, or markdown.", "terminal")
  .option("--json", "Shortcut for --format json.")
  .option("--markdown", "Shortcut for --format markdown.")
  .option("--output <path>", "Write report to a file instead of stdout.")
  .option("--config <path>", "Path to a config file.")
  .option("--no-config", "Disable config file discovery.")
  .option("--quiet", "Suppress stdout when --output is used.")
  .action(async (options: CliOptions) => {
    const format = resolveFormat(options);
    const report = await analyzeProject({
      cwd: options.cwd,
      include: options.include,
      exclude: options.exclude,
      minOccurrences: options.minOccurrences,
      minClasses: options.minClasses,
      functions: options.functions,
      configFile: resolveConfigFileOption(options),
    });
    const output = formatReport(report, format);

    if (options.output) {
      const outputPath = path.resolve(options.cwd ?? process.cwd(), options.output);
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, output);

      if (!options.quiet) {
        process.stdout.write(`Wrote ${format} report to ${outputPath}\n`);
      }

      return;
    }

    process.stdout.write(output);
  });

program.parseAsync().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});

interface CliOptions {
  cwd?: string;
  include?: string[];
  exclude?: string[];
  minOccurrences?: number;
  minClasses?: number;
  functions?: string[];
  format: string;
  json?: boolean;
  markdown?: boolean;
  output?: string;
  config?: string | boolean;
  quiet?: boolean;
}

function parseInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`Expected a positive integer, received "${value}".`);
  }

  return parsed;
}

function resolveFormat(options: CliOptions): ReportFormat {
  if (options.json) {
    return "json";
  }

  if (options.markdown) {
    return "markdown";
  }

  if (options.format === "terminal" || options.format === "json" || options.format === "markdown") {
    return options.format;
  }

  throw new Error(`Unsupported format "${options.format}". Expected terminal, json, or markdown.`);
}

function resolveConfigFileOption(options: CliOptions): string | false | undefined {
  if (options.config === false) {
    return false;
  }

  if (typeof options.config === "string") {
    return options.config;
  }

  return undefined;
}
