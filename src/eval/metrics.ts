/**
 * Pure metric math for the evaluation harness. Dependency-free so it can be
 * unit-tested in isolation. Three defensible metrics (no slippery "faithfulness"):
 *  - citation precision : of the sources the system cited, how many were correct
 *  - refusal accuracy   : did the grounding gate make the right answer/refuse call
 *  - answer support rate : fraction of answer claims backed by a cited chunk
 */

/** Case-insensitive set membership for source titles. */
function norm(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Citation precision for a single grounded answer: the fraction of cited sources
 * that are in the expected set. Returns null when precision is undefined (no
 * citations to judge), so callers can exclude it from the average.
 */
export function citationPrecision(
  citedSources: string[],
  expectedSources: string[],
): number | null {
  if (citedSources.length === 0) return null;
  const expected = new Set(expectedSources.map(norm));
  const correct = citedSources.filter((s) => expected.has(norm(s))).length;
  return correct / citedSources.length;
}

/** Did the system make the correct answer-vs-refuse decision for this case? */
export function refusalCorrect(
  actualStatus: "grounded" | "not_found",
  expectAnswerable: boolean,
): boolean {
  return expectAnswerable ? actualStatus === "grounded" : actualStatus === "not_found";
}

/** Mean of an array, treating an empty array as 0. */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Aggregate answer-support: total supported claims over total claims. */
export function aggregateSupport(
  perCase: { supported: number; total: number }[],
): number {
  const total = perCase.reduce((a, c) => a + c.total, 0);
  if (total === 0) return 0;
  const supported = perCase.reduce((a, c) => a + c.supported, 0);
  return supported / total;
}

export type CaseResult = {
  id: string;
  question: string;
  kind: "in_corpus" | "out_of_corpus";
  expectAnswerable: boolean;
  actualStatus: "grounded" | "not_found";
  citedSources: string[];
  expectedSources: string[];
  refusalCorrect: boolean;
  citationPrecision: number | null;
  support: { supported: number; total: number } | null;
};

export type EvalSummary = {
  totalCases: number;
  citationPrecision: number;
  refusalAccuracy: number;
  answerSupportRate: number;
};

/** Roll per-case results up into the three headline metrics. */
export function summarize(results: CaseResult[]): EvalSummary {
  const precisions = results
    .map((r) => r.citationPrecision)
    .filter((p): p is number => p !== null);
  const supports = results
    .map((r) => r.support)
    .filter((s): s is { supported: number; total: number } => s !== null);

  return {
    totalCases: results.length,
    citationPrecision: mean(precisions),
    refusalAccuracy: mean(results.map((r) => (r.refusalCorrect ? 1 : 0))),
    answerSupportRate: aggregateSupport(supports),
  };
}
