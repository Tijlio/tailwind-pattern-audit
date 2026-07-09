#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { Command } from "commander";

import { analyzeResolvedProject } from "./analyze.js";
import { resolveOptions } from "./config.js";
import { evaluateCiGate } from "./gate.js";
import { initConfig } from "./init-config.js";
import { formatReport } from "./reporters/index.js";
import type {
  FailOnCondition,
  RecommendationKind,
  RecommendationPriority,
  ReportFormat,
} from "./types.js";
import { TOOL_VERSION } from "./version.js";

const program = new Command();

program
  .command("init")
  .description("Create a Tailwind Pattern Audit config file.")
  .option("--cwd <path>", "Project directory for the config file.")
  .option("--force", "Overwrite an existing config file.")
  .action(async (options: InitCliOptions) => {
    const rootOptions = program.opts<CliOptions>();
    const result = await initConfig({
      cwd: options.cwd ?? rootOptions.cwd,
      force: options.force,
    });

    process.stdout.write(`Created ${result.filePath}\n`);
  });

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
  .option("--priority <priority...>", "Only include recommendation priorities: high, medium, low.")
  .option("--kind <kind...>", "Only include recommendation kinds: component, utility, cva.")
  .option("--hide-layout-only", "Hide groups made only of layout primitives.")
  .option("--similar", "Detect near-duplicate class sets.")
  .option(
    "--min-similarity <number>",
    "Minimum Jaccard similarity for near-duplicate groups.",
    parseSimilarity,
  )
  .option(
    "--max-similar-groups <number>",
    "Maximum near-duplicate groups to report.",
    parseNonNegativeInteger,
  )
  .option("--baseline <path>", "Ignore duplicate groups present in a previous JSON report.")
  .option("--format <format>", "Output format: terminal, json, markdown, or pr.", "terminal")
  .option("--json", "Shortcut for --format json.")
  .option("--markdown", "Shortcut for --format markdown.")
  .option("--pr", "Shortcut for --format pr.")
  .option("--output <path>", "Write report to a file instead of stdout.")
  .option("--config <path>", "Path to a config file.")
  .option("--no-config", "Disable config file discovery.")
  .option(
    "--fail-on <condition...>",
    "Set CI failure condition(s): duplicates, diagnostics, warnings, errors.",
  )
  .option(
    "--max-groups <number>",
    "Fail when duplicate group count exceeds this number.",
    parseNonNegativeInteger,
  )
  .option(
    "--max-occurrences <number>",
    "Fail when reported duplicate occurrence count exceeds this number.",
    parseNonNegativeInteger,
  )
  .option("--quiet", "Suppress stdout when --output is used.")
  .action(async (options: CliOptions) => {
    const format = resolveFormat(options);
    const analyzeOptions = {
      cwd: options.cwd,
      include: options.include,
      exclude: options.exclude,
      minOccurrences: options.minOccurrences,
      minClasses: options.minClasses,
      functions: options.functions,
      priority: options.priority,
      kind: options.kind,
      hideLayoutOnly: options.hideLayoutOnly,
      similar: options.similar,
      minSimilarity: options.minSimilarity,
      maxSimilarGroups: options.maxSimilarGroups,
      baseline: options.baseline,
      configFile: resolveConfigFileOption(options),
      failOn: options.failOn,
      maxGroups: options.maxGroups,
      maxOccurrences: options.maxOccurrences,
    };
    const resolvedOptions = await resolveOptions(analyzeOptions);
    const report = await analyzeResolvedProject(resolvedOptions);
    const output = formatReport(report, format);
    const gate = evaluateCiGate(report, resolvedOptions);

    if (options.output) {
      const outputPath = path.resolve(options.cwd ?? process.cwd(), options.output);
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, output);

      if (!options.quiet) {
        process.stdout.write(`Wrote ${format} report to ${outputPath}\n`);
      }

      if (gate.failed) {
        writeGateFailure(gate.reasons);
        process.exitCode = 1;
      }

      return;
    }

    process.stdout.write(output);

    if (gate.failed) {
      writeGateFailure(gate.reasons);
      process.exitCode = 1;
    }
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
  priority?: RecommendationPriority[];
  kind?: RecommendationKind[];
  hideLayoutOnly?: boolean;
  similar?: boolean;
  minSimilarity?: number;
  maxSimilarGroups?: number;
  baseline?: string;
  format: string;
  json?: boolean;
  markdown?: boolean;
  pr?: boolean;
  output?: string;
  config?: string | boolean;
  failOn?: FailOnCondition[];
  maxGroups?: number;
  maxOccurrences?: number;
  quiet?: boolean;
}

interface InitCliOptions {
  cwd?: string;
  force?: boolean;
}

function parseInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`Expected a positive integer, received "${value}".`);
  }

  return parsed;
}

function parseNonNegativeInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Expected a non-negative integer, received "${value}".`);
  }

  return parsed;
}

function parseSimilarity(value: string): number {
  const parsed = Number.parseFloat(value);

  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1) {
    throw new Error(`Expected a number greater than 0 and up to 1, received "${value}".`);
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

  if (options.pr) {
    return "pr";
  }

  if (
    options.format === "terminal" ||
    options.format === "json" ||
    options.format === "markdown" ||
    options.format === "pr"
  ) {
    return options.format;
  }

  throw new Error(
    `Unsupported format "${options.format}". Expected terminal, json, markdown, or pr.`,
  );
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

function writeGateFailure(reasons: string[]): void {
  process.stderr.write(`CI gate failed:\n${reasons.map((reason) => `- ${reason}`).join("\n")}\n`);
}
