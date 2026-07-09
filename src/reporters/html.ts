import type { AuditReport, Diagnostic, DuplicateClassGroup, SimilarClassGroup } from "../types.js";
import { getPrimaryPatternValue, summarizeKinds, summarizePriorities } from "./shared.js";

const TOP_CANDIDATE_LIMIT = 5;

export function generateHtml(report: AuditReport): string {
  return `<!doctype html>
<html lang="en">
${formatHead()}
<body>
  <main class="shell">
    ${formatHeader(report)}
    ${formatSummary(report)}
    ${formatTopCandidates(report)}
    ${formatDuplicateGroups(report)}
    ${formatSimilarGroups(report)}
    ${formatDiagnostics(report)}
  </main>
</body>
</html>
`;
}

function formatHead(): string {
  return `<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Tailwind Pattern Audit</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f7f4;
      --surface: #ffffff;
      --surface-muted: #f1f5f9;
      --text: #171717;
      --muted: #5f6470;
      --border: #d7dce2;
      --accent: #0f766e;
      --accent-soft: #ccfbf1;
      --warning: #b45309;
      --danger: #b91c1c;
      --code: #111827;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.5;
    }

    .shell {
      width: min(1180px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 40px 0 56px;
    }

    header {
      display: grid;
      gap: 12px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border);
    }

    h1, h2, h3 { margin: 0; line-height: 1.15; letter-spacing: 0; }
    h1 { font-size: 2rem; }
    h2 { font-size: 1.25rem; margin-top: 34px; }
    h3 { font-size: 1rem; }

    p { margin: 0; color: var(--muted); }

    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }

    code, pre {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      color: var(--code);
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      color: var(--muted);
      font-size: 0.875rem;
    }

    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 10px;
      margin-top: 20px;
    }

    .metric, .panel, details {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
    }

    .metric {
      padding: 14px 16px;
    }

    .metric strong {
      display: block;
      font-size: 1.5rem;
      line-height: 1.1;
    }

    .metric span, .label {
      display: block;
      color: var(--muted);
      font-size: 0.8125rem;
      margin-top: 4px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 12px;
      margin-top: 14px;
    }

    .panel {
      padding: 16px;
    }

    .stack {
      display: grid;
      gap: 12px;
      margin-top: 14px;
    }

    .table-wrap {
      overflow-x: auto;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface);
      margin-top: 14px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 760px;
      font-size: 0.875rem;
    }

    th, td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
      text-align: left;
      vertical-align: top;
    }

    th {
      background: var(--surface-muted);
      color: var(--muted);
      font-weight: 650;
    }

    tr:last-child td { border-bottom: 0; }

    .pattern {
      display: block;
      white-space: pre-wrap;
      word-break: break-word;
      border-radius: 6px;
      background: #f8fafc;
      border: 1px solid var(--border);
      padding: 10px;
      margin-top: 10px;
      font-size: 0.8125rem;
    }

    .badge-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 10px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      border: 1px solid var(--border);
      padding: 2px 8px;
      font-size: 0.75rem;
      color: var(--muted);
      background: var(--surface);
    }

    .priority-high { color: var(--danger); border-color: #fecaca; background: #fff1f2; }
    .priority-medium { color: var(--warning); border-color: #fed7aa; background: #fff7ed; }
    .priority-low { color: var(--accent); border-color: var(--accent-soft); background: #f0fdfa; }

    details {
      padding: 0;
      overflow: hidden;
    }

    summary {
      cursor: pointer;
      list-style: none;
      padding: 14px 16px;
    }

    summary::-webkit-details-marker { display: none; }

    .details-body {
      padding: 0 16px 16px;
    }

    .summary-line {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .summary-title {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .summary-title code {
      font-weight: 700;
    }

    .empty {
      margin-top: 14px;
      padding: 16px;
      border: 1px dashed var(--border);
      border-radius: 8px;
      color: var(--muted);
      background: rgba(255, 255, 255, 0.55);
    }

    @media (max-width: 700px) {
      .shell {
        width: min(100vw - 20px, 1180px);
        padding-top: 24px;
      }

      h1 { font-size: 1.6rem; }

      .summary-line {
        align-items: flex-start;
      }
    }
  </style>
</head>`;
}

