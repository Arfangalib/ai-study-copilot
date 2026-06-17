import { describe, it, expect } from "vitest";
import { nextScore, EWMA_ALPHA } from "./scoring";

describe("nextScore (EWMA)", () => {
  it("pulls toward 1 on a correct signal", () => {
    expect(nextScore(0.5, true)).toBeCloseTo(0.4 * 1 + 0.6 * 0.5, 5);
    expect(nextScore(0.5, true)).toBeGreaterThan(0.5);
  });

  it("pulls toward 0 on an incorrect signal", () => {
    expect(nextScore(0.5, false)).toBeCloseTo(0.6 * 0.5, 5);
    expect(nextScore(0.5, false)).toBeLessThan(0.5);
  });

  it("stays within [0, 1]", () => {
    let s = 1;
    for (let i = 0; i < 20; i++) s = nextScore(s, false);
    expect(s).toBeGreaterThanOrEqual(0);
    s = 0;
    for (let i = 0; i < 20; i++) s = nextScore(s, true);
    expect(s).toBeLessThanOrEqual(1);
  });

  it("repeated correct answers converge upward toward mastery", () => {
    let s = 0.2;
    for (let i = 0; i < 10; i++) s = nextScore(s, true);
    expect(s).toBeGreaterThan(0.9);
  });

  it("respects a custom alpha", () => {
    expect(nextScore(0.5, true, 1)).toBe(1); // alpha=1 -> jump straight to target
    expect(nextScore(0.5, false, 0)).toBe(0.5); // alpha=0 -> no movement
    expect(EWMA_ALPHA).toBeGreaterThan(0);
  });
});
