import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { AnySchema } from "ajv";
import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dirname, "..");
const schemaPath = path.join(root, "schemas/config.schema.json");

describe("config schema", () => {
  it("validates supported config options", async () => {
    const validate = await compileSchema();

    expect(
      validate({
        $schema:
          "https://raw.githubusercontent.com/Tijlio/tailwind-pattern-audit/main/schemas/config.schema.json",
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["**/node_modules/**"],
        minOccurrences: 2,
        minClasses: 4,
        functions: ["cn", "clsx"],
        priority: ["high", "medium"],
        kind: ["component", "cva", "utility"],
        hideLayoutOnly: true,
        similar: true,
        minSimilarity: 0.75,
        maxSimilarGroups: 20,
        baseline: "tailwind-audit-baseline.json",
        failOn: ["duplicates"],
        maxGroups: 0,
        maxOccurrences: 10,
      }),
      JSON.stringify(validate.errors, null, 2),
    ).toBe(true);
  });

  it("rejects unsupported config options", async () => {
    const validate = await compileSchema();

    expect(
      validate({
        include: ["src/**/*.tsx"],
        unsupported: true,
      }),
    ).toBe(false);
  });

  it("rejects invalid thresholds", async () => {
    const validate = await compileSchema();

    expect(validate({ minOccurrences: 0 })).toBe(false);
    expect(validate({ minSimilarity: 1.5 })).toBe(false);
  });
});

async function compileSchema() {
  const ajv = new Ajv2020();
  const schema = JSON.parse(await readFile(schemaPath, "utf8")) as AnySchema;

  return ajv.compile(schema);
}
