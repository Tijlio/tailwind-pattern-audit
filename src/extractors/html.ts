import path from "node:path";

import { parseFragment, type DefaultTreeAdapterTypes } from "parse5";

import { normalizeClassValue } from "../normalize.js";
import type { ClassOccurrence, Diagnostic, ExtractInput, Extractor } from "../types.js";

export const htmlExtractor: Extractor = {
  id: "html",
  extensions: [".html", ".astro"],
  extract(input) {
    return extractHtml(input);
  },
};

type ParseNode = DefaultTreeAdapterTypes.Node;
type ElementNode = DefaultTreeAdapterTypes.Element;

interface LocationLike {
  startLine: number;
  startCol: number;
}

function extractHtml(input: ExtractInput): {
  occurrences: ClassOccurrence[];
  diagnostics: Diagnostic[];
} {
  const occurrences: ClassOccurrence[] = [];
  const preparation = prepareSource(input);
  const fragment = parseFragment(preparation.source, { sourceCodeLocationInfo: true });

  walkNode(fragment, (element) => {
    const classAttribute = element.attrs.find((attribute) => attribute.name === "class");

    if (!classAttribute) {
      return;
    }

    addOccurrence({
      input,
      occurrences,
      raw: classAttribute.value,
      location: getAttributeLocation(element, classAttribute.name),
    });
  });

  return { occurrences, diagnostics: preparation.diagnostics };
}

function prepareSource(input: ExtractInput): { source: string; diagnostics: Diagnostic[] } {
  if (path.extname(input.filePath) !== ".astro") {
    return { source: input.source, diagnostics: [] };
  }

  return blankAstroFrontmatter(input.source, input.relativePath);
}

function blankAstroFrontmatter(
  source: string,
  relativePath: string,
): { source: string; diagnostics: Diagnostic[] } {
  const firstLineEnd = source.indexOf("\n");

  if (firstLineEnd === -1 || source.slice(0, firstLineEnd).trim() !== "---") {
    return { source, diagnostics: [] };
  }

  let lineStart = firstLineEnd + 1;

  while (lineStart < source.length) {
    const nextLineEnd = source.indexOf("\n", lineStart);
    const lineEnd = nextLineEnd === -1 ? source.length : nextLineEnd;

    if (source.slice(lineStart, lineEnd).trim() === "---") {
      const blankEnd = nextLineEnd === -1 ? source.length : nextLineEnd + 1;
      return {
        source: `${blankNonNewlineCharacters(source.slice(0, blankEnd))}${source.slice(blankEnd)}`,
        diagnostics: [],
      };
    }

    if (nextLineEnd === -1) {
      break;
    }

    lineStart = nextLineEnd + 1;
  }

  return {
    source: blankNonNewlineCharacters(source),
    diagnostics: [
      {
        severity: "warning",
        code: "astro_frontmatter_unclosed",
        message: "Skipped Astro markup because the frontmatter block is not closed.",
        filePath: relativePath,
        line: 1,
        column: 1,
      },
    ],
  };
}

function blankNonNewlineCharacters(source: string): string {
  return source.replace(/[^\r\n]/g, " ");
}

function walkNode(node: ParseNode, visit: (element: ElementNode) => void): void {
  if (isElementNode(node)) {
    visit(node);
  }

  if (!("childNodes" in node)) {
    return;
  }

  for (const child of node.childNodes) {
    walkNode(child, visit);
  }
}

function isElementNode(node: ParseNode): node is ElementNode {
  return "attrs" in node;
}

function addOccurrence(input: {
  input: ExtractInput;
  occurrences: ClassOccurrence[];
  raw: string;
  location?: LocationLike;
}): void {
  const normalized = normalizeClassValue(input.raw);

  if (!normalized) {
    return;
  }

  input.occurrences.push({
    filePath: input.input.relativePath,
    line: input.location?.startLine ?? 1,
    column: input.location?.startCol ?? 1,
    raw: input.raw,
    normalized: normalized.normalized,
    tokens: normalized.tokens,
    source: {
      extractor: htmlExtractor.id,
      kind: "htmlAttribute",
      name: "class",
    },
  });
}

function getAttributeLocation(
  element: ElementNode,
  attributeName: string,
): LocationLike | undefined {
  return (
    element.sourceCodeLocation?.attrs?.[attributeName] ??
    element.sourceCodeLocation?.startTag ??
    element.sourceCodeLocation ??
    undefined
  );
}

export function canExtractHtml(filePath: string): boolean {
  return htmlExtractor.extensions.includes(path.extname(filePath));
}
