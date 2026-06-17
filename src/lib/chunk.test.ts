import { describe, it, expect } from "vitest";
import { chunkText } from "./chunk";

describe("chunkText", () => {
  it("returns an empty array for empty/whitespace input", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n\n  ")).toEqual([]);
  });

  it("keeps short text as a single chunk", () => {
    const out = chunkText("A short note about binary search.");
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("binary search");
  });

  it("respects the maxChars budget", () => {
    const para = "word ".repeat(80).trim(); // ~400 chars
    const text = `${para}\n\n${para}\n\n${para}`;
    const out = chunkText(text, { maxChars: 500, overlap: 50 });
    expect(out.length).toBeGreaterThan(1);
    for (const c of out) expect(c.length).toBeLessThanOrEqual(550); // budget + overlap slack
  });

  it("hard-splits a single oversized paragraph", () => {
    const huge = "x".repeat(2500);
    const out = chunkText(huge, { maxChars: 1000, overlap: 0 });
    expect(out.length).toBeGreaterThanOrEqual(3);
    expect(out.every((c) => c.length <= 1000)).toBe(true);
  });

  it("carries overlap context into the next chunk", () => {
    const a = "alpha ".repeat(100).trim();
    const b = "bravo ".repeat(100).trim();
    const out = chunkText(`${a}\n\n${b}`, { maxChars: 650, overlap: 60 });
    expect(out.length).toBeGreaterThan(1);
    // The second chunk should carry trailing context from the first ("alpha")
    // alongside its own new content ("bravo").
    expect(out[1]).toContain("alpha");
    expect(out[1]).toContain("bravo");
  });
});
