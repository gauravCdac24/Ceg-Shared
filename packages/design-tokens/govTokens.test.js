import { describe, it, expect } from "vitest";
import { govPalette, govNeverDo } from "./src/index.js";

describe("gov design tokens", () => {
  it("uses navy primary and saffron accent", () => {
    expect(govPalette.primary).toBe("#1B3A6B");
    expect(govPalette.accent).toBe("#C8932A");
  });

  it("documents anti-slop never-do rules", () => {
    expect(govNeverDo.length).toBeGreaterThanOrEqual(5);
    expect(govNeverDo.some((r) => /purple/i.test(r))).toBe(true);
    expect(govNeverDo.some((r) => /pill/i.test(r))).toBe(true);
  });
});
