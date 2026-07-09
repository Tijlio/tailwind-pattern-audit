export { analyzeFiles, analyzeProject } from "./analyze.js";
export { evaluateCiGate } from "./gate.js";
export { initConfig } from "./init-config.js";
export type { InitConfigOptions, InitConfigResult } from "./init-config.js";
export { AUDIT_REPORT_SCHEMA } from "./report-schema.js";
export {
  formatReport,
  generateJson,
  generateMarkdown,
  generatePr,
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
  FailOnCondition,
  GateResult,
  ReportFormat,
} from "./types.js";
