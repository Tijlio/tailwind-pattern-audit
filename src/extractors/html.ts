import path from "node:path";

import { parseExpression } from "@babel/parser";
import { parseFragment, type DefaultTreeAdapterTypes } from "parse5";

import { normalizeClassValue } from "../normalize.js";
import {
  buildSourceLineIgnores,
  isSourceLineIgnored,
  type SourceLineIgnores,
} from "../source-ignores.js";
import type { ClassOccurrence, Diagnostic, ExtractInput, Extractor } from "../types.js";
import { extractStaticStringValues } from "./static-expressions.js";

export const htmlExtractor: Extractor = {
  id: "html",
  extensions: [".html", ".astro", ".vue", ".svelte"],
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

interface BraceReaderState {
  depth: number;
  escaped: boolean;
  quote?: string;
}

function extractHtml(input: ExtractInput): {
  occurrences: ClassOccurrence[];
  diagnostics: Diagnostic[];
} {
  const occurrences: ClassOccurrence[] = [];
  const preparation = prepareSource(input);
  const lineIgnores = buildSourceLineIgnores(preparation.source);
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
      lineIgnores,
      name: "class",
    });
  });

  if (path.extname(input.filePath) === ".astro") {
    addAstroClassListOccurrences(input, preparation.source, lineIgnores, occurrences);
  }

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

  if (isTemplateNode(node)) {
    walkNode(node.content, visit);
  }
}

function isElementNode(node: ParseNode): node is ElementNode {
  return "attrs" in node;
}

function isTemplateNode(node: ParseNode): node is DefaultTreeAdapterTypes.Template {
  return isElementNode(node) && "content" in node;
}

function addOccurrence(input: {
  input: ExtractInput;
  occurrences: ClassOccurrence[];
  raw: string;
  location?: LocationLike;
  lineIgnores: SourceLineIgnores;
  name: string;
}): void {
  const normalized = normalizeClassValue(input.raw);

  if (!normalized) {
    return;
  }

  if (isSourceLineIgnored(input.lineIgnores, input.location?.startLine)) {
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
      name: input.name,
    },
  });
}

function addAstroClassListOccurrences(
  input: ExtractInput,
  source: string,
  lineIgnores: SourceLineIgnores,
  occurrences: ClassOccurrence[],
): void {
  let offset = 0;

  while (offset < source.length) {
    const attributeOffset = source.indexOf("class:list", offset);

    if (attributeOffset === -1) {
      return;
    }

    const value = readAttributeValue(source, attributeOffset + "class:list".length);

    if (value) {
      const raw = extractClassListRawValue(value.value);

      if (raw) {
        addOccurrence({
          input,
          occurrences,
          raw,
          location: getLineColumn(source, attributeOffset),
          lineIgnores,
          name: "class:list",
        });
      }

      offset = value.endOffset;
    } else {
      offset = attributeOffset + "class:list".length;
    }
  }
}

function readAttributeValue(
  source: string,
  offset: number,
): { value: string; endOffset: number } | undefined {
  let current = skipWhitespace(source, offset);

  if (source[current] !== "=") {
    return undefined;
  }

  current = skipWhitespace(source, current + 1);

  const quote = source[current];

  if (quote === `"` || quote === "'") {
    const endOffset = source.indexOf(quote, current + 1);

    if (endOffset === -1) {
      return undefined;
    }

    return {
      value: source.slice(current + 1, endOffset),
      endOffset: endOffset + 1,
    };
  }

  if (source[current] === "{") {
    return readBalancedBraces(source, current);
  }

  return undefined;
}

function readBalancedBraces(
  source: string,
  offset: number,
): { value: string; endOffset: number } | undefined {
  const state: BraceReaderState = {
    depth: 0,
    escaped: false,
  };

  for (let index = offset; index < source.length; index += 1) {
    const character = source[index];

    if (!character) {
      break;
    }

    if (advanceQuotedState(state, character)) {
      continue;
    }

    if (enterQuote(state, character)) {
      continue;
    }

    if (character === "{") {
      state.depth += 1;
      continue;
    }

    if (character !== "}") {
      continue;
    }

    state.depth -= 1;

    if (state.depth === 0) {
      return {
        value: source.slice(offset, index + 1),
        endOffset: index + 1,
      };
    }
  }

  return undefined;
}

function advanceQuotedState(state: BraceReaderState, character: string): boolean {
  if (!state.quote) {
    return false;
  }

  if (state.escaped) {
    state.escaped = false;
  } else if (character === "\\") {
    state.escaped = true;
  } else if (character === state.quote) {
    state.quote = undefined;
  }

  return true;
}

function enterQuote(state: BraceReaderState, character: string): boolean {
  if (!isQuote(character)) {
    return false;
  }

  state.quote = character;
  return true;
}

function isQuote(character: string): boolean {
  return character === `"` || character === "'" || character === "`";
}

function extractClassListRawValue(value: string): string | undefined {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  if (!trimmed.startsWith("{")) {
    return trimmed;
  }

  if (!trimmed.endsWith("}")) {
    return undefined;
  }

  try {
    const expression = parseExpression(trimmed.slice(1, -1), {
      plugins: ["typescript", "jsx"],
    });
    const staticValues = extractStaticStringValues(expression).map((value) => value.raw);

    return staticValues.length > 0 ? staticValues.join(" ") : undefined;
  } catch {
    return undefined;
  }
}

function skipWhitespace(source: string, offset: number): number {
  let current = offset;

  while (/\s/.test(source[current] ?? "")) {
    current += 1;
  }

  return current;
}

function getLineColumn(source: string, offset: number): LocationLike {
  let line = 1;
  let column = 1;

  for (let index = 0; index < offset; index += 1) {
    if (source[index] === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }

  return { startLine: line, startCol: column };
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
