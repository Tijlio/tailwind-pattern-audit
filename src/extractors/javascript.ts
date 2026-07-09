import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import type { NodePath, TraverseOptions } from "@babel/traverse";
import { isExpression } from "@babel/types";
import type {
  CallExpression,
  Expression,
  JSXAttribute,
  JSXExpressionContainer,
  Node,
  ObjectExpression,
} from "@babel/types";

import { normalizeClassValue } from "../normalize.js";
import {
  buildSourceLineIgnores,
  isSourceLineIgnored,
  type SourceLineIgnores,
} from "../source-ignores.js";
import type {
  ClassOccurrence,
  Diagnostic,
  ExtractInput,
  Extractor,
  ExtractResult,
} from "../types.js";
import {
  extractStaticStringValues,
  unwrapExpression,
  type StaticStringValue,
} from "./static-expressions.js";

type TraverseFn = (parent: Node, opts: TraverseOptions) => void;

const traversePackage = traverseModule as unknown as { default?: TraverseFn } & TraverseFn;
const traverse = traversePackage.default ?? traversePackage;

export const javascriptExtractor: Extractor = {
  id: "javascript",
  extensions: [".js", ".jsx", ".ts", ".tsx"],
  extract(input) {
    return extractJavaScript(input);
  },
};

type StaticValue = StaticStringValue;

interface HelperCandidate extends StaticStringValue {
  name: string;
}

function extractJavaScript(input: ExtractInput): ExtractResult {
  const diagnostics: Diagnostic[] = [];
  const occurrences: ClassOccurrence[] = [];
  const lineIgnores = buildSourceLineIgnores(input.source);

  let ast: ReturnType<typeof parse>;

  try {
    ast = parse(input.source, {
      sourceType: "unambiguous",
      errorRecovery: true,
      plugins: [
        "jsx",
        "typescript",
        "decorators-legacy",
        "classProperties",
        "classPrivateProperties",
        "classPrivateMethods",
        "dynamicImport",
        "importMeta",
        "topLevelAwait",
        "importAttributes",
        "explicitResourceManagement",
      ],
    });
  } catch (error) {
    diagnostics.push({
      severity: "error",
      code: "parse_error",
      message: error instanceof Error ? error.message : "Unable to parse file.",
      filePath: input.relativePath,
    });

    return { occurrences, diagnostics };
  }

  for (const error of ast.errors ?? []) {
    diagnostics.push({
      severity: "warning",
      code: "parse_recovered",
      message: error.message,
      filePath: input.relativePath,
      line: error.loc?.line,
      column: error.loc ? error.loc.column + 1 : undefined,
    });
  }

  traverse(ast, {
    JSXAttribute(attributePath: NodePath<JSXAttribute>) {
      const attribute = attributePath.node;

      if (!isClassNameAttribute(attribute)) {
        return;
      }

      const values = extractJsxAttributeStaticValues(attribute, input.options.functions);

      if (!values) {
        if (isConfiguredHelperClassExpression(attribute, input.options.functions)) {
          return;
        }

        const location = getLocation(attribute);

        if (isSourceLineIgnored(lineIgnores, location.line)) {
          return;
        }

        diagnostics.push({
          severity: "info",
          code: "dynamic_classname_skipped",
          message: "Skipped dynamic className expression.",
          filePath: input.relativePath,
          line: location.line,
          column: location.column,
        });
        return;
      }

      for (const value of values) {
        addOccurrence({
          input,
          occurrences,
          raw: value.raw,
          node: value.node,
          lineIgnores,
          kind: "jsxAttribute",
          name: "className",
        });
      }
    },
    CallExpression(callPath: NodePath<CallExpression>) {
      const call = callPath.node;
      const calleeName = getCalleeName(call);

      if (!calleeName || !input.options.functions.includes(calleeName)) {
        return;
      }

      if (isNestedConfiguredHelperCall(callPath, input.options.functions)) {
        return;
      }

      for (const value of extractHelperCandidates(call, calleeName)) {
        addOccurrence({
          input,
          occurrences,
          raw: value.raw,
          node: value.node,
          lineIgnores,
          kind: "helperCall",
          name: value.name,
        });
      }
    },
  });

  return { occurrences, diagnostics };
}

