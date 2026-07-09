import { generateJson } from "./json.js";
import { generateMarkdown } from "./markdown.js";
import { generateTerminal } from "./terminal.js";
import type { AuditReport, ReportFormat } from "../types.js";

export { generateJson, generateMarkdown, generateTerminal };

export function formatReport(report: AuditReport, format: ReportFormat): string {
  switch (format) {
    case "json":
      return generateJson(report);
    case "markdown":
      return generateMarkdown(report);
    case "terminal":
      return generateTerminal(report);
  }
}
