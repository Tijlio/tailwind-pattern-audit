import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { TOOL_VERSION } from "../src/version.js";

describe("TOOL_VERSION", () => {
  it("matches package.json", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8")) as { version: string };

    expect(TOOL_VERSION).toBe(packageJson.version);
  });
});