function isClassNameAttribute(attribute: JSXAttribute): boolean {
  return attribute.name.type === "JSXIdentifier" && attribute.name.name === "className";
}

function extractJsxAttributeStaticValues(
  attribute: JSXAttribute,
  functions: string[],
): StaticValue[] | undefined {
  if (!attribute.value) {
    return undefined;
  }

  if (attribute.value.type === "StringLiteral") {
    return [
      {
        raw: attribute.value.value,
        node: attribute.value,
      },
    ];
  }

  if (attribute.value.type !== "JSXExpressionContainer") {
    return undefined;
  }

  return extractDirectStaticValues(attribute.value, functions);
}

function extractDirectStaticValues(
  container: JSXExpressionContainer,
  functions: string[],
): StaticValue[] | undefined {
  if (container.expression.type === "JSXEmptyExpression") {
    return undefined;
  }

  const expression = unwrapExpression(container.expression);

  if (expression.type === "CallExpression" && isConfiguredHelperCall(expression, functions)) {
    return undefined;
  }

  const values = extractStaticStringValues(expression);

  return values.length > 0 ? values : undefined;
}

function isConfiguredHelperClassExpression(attribute: JSXAttribute, functions: string[]): boolean {
  if (!attribute.value || attribute.value.type !== "JSXExpressionContainer") {
    return false;
  }

  const expression = attribute.value.expression;

  return expression.type === "CallExpression" && isConfiguredHelperCall(expression, functions);
}

function isConfiguredHelperCall(call: CallExpression, functions: string[]): boolean {
  const calleeName = getCalleeName(call);
  return Boolean(calleeName && functions.includes(calleeName));
}

function isNestedConfiguredHelperCall(
  callPath: NodePath<CallExpression>,
  functions: string[],
): boolean {
  return Boolean(
    callPath.findParent(
      (parentPath) =>
        parentPath.isCallExpression() &&
        parentPath.node !== callPath.node &&
        isConfiguredHelperCall(parentPath.node, functions),
    ),
  );
}

function extractHelperCandidates(call: CallExpression, calleeName: string): HelperCandidate[] {
  if (calleeName === "cva") {
    return extractCvaCandidates(call);
  }

  const combined = combineStaticValues(extractStaticValuesFromExpressionList(call.arguments), call);

  return combined ? [{ ...combined, name: calleeName }] : [];
}

function extractCvaCandidates(call: CallExpression): HelperCandidate[] {
  const candidates: HelperCandidate[] = [];
  const baseArgument = getExpressionArgument(call.arguments[0]);
  const optionsArgument = getExpressionArgument(call.arguments[1]);

  if (baseArgument) {
    const base = combineStaticValues(extractStaticStringValues(baseArgument), baseArgument);

    if (base) {
      candidates.push({ ...base, name: "cva:base" });
    }
  }

  const options = optionsArgument ? unwrapExpression(optionsArgument) : undefined;

  if (!options || options.type !== "ObjectExpression") {
    return candidates;
  }

  candidates.push(...extractCvaVariantCandidates(options));
  candidates.push(...extractCvaCompoundVariantCandidates(options));

  return candidates;
}

function extractCvaVariantCandidates(options: ObjectExpression): HelperCandidate[] {
  const variants = getObjectPropertyExpression(options, "variants");

  if (!variants || variants.type !== "ObjectExpression") {
    return [];
  }

  return variants.properties.flatMap<HelperCandidate>((variantGroup): HelperCandidate[] => {
    if (variantGroup.type !== "ObjectProperty" || !isExpression(variantGroup.value)) {
      return [];
    }

    const variantValues = unwrapExpression(variantGroup.value);

    if (variantValues.type !== "ObjectExpression") {
      return [];
    }

    return variantValues.properties.flatMap<HelperCandidate>((variantOption): HelperCandidate[] => {
      if (variantOption.type !== "ObjectProperty" || !isExpression(variantOption.value)) {
        return [];
      }

      const value = combineStaticValues(
        extractStaticStringValues(variantOption.value),
        variantOption.value,
      );

      return value ? [{ ...value, name: "cva:variant" }] : [];
    });
  });
}