function formatHeader(report: AuditReport): string {
  return `<header>
    <h1>Tailwind Pattern Audit</h1>
    <p>Repeated Tailwind class patterns found in ${escapeHtml(report.cwd)}</p>
    <div class="meta">
      <span>Tool ${escapeHtml(report.toolVersion)}</span>
      <span>Schema ${report.schemaVersion}</span>
      <span>${report.durationMs}ms</span>
      ${report.performance ? `<span>${report.performance.filesPerSecond} files/sec</span>` : ""}
    </div>
  </header>`;
}

function formatSummary(report: AuditReport): string {
  return `<section aria-labelledby="summary-heading">
    <h2 id="summary-heading">Summary</h2>
    <div class="metrics">
      ${formatMetric("Scanned files", report.scannedFiles)}
      ${formatMetric("Occurrences", report.occurrences)}
      ${formatMetric("Duplicate groups", report.groups.length)}
      ${formatMetric("Similar groups", report.similarGroups?.length ?? 0)}
      ${formatMetric("Diagnostics", report.diagnostics.length)}
      ${formatMetric("Duration", `${report.durationMs}ms`)}
    </div>
    <div class="grid">
      <div class="panel">
        <h3>By priority</h3>
        <p>${escapeHtml(summarizePriorities(report))}</p>
      </div>
      <div class="panel">
        <h3>By kind</h3>
        <p>${escapeHtml(summarizeKinds(report))}</p>
      </div>
    </div>
  </section>`;
}

function formatMetric(label: string, value: string | number): string {
  return `<div class="metric"><strong>${escapeHtml(String(value))}</strong><span>${escapeHtml(label)}</span></div>`;
}

function formatTopCandidates(report: AuditReport): string {
  if (report.groups.length === 0) {
    return `<section aria-labelledby="top-candidates-heading">
      <h2 id="top-candidates-heading">Top Candidates</h2>
      <div class="empty">No duplicate Tailwind class patterns found.</div>
    </section>`;
  }

  const sections = [
    ["Component candidates", "component"],
    ["CVA candidates", "cva"],
    ["Utility candidates", "utility"],
  ] as const;
  const content = sections
    .map(([title, kind]) => {
      const groups = report.groups
        .filter((group) => group.recommendation.kind === kind)
        .slice(0, TOP_CANDIDATE_LIMIT);

      if (groups.length === 0) {
        return "";
      }

      return `<div class="panel">
        <h3>${title}</h3>
        <div class="stack">
          ${groups.map(formatTopCandidate).join("")}
        </div>
      </div>`;
    })
    .join("");

  return `<section aria-labelledby="top-candidates-heading">
    <h2 id="top-candidates-heading">Top Candidates</h2>
    <div class="grid">${content}</div>
  </section>`;
}

function formatTopCandidate(group: DuplicateClassGroup): string {
  return `<div>
    <a href="#${escapeHtml(group.id)}"><strong>${escapeHtml(group.id)}</strong></a>
    <span class="badge priority-${escapeHtml(group.recommendation.priority)}">${escapeHtml(
      group.recommendation.priority,
    )}</span>
    <span class="badge">${group.occurrenceCount} occurrences</span>
    <span class="badge">${group.classCount} classes</span>
    <code class="pattern">${escapeHtml(getPrimaryPatternValue(group))}</code>
  </div>`;
}

function formatDuplicateGroups(report: AuditReport): string {
  if (report.groups.length === 0) {
    return "";
  }

  return `<section aria-labelledby="duplicate-groups-heading">
    <h2 id="duplicate-groups-heading">Duplicate Groups</h2>
    <div class="stack">
      ${report.groups.map(formatDuplicateGroup).join("")}
    </div>
  </section>`;
}

