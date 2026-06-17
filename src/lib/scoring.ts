/**
 * Pure scoring math, dependency-free so it can be unit-tested in isolation
 * (no DB / env imports). Used by the weak-topic tracker.
 */

/** Exponential-moving-average weight for the newest signal. */
export const EWMA_ALPHA = 0.4;

/**
 * EWMA update for a topic's mastery score in [0, 1]. A correct signal pulls
 * toward 1, an incorrect signal toward 0.
 */
export function nextScore(prev: number, correct: boolean, alpha = EWMA_ALPHA): number {
  const target = correct ? 1 : 0;
  const next = alpha * target + (1 - alpha) * prev;
  return Math.min(1, Math.max(0, next));
}
