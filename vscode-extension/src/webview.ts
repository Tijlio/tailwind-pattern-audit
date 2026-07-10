import * as vscode from "vscode";

import type { DuplicateClassGroup, SimilarClassGroup } from "./report";

export function showGroupDetails(
  context: vscode.ExtensionContext,
  group: DuplicateClassGroup,
): void {
  const panel = vscode.window.createWebviewPanel(
    "tailwindPatternAudit.groupDetails",
    `${group.id} Details`,
    vscode.ViewColumn.Beside,
    {
      enableScripts: false,
      localResourceRoots: [context.extensionUri],
    },
  );

  panel.webview.html = renderGroupDetails(group);
}

export function showSimilarDetails(
  context: vscode.ExtensionContext,
  group: SimilarClassGroup,
): void {
  const panel = vscode.window.createWebviewPanel(
    "tailwindPatternAudit.similarDetails",
    `${group.id} Details`,
    vscode.ViewColumn.Beside,
    {
      enableScripts: false,
      localResourceRoots: [context.extensionUri],
    },
  );

  panel.webview.html = renderSimilarDetails(group);
}

export function showHtmlReport(html: string, context: vscode.ExtensionContext): void {
  const panel = vscode.window.createWebviewPanel(
    "tailwindPatternAudit.htmlReport",
    "Tailwind Pattern Audit Report",
    vscode.ViewColumn.Beside,
    {
      enableScripts: false,
      localResourceRoots: [context.extensionUri],
    },
  );

  panel.webview.html = html;
}

function renderGroupDetails(group: DuplicateClassGroup): string {
  return layout(
    `${group.id} Details`,
    `<header>
      <p class="eyebrow">${escapeHtml(group.recommendation.priority)} ${escapeHtml(group.recommendation.kind)}</p>
      <h1>${escapeHtml(group.id)}</h1>
      <p>${escapeHtml(group.recommendation.reason)}</p>
    </header>
    <section class="metrics">
      ${metric("Occurrences", group.occurrenceCount)}
      ${metric("Classes", group.classCount)}
      ${metric("Raw variants", group.rawValues.length)}
      ${metric("Top files", group.recommendation.topFiles.length)}
    </section>
    <section>
      <h2>Pattern</h2>
      <pre>${escapeHtml(group.rawValues[0]?.value ?? group.normalized)}</pre>
    </section>
    <section>
      <h2>Top Files</h2>
      ${table(
        ["File", "Count"],
        group.recommendation.topFiles.map((file) => [file.filePath, String(file.count)]),
      )}
    </section>
    <section>
      <h2>Occurrences</h2>
      ${table(
        ["Location", "Source", "Raw"],
        group.occurrences.map((occurrence) => [
          `${occurrence.filePath}:${occurrence.line}:${occurrence.column}`,
          occurrence.source.name,
          occurrence.raw,
        ]),
      )}
    </section>`,
  );
}

function renderSimilarDetails(group: SimilarClassGroup): string {
  return layout(
    `${group.id} Details`,
    `<header>
      <p class="eyebrow">similar pattern</p>
      <h1>${escapeHtml(group.id)}</h1>
      <p>${Math.round(group.similarity * 100)}% similar with ${group.sharedTokens.length} shared classes.</p>
    </header>
    <section>
      <h2>Shared Classes</h2>
      <pre>${escapeHtml(group.sharedTokens.join(" "))}</pre>
    </section>
    <section>
      <h2>Candidates</h2>
      ${group.candidates
        .map(
          (candidate, index) => `<article>
            <h3>Candidate ${index + 1}</h3>
            <div class="metrics compact">
              ${metric("Occurrences", candidate.occurrenceCount)}
              ${metric("Classes", candidate.classCount)}
            </div>
            <pre>${escapeHtml(candidate.rawValues[0]?.value ?? candidate.normalized)}</pre>
          </article>`,
        )
        .join("")}
    </section>`,
  );
}

function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: var(--vscode-editor-background);
      --text: var(--vscode-editor-foreground);
      --muted: var(--vscode-descriptionForeground);
      --border: var(--vscode-panel-border);
      --surface: var(--vscode-sideBar-background);
      --accent: var(--vscode-textLink-foreground);
      --code: var(--vscode-textPreformat-background);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 28px;
      background: var(--bg);
      color: var(--text);
      font-family: var(--vscode-font-family);
      line-height: 1.5;
    }
    header, section { margin-bottom: 24px; }
    h1, h2, h3, p { margin: 0; }
    h1 { font-size: 26px; line-height: 1.15; }
    h2 { font-size: 16px; margin-bottom: 10px; }
    h3 { font-size: 14px; margin-bottom: 8px; }
    p { color: var(--muted); margin-top: 8px; }
    .eyebrow {
      color: var(--accent);
      font-size: 12px;
      margin: 0 0 6px;
      text-transform: uppercase;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 8px;
    }
    .metrics.compact { margin-bottom: 10px; }
    .metric, table, pre {
      border: 1px solid var(--border);
      background: var(--surface);
      border-radius: 6px;
    }
    .metric { padding: 10px 12px; }
    .metric strong { display: block; font-size: 20px; }
    .metric span { display: block; color: var(--muted); font-size: 12px; }
    pre {
      overflow-x: auto;
      padding: 12px;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: var(--vscode-editor-font-family);
      background: var(--code);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      overflow: hidden;
    }
    th, td {
      border-bottom: 1px solid var(--border);
      padding: 8px 10px;
      text-align: left;
      vertical-align: top;
    }
    th { color: var(--muted); font-weight: 600; }
    tr:last-child td { border-bottom: 0; }
    td:last-child {
      font-family: var(--vscode-editor-font-family);
      word-break: break-word;
    }
    article { margin-bottom: 18px; }
  </style>
</head>
<body>
  ${body}
</body>
</html>`;
}

function metric(label: string, value: number): string {
  return `<div class="metric"><strong>${value}</strong><span>${escapeHtml(label)}</span></div>`;
}

function table(headers: string[], rows: string[][]): string {
  if (rows.length === 0) {
    return `<p>No entries.</p>`;
  }

  return `<table>
    <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
    <tbody>
      ${rows
        .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
        .join("")}
    </tbody>
  </table>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