function formatDuplicateGroup(group: DuplicateClassGroup): string {
  return `<details id="${escapeHtml(group.id)}">
    <summary>
      <div class="summary-line">
        <div class="summary-title">
          <code>${escapeHtml(group.id)}</code>
          <span>${group.occurrenceCount} occurrences</span>
          <span>${group.classCount} classes</span>
        </div>
        <div class="badge-row">
          <span class="badge priority-${escapeHtml(group.recommendation.priority)}">${escapeHtml(
            group.recommendation.priority,
          )}</span>
          <span class="badge">${escapeHtml(group.recommendation.kind)}</span>
        </div>
      </div>
    </summary>
    <div class="details-body">
      <p>${escapeHtml(group.recommendation.reason)}</p>
      <code class="pattern">${escapeHtml(getPrimaryPatternValue(group))}</code>
      ${formatTopFiles(group)}
      ${formatOccurrencesTable(group)}
    </div>
  </details>`;
}

function formatTopFiles(group: DuplicateClassGroup): string {
  if (group.recommendation.topFiles.length === 0) {
    return "";
  }

  return `<div class="badge-row">
    ${group.recommendation.topFiles
      .map(
        (topFile) =>
          `<span class="badge">${escapeHtml(topFile.filePath)} (${topFile.count})</span>`,
      )
      .join("")}
  </div>`;
}

function formatOccurrencesTable(group: DuplicateClassGroup): string {
  return `<div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Location</th>
          <th>Source</th>
          <th>Raw variant</th>
        </tr>
      </thead>
      <tbody>
        ${group.occurrences
          .map(
            (occurrence) => `<tr>
              <td>${escapeHtml(
                `${occurrence.filePath}:${occurrence.line}:${occurrence.column}`,
              )}</td>
              <td>${escapeHtml(occurrence.source.name)}</td>
              <td><code>${escapeHtml(occurrence.raw)}</code></td>
            </tr>`,
          )
          .join("")}
      </tbody>
    </table>
  </div>`;
}

function formatSimilarGroups(report: AuditReport): string {
  if (!report.similarGroups || report.similarGroups.length === 0) {
    return "";
  }

  return `<section aria-labelledby="similar-groups-heading">
    <h2 id="similar-groups-heading">Similar Groups</h2>
    <div class="stack">
      ${report.similarGroups.map(formatSimilarGroup).join("")}
    </div>
  </section>`;
}

function formatSimilarGroup(group: SimilarClassGroup): string {
  const [first, second] = group.candidates;

  if (!first || !second) {
    return "";
  }

  return `<details id="${escapeHtml(group.id)}">
    <summary>
      <div class="summary-line">
        <div class="summary-title">
          <code>${escapeHtml(group.id)}</code>
          <span>${Math.round(group.similarity * 100)}% similar</span>
          <span>${group.sharedTokens.length} shared classes</span>
        </div>
      </div>
    </summary>
    <div class="details-body">
      <div class="grid">
        ${formatSimilarCandidate(first)}
        ${formatSimilarCandidate(second)}
      </div>
      <code class="pattern">${escapeHtml(group.sharedTokens.join(" "))}</code>
    </div>
  </details>`;
}

function formatSimilarCandidate(candidate: SimilarClassGroup["candidates"][number]): string {
  return `<div class="panel">
    <h3>${escapeHtml(candidate.occurrences[0]?.filePath ?? "Candidate")}</h3>
    <div class="badge-row">
      <span class="badge">${candidate.occurrenceCount} occurrences</span>
      <span class="badge">${candidate.classCount} classes</span>
    </div>
    <code class="pattern">${escapeHtml(getPrimaryPatternValue(candidate))}</code>
  </div>`;
}

function formatDiagnostics(report: AuditReport): string {
  if (report.diagnostics.length === 0) {
    return "";
  }

  return `<section aria-labelledby="diagnostics-heading">
    <h2 id="diagnostics-heading">Diagnostics</h2>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Severity</th>
            <th>Code</th>
            <th>Location</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          ${report.diagnostics.map(formatDiagnostic).join("")}
        </tbody>
      </table>
    </div>
  </section>`;
}

function formatDiagnostic(diagnostic: Diagnostic): string {
  const location = diagnostic.filePath
    ? `${diagnostic.filePath}${diagnostic.line ? `:${diagnostic.line}:${diagnostic.column ?? 1}` : ""}`
    : "";

  return `<tr>
    <td>${escapeHtml(diagnostic.severity)}</td>
    <td><code>${escapeHtml(diagnostic.code)}</code></td>
    <td>${escapeHtml(location)}</td>
    <td>${escapeHtml(diagnostic.message)}</td>
  </tr>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
