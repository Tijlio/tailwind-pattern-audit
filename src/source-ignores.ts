const IGNORE_MARKER = "tailwind-pattern-audit-ignore";
const IGNORE_NEXT_LINE_MARKER = "tailwind-pattern-audit-ignore-next-line";

export interface SourceLineIgnores {
  ignoredLines: Set<number>;
}

export function buildSourceLineIgnores(source: string): SourceLineIgnores {
  const ignoredLines = new Set<number>();
  const lines = source.split(/\r?\n/);

  for (const [index, line] of lines.entries()) {
    const lineNumber = index + 1;

    if (line.includes(IGNORE_NEXT_LINE_MARKER)) {
      ignoredLines.add(lineNumber + 1);
      continue;
    }

    if (line.includes(IGNORE_MARKER)) {
      ignoredLines.add(lineNumber);
    }
  }

  return { ignoredLines };
}

export function isSourceLineIgnored(ignores: SourceLineIgnores, line?: number): boolean {
  return Boolean(line && ignores.ignoredLines.has(line));
}
