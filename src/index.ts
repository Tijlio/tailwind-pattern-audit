export { analyzeFiles, analyzeProject } from "./analyze.js";
export { AUDIT_REPORT_SCHEMA } from "./report-schema.js";
export {
  formatReport,
  generateJson,
  generateMarkdown,
  generateTerminal,
} from "./reporters/index.js";
export type {
  AnalyzeOptions,
  AnalyzeProjectOptions,
  AuditReport,
  ClassOccurrence,
  Diagnostic,
  DuplicateClassGroup,
  Extractor,
  ReportFormat,
} from "./types.js";
