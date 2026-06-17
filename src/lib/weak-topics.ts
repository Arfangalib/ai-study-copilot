import { eq } from "drizzle-orm";
import { db } from "@/db";
import { weakTopics } from "@/db/schema";
import { nextScore, EWMA_ALPHA } from "@/lib/scoring";

export { nextScore, EWMA_ALPHA };

/**
 * Record a correct/incorrect signal for a topic and update its EWMA score.
 * Read-modify-write keeps the EWMA math in JS (type-safe, and avoids untyped-
 * parameter arithmetic in SQL). A bug-hunt counts as an incorrect signal (the
 * learner just made a mistake on this concept), lowering the score so it
 * surfaces as a weak topic. Returns the new score.
 */
export async function recordTopicSignal(
  topicRaw: string,
  correct: boolean,
): Promise<number> {
  const topic = topicRaw.trim().toLowerCase();
  if (!topic) return 0.5;

  const existing = await db.query.weakTopics.findFirst({
    where: eq(weakTopics.topic, topic),
  });

  if (!existing) {
    const score = nextScore(0.5, correct);
    await db.insert(weakTopics).values({ topic, score, attempts: 1 });
    return score;
  }

  const score = nextScore(existing.score, correct);
  await db
    .update(weakTopics)
    .set({
      score,
      attempts: existing.attempts + 1,
      lastSeen: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(weakTopics.topic, topic));
  return score;
}
