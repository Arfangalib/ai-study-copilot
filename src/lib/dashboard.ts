import { desc, asc, count } from "drizzle-orm";
import { db } from "@/db";
import {
  evalRuns,
  weakTopics,
  sources,
  chunks,
  askQueries,
  bugHunts,
} from "@/db/schema";
import type { CaseResult } from "@/eval/metrics";

export type EvalRunRow = {
  id: string;
  citationPrecision: number;
  refusalAccuracy: number;
  answerSupportRate: number;
  totalCases: number;
  details: CaseResult[];
  createdAt: Date;
};

/** Most recent eval run (with per-case detail), or null if none have been run. */
export async function getLatestEvalRun(): Promise<EvalRunRow | null> {
  const [row] = await db.select().from(evalRuns).orderBy(desc(evalRuns.createdAt)).limit(1);
  return (row as EvalRunRow) ?? null;
}

/** Recent eval runs (metrics only) for the trend line, newest first. */
export async function getEvalHistory(limit = 10) {
  return db
    .select({
      id: evalRuns.id,
      citationPrecision: evalRuns.citationPrecision,
      refusalAccuracy: evalRuns.refusalAccuracy,
      answerSupportRate: evalRuns.answerSupportRate,
      createdAt: evalRuns.createdAt,
    })
    .from(evalRuns)
    .orderBy(desc(evalRuns.createdAt))
    .limit(limit);
}

/** Weakest topics first (lowest mastery score). */
export async function getWeakTopics(limit = 20) {
  return db
    .select({
      topic: weakTopics.topic,
      score: weakTopics.score,
      attempts: weakTopics.attempts,
    })
    .from(weakTopics)
    .orderBy(asc(weakTopics.score))
    .limit(limit);
}

/** Corpus coverage counts. */
export async function getCoverage() {
  const [s] = await db.select({ c: count() }).from(sources);
  const [ch] = await db.select({ c: count() }).from(chunks);
  const [t] = await db.select({ c: count() }).from(weakTopics);
  return { sources: s.c, chunks: ch.c, trackedTopics: t.c };
}

/** Recent grounded-ask activity (shows the cite-or-refuse contract in action). */
export async function getRecentAsks(limit = 8) {
  return db
    .select({
      question: askQueries.question,
      groundingStatus: askQueries.groundingStatus,
      createdAt: askQueries.createdAt,
    })
    .from(askQueries)
    .orderBy(desc(askQueries.createdAt))
    .limit(limit);
}

/** Recent bug hunts (topic + when). */
export async function getRecentBugHunts(limit = 6) {
  return db
    .select({
      topic: bugHunts.topic,
      createdAt: bugHunts.createdAt,
    })
    .from(bugHunts)
    .orderBy(desc(bugHunts.createdAt))
    .limit(limit);
}
