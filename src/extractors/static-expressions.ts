import { isExpression } from "@babel/types";
import type {
  ArrayExpression,
  ConditionalExpression,
  Expression,
  Node,
  ObjectExpression,
  TemplateLiteral,
  TSAsExpression,
  TSSatisfiesExpression,
  TSTypeAssertion,
} from "@babel/types";

export interface StaticStringValue {
  raw: string;
  node: Node;
}

export function extractStaticStringValues(expression: Expression): StaticStringValue[] {
  const unwrapped = unwrapExpression(expression);
  const direct = extractStaticStringValue(unwrapped);

  if (direct) {
    return [direct];
  }

  if (unwrapped.type === "ArrayExpression") {
    return extractStaticValuesFromArray(unwrapped);
  }

  if (unwrapped.type === "ObjectExpression") {
    return extractStaticValuesFromObject(unwrapped);
  }

  if (unwrapped.type === "LogicalExpression" && !isDefinitelyFalse(unwrapped.left)) {
    return extractStaticStringValues(unwrapped.right);
  }

  if (unwrapped.type === "ConditionalExpression") {
    return extractStaticValuesFromConditional(unwrapped);
  }

  return [];
}

export function unwrapExpression(expression: Expression): Expression {
  let current = expression;

  while (
    current.type === "TSAsExpression" ||
    current.type === "TSSatisfiesExpression" ||
    current.type === "TSTypeAssertion"
  ) {
    current = (current as TSAsExpression | TSSatisfiesExpression | TSTypeAssertion).expression;
  }

  return current;
}

function extractStaticValuesFromArray(expression: ArrayExpression): StaticStringValue[] {
  return expression.elements.flatMap((element) => {
    if (!element || element.type === "SpreadElement") {
      return [];
    }

    return extractStaticStringValues(element);
  });
}

function extractStaticValuesFromObject(expression: ObjectExpression): StaticStringValue[] {
  return expression.properties.flatMap<StaticStringValue>((property): StaticStringValue[] => {
    if (property.type === "ObjectMethod" || property.type === "SpreadElement") {
      return [];
    }

    if (!isExpression(property.value) || isDefinitelyFalse(property.value)) {
      return [];
    }

    if (property.key.type === "StringLiteral") {
      return [{ raw: property.key.value, node: property.key }];
    }

    if (property.key.type === "Identifier") {
      return [{ raw: property.key.name, node: property.key }];
    }

    return [];
  });
}

function extractStaticValuesFromConditional(
  expression: ConditionalExpression,
): StaticStringValue[] {
  return [
    ...extractStaticStringValues(expression.consequent),
    ...extractStaticStringValues(expression.alternate),
  ];
}

function extractStaticStringValue(expression: Expression): StaticStringValue | undefined {
  const unwrapped = unwrapExpression(expression);

  if (unwrapped.type === "StringLiteral") {
    return { raw: unwrapped.value, node: unwrapped };
  }

  if (unwrapped.type === "TemplateLiteral" && unwrapped.expressions.length === 0) {
    return { raw: templateLiteralToString(unwrapped), node: unwrapped };
  }

  return undefined;
}

function templateLiteralToString(node: TemplateLiteral): string {
  return node.quasis.map((quasi) => quasi.value.cooked ?? quasi.value.raw).join("");
}

function isDefinitelyFalse(expression: Expression): boolean {
  const unwrapped = unwrapExpression(expression);

  return (
    (unwrapped.type === "BooleanLiteral" && !unwrapped.value) || unwrapped.type === "NullLiteral"
  );
}