function extractCvaCompoundVariantCandidates(options: ObjectExpression): HelperCandidate[] {
  const compoundVariants = getObjectPropertyExpression(options, "compoundVariants");

  if (!compoundVariants || compoundVariants.type !== "ArrayExpression") {
    return [];
  }

  return compoundVariants.elements.flatMap<HelperCandidate>((element): HelperCandidate[] => {
    if (!element || element.type === "SpreadElement") {
      return [];
    }

    const compoundVariant = unwrapExpression(element);

    if (compoundVariant.type !== "ObjectExpression") {
      return [];
    }

    return ["class", "className"].flatMap<HelperCandidate>((propertyName): HelperCandidate[] => {
      const value = getObjectPropertyExpression(compoundVariant, propertyName);
      const combined = value
        ? combineStaticValues(extractStaticStringValues(value), value)
        : undefined;

      return combined ? [{ ...combined, name: "cva:compoundVariant" }] : [];
    });
  });
}

function extractStaticValuesFromExpressionList(values: CallExpression["arguments"]): StaticValue[] {
  return values.flatMap((value) => {
    const expression = getExpressionArgument(value);

    if (!expression) {
      return [];
    }

    return extractStaticStringValues(expression);
  });
}

function combineStaticValues(values: StaticValue[], node: Node): StaticValue | undefined {
  if (values.length === 0) {
    return undefined;
  }

  return {
    raw: values.map((value) => value.raw).join(" "),
    node: values[0]?.node ?? node,
  };
}

function getExpressionArgument(
  value: CallExpression["arguments"][number] | undefined,
): Expression | undefined {
  if (!value || value.type === "ArgumentPlaceholder" || value.type === "SpreadElement") {
    return undefined;
  }

  return value;
}

function getObjectPropertyExpression(
  object: ObjectExpression,
  name: string,
): Expression | undefined {
  for (const property of object.properties) {
    if (property.type !== "ObjectProperty" || !isObjectPropertyKey(property, name)) {
      continue;
    }

    return isExpression(property.value) ? property.value : undefined;
  }

  return undefined;
}

function isObjectPropertyKey(
  property: Extract<ObjectExpression["properties"][number], { type: "ObjectProperty" }>,
  name: string,
): boolean {
  if (property.computed) {
    return false;
  }

  if (property.key.type === "Identifier") {
    return property.key.name === name;
  }

  return property.key.type === "StringLiteral" && property.key.value === name;
}

function getCalleeName(call: CallExpression): string | undefined {
  if (call.callee.type === "Identifier") {
    return call.callee.name;
  }

  if (call.callee.type === "MemberExpression" && !call.callee.computed) {
    const property = call.callee.property;
    return property.type === "Identifier" ? property.name : undefined;
  }

  return undefined;
}

function addOccurrence(input: {
  input: ExtractInput;
  occurrences: ClassOccurrence[];
  raw: string;
  node: Node;
  lineIgnores: SourceLineIgnores;
  kind: ClassOccurrence["source"]["kind"];
  name: string;
}): void {
  const normalized = normalizeClassValue(input.raw);

  if (!normalized) {
    return;
  }

  const location = getLocation(input.node);

  if (isSourceLineIgnored(input.lineIgnores, location.line)) {
    return;
  }

  input.occurrences.push({
    filePath: input.input.relativePath,
    line: location.line ?? 1,
    column: location.column ?? 1,
    raw: input.raw,
    normalized: normalized.normalized,
    tokens: normalized.tokens,
    source: {
      extractor: javascriptExtractor.id,
      kind: input.kind,
      name: input.name,
    },
  });
}

function getLocation(node: Node): { line?: number; column?: number } {
  return {
    line: node.loc?.start.line,
    column: node.loc ? node.loc.start.column + 1 : undefined,
  };
}
