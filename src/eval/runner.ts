import { db } from "@/db";
import { evalRuns } from "@/db/schema";
import { askGrounded } from "@/lib/ask";
import { EVAL_CASES, type EvalCase } from "./dataset";
import {
  citationPrecision,
  refusalCorrect,
  summarize,
  type CaseResult,
  type EvalSummary,
} from "./metrics";
import { judgeSupport } from "./judge";

export type EvalRunResult = {
  runId: string;
  summary: EvalSummary;
  results: CaseResult[];
};

/**
 * Run the eval set through the REAL grounded-ask pipeline and compute the three
 * metrics, then persist the run. Citation precision and answer support are scored
 * only on cases that should be answerable (the gate's correctness is captured
 * separately by refusal accuracy). Does not persist to ask history.
 */
export async function runEval(cases: EvalCase[] = EVAL_CASES): Promise<EvalRunResult> {
  const results: CaseResult[] = [];

  for (const c of cases) {
    const ask = await askGrounded(c.question, { persist: false });
    const citedSources = ask.citations.map((x) => x.sourceTitle);
    const grounded = ask.groundingStatus === "grounded";
    const scored = grounded && c.expectAnswerable;

    const support = scored
      ? await judgeSupport(c.question, ask.answer, ask.citations.map((x) => x.snippet))
      : null;

    results.push({
      id: c.id,
      question: c.question,
      kind: c.kind,
      expectAnswerable: c.expectAnswerable,
      actualStatus: ask.groundingStatus,
      citedSources,
      expectedSources: c.expectedSources,
      refusalCorrect: refusalCorrect(ask.groundingStatus, c.expectAnswerable),
      citationPrecision: scored ? citationPrecision(citedSources, c.expectedSources) : null,
      support,
    });
  }

  const summary = summarize(results);

  const [run] = await db
    .insert(evalRuns)
    .values({
      citationPrecision: summary.citationPrecision,
      refusalAccuracy: summary.refusalAccuracy,
      answerSupportRate: summary.answerSupportRate,
      totalCases: summary.totalCases,
      details: results,
    })
    .returning({ id: evalRuns.id });

  return { runId: run.id, summary, results };
}
