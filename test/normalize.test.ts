import { describe, expect, it } from "vitest";

import { normalizeClassValue } from "../src/normalize.js";

describe("normalizeClassValue", () => {
  it("normalizes whitespace and class order for comparison", () => {
    expect(normalizeClassValue("px-4 py-2 text-sm")?.normalized).toEqual(
      normalizeClassValue("text-sm   py-2 px-4")?.normalized,
    );
  });

  it("deduplicates repeated classes before building the comparison key", () => {
    expect(normalizeClassValue("flex flex items-center")?.tokens).toEqual(["flex", "items-center"]);
  });

  it("keeps conflicting utility order meaningful through tailwind-merge", () => {
    expect(normalizeClassValue("p-2 p-4")?.normalized).toBe("p-4");
    expect(normalizeClassValue("p-4 p-2")?.normalized).toBe("p-2");
  });
});
