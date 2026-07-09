import type { AuditReport } from "../types.js";

export function generateJson(report: AuditReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}
