import { describe, it, expect } from "vitest";
import {
  citationPrecision,
  refusalCorrect,
  mean,
  aggregateSupport,
  summarize,
  type CaseResult,
} from "./metrics";

describe("citationPrecision", () => {
  it("is 1 when every cited source is expected", () => {
    expect(citationPrecision(["Sliding Window Technique"], ["Sliding Window Technique"])).toBe(1);
  });
  it("is 0.5 when half the cited sources are wrong", () => {
    expect(citationPrecision(["A", "B"], ["A"])).toBe(0.5);
  });
  it("is case-insensitive", () => {
    expect(citationPrecision(["sliding WINDOW technique"], ["Sliding Window Technique"])).toBe(1);
  });
  it("returns null when there are no citations to judge", () => {
    expect(citationPrecision([], ["A"])).toBeNull();
  });
});

describe("refusalCorrect", () => {
  it("answerable case is correct when grounded", () => {
    expect(refusalCorrect("grounded", true)).toBe(true);
    expect(refusalCorrect("not_found", true)).toBe(false);
  });
  it("out-of-corpus case is correct when refused", () => {
    expect(refusalCorrect("not_found", false)).toBe(true);
    expect(refusalCorrect("grounded", false)).toBe(false);
  });
});

describe("aggregateSupport", () => {
  it("pools claims across cases", () => {
    expect(aggregateSupport([{ supported: 3, total: 4 }, { supported: 1, total: 2 }])).toBeCloseTo(
      4 / 6,
      5,
    );
  });
  it("is 0 when there are no claims", () => {
    expect(aggregateSupport([])).toBe(0);
  });
});

describe("mean", () => {
  it("averages, empty is 0", () => {
    expect(mean([1, 0, 0.5])).toBeCloseTo(0.5, 5);
    expect(mean([])).toBe(0);
  });
});

describe("summarize", () => {
  it("rolls up the three headline metrics and excludes null precisions", () => {
    const results: CaseResult[] = [
      {
        id: "a",
        question: "q",
        kind: "in_corpus",
        expectAnswerable: true,
        actualStatus: "grounded",
        citedSources: ["A"],
        expectedSources: ["A"],
        refusalCorrect: true,
        citationPrecision: 1,
        support: { supported: 2, total: 2 },
      },
      {
        id: "b",
        question: "q",
        kind: "out_of_corpus",
        expectAnswerable: false,
        actualStatus: "not_found",
        citedSources: [],
        expectedSources: [],
        refusalCorrect: true,
        citationPrecision: null, // excluded from precision average
        support: null,
      },
    ];
    const s = summarize(results);
    expect(s.totalCases).toBe(2);
    expect(s.citationPrecision).toBe(1); // only the non-null one counts
    expect(s.refusalAccuracy).toBe(1);
    expect(s.answerSupportRate).toBe(1);
  });
});
