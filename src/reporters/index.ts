import { generateGithubAnnotations } from "./github.js";
import { generateJson } from "./json.js";
import { generateMarkdown } from "./markdown.js";
import { generatePr } from "./pr.js";
import { generateTerminal } from "./terminal.js";
import type { AuditReport, ReportFormat, ReportFormatOptions } from "../types.js";

export { generateGithubAnnotations, generateJson, generateMarkdown, generatePr, generateTerminal };

export function formatReport(
  report: AuditReport,
  format: ReportFormat,
  options: ReportFormatOptions = {},
): string {
  switch (format) {
    case "github":
      return generateGithubAnnotations(report, options.annotationLimit);
    case "json":
      return generateJson(report);
    case "markdown":
      return generateMarkdown(report);
    case "pr":
      return generatePr(report);
    case "terminal":
      return generateTerminal(report);
  }
}
