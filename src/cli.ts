#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { Command } from "commander";

import { analyzeResolvedProject } from "./analyze.js";
import { resolveOptions } from "./config.js";
import { evaluateCiGate } from "./gate.js";
import { initConfig } from "./init-config.js";
import { formatReport } from "./reporters/index.js";
import type { AnalyzeProjectOptions, ReportFormat } from "./types.js";
import { TOOL_VERSION } from "./version.js";

const program = new Command();
const FORMAT_SHORTCUTS = [
  ["json", "json"],
  ["markdown", "markdown"],
  ["pr", "pr"],
  ["github", "github"],
  ["sarif", "sarif"],
] as const;
const REPORT_FORMATS = new Set<string>(["terminal", "json", "markdown", "pr", "github", "sarif"]);

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
  .description(
    "Find repeated Tailwind class patterns in JavaScript, TypeScript, HTML, Astro, Vue, and Svelte projects.",
  )
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
  .option("--ignore-file <glob>", "Glob for files to omit from report evidence.", collectString)
  .option(
    "--ignore-pattern <classes>",
    "Exact class pattern to omit from duplicate and similarity reports.",
    collectString,
  )
  .option(
    "--format <format>",
    "Output format: terminal, json, markdown, pr, github, or sarif.",
    "terminal",
  )
  .option("--json", "Shortcut for --format json.")
  .option("--markdown", "Shortcut for --format markdown.")
  .option("--pr", "Shortcut for --format pr.")
  .option("--github", "Shortcut for --format github.")
  .option("--sarif", "Shortcut for --format sarif.")
  .option(
    "--annotation-limit <number>",
    "Maximum duplicate group annotations for --format github.",
    parseNonNegativeInteger,
  )
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
  .action(runAuditCommand);

program.parseAsync().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});

interface CliOptions extends Omit<AnalyzeProjectOptions, "configFile"> {
  format: string;
  json?: boolean;
  markdown?: boolean;
  pr?: boolean;
  github?: boolean;
  sarif?: boolean;
  annotationLimit?: number;
  ignoreFile?: string[];
  ignorePattern?: string[];
  output?: string;
  config?: string | boolean;
  quiet?: boolean;
}

interface InitCliOptions {
  cwd?: string;
  force?: boolean;
}

async function runAuditCommand(options: CliOptions): Promise<void> {
  const format = resolveFormat(options);
  const resolvedOptions = await resolveOptions(buildAnalyzeOptions(options));
  const report = await analyzeResolvedProject(resolvedOptions);
  const output = formatReport(report, format, {
    annotationLimit: options.annotationLimit,
  });
  const gate = evaluateCiGate(report, resolvedOptions);

  await writeFormattedReport(options, format, output, gate);
}

function buildAnalyzeOptions(options: CliOptions): AnalyzeProjectOptions {
  return {
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
    ignoreFiles: options.ignoreFile,
    ignorePatterns: options.ignorePattern,
    configFile: resolveConfigFileOption(options),
    failOn: options.failOn,
    maxGroups: options.maxGroups,
    maxOccurrences: options.maxOccurrences,
  };
}

async function writeFormattedReport(
  options: CliOptions,
  format: ReportFormat,
  output: string,
  gate: ReturnType<typeof evaluateCiGate>,
): Promise<void> {
  if (options.output) {
    await writeReportFile(options, format, output);
  } else {
    process.stdout.write(output);
  }

  applyGateResult(gate);
}

async function writeReportFile(
  options: CliOptions,
  format: ReportFormat,
  output: string,
): Promise<void> {
  if (!options.output) {
    return;
  }

  const outputPath = path.resolve(options.cwd ?? process.cwd(), options.output);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, output);

  if (!options.quiet) {
    process.stdout.write(`Wrote ${format} report to ${outputPath}\n`);
  }
}

function applyGateResult(gate: ReturnType<typeof evaluateCiGate>): void {
  if (gate.failed) {
    writeGateFailure(gate.reasons);
    process.exitCode = 1;
  }
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

function collectString(value: string, previous: string[] = []): string[] {
  return [...previous, value];
}

function resolveFormat(options: CliOptions): ReportFormat {
  const shortcut = FORMAT_SHORTCUTS.find(([option]) => options[option]);

  if (shortcut) {
    return shortcut[1];
  }

  if (isReportFormat(options.format)) {
    return options.format;
  }

  throw new Error(
    `Unsupported format "${options.format}". Expected terminal, json, markdown, pr, github, or sarif.`,
  );
}

function isReportFormat(format: string): format is ReportFormat {
  return REPORT_FORMATS.has(format);
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
