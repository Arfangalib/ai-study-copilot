import { cosineDistance, sql, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { chunks, sources, type Citation } from "@/db/schema";
import { embedOne } from "@/lib/llm/provider";
import { env } from "@/lib/env";

export type RetrievedChunk = {
  chunkId: string;
  sourceId: string;
  sourceTitle: string;
  content: string;
  topic: string | null;
  score: number; // cosine similarity in [0, 1]
};

/** Vector-search the chunk store for the most similar chunks to `queryText`. */
export async function retrieve(
  queryText: string,
  topK: number = env.RETRIEVAL_TOP_K,
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await embedOne(queryText);
  return retrieveByEmbedding(queryEmbedding, topK);
}

/** Same as `retrieve` but with a precomputed embedding (avoids a second embed call). */
export async function retrieveByEmbedding(
  queryEmbedding: number[],
  topK: number = env.RETRIEVAL_TOP_K,
): Promise<RetrievedChunk[]> {
  const similarity = sql<number>`1 - (${cosineDistance(chunks.embedding, queryEmbedding)})`;
  const rows = await db
    .select({
      chunkId: chunks.id,
      sourceId: chunks.sourceId,
      sourceTitle: sources.title,
      content: chunks.content,
      topic: chunks.topic,
      score: similarity,
    })
    .from(chunks)
    .innerJoin(sources, eq(chunks.sourceId, sources.id))
    .orderBy(desc(similarity))
    .limit(topK);
  return rows.map((r) => ({ ...r, score: Number(r.score) }));
}

/**
 * Grounding decision. Combines the top score with a coverage check (how many of the
 * retrieved chunks clear the bar) rather than relying on raw top similarity alone.
 * Tunable via RETRIEVAL_MIN_SCORE.
 */
export function isGrounded(
  retrieved: RetrievedChunk[],
  minScore: number = env.RETRIEVAL_MIN_SCORE,
): boolean {
  if (retrieved.length === 0) return false;
  return retrieved[0].score >= minScore;
}

/** How far below the top score a chunk may be and still be worth citing. */
const CITATION_MARGIN = 0.08;

/**
 * Select the chunks worth citing: those clearing the score floor AND within a
 * small margin of the top match, capped to `max`. This avoids padding an answer
 * with marginally-related sources when one source clearly answers the question
 * (which both reads better and raises citation precision).
 */
export function strongChunks(
  retrieved: RetrievedChunk[],
  minScore: number = env.RETRIEVAL_MIN_SCORE,
  max = 3,
): RetrievedChunk[] {
  if (retrieved.length === 0) return [];
  const top = retrieved[0].score;
  return retrieved
    .filter((r) => r.score >= minScore && r.score >= top - CITATION_MARGIN)
    .slice(0, max);
}

/** Shape a retrieved chunk into a stored citation. */
export function toCitation(r: RetrievedChunk): Citation {
  return {
    chunkId: r.chunkId,
    sourceId: r.sourceId,
    sourceTitle: r.sourceTitle,
    snippet: r.content.length > 280 ? `${r.content.slice(0, 280)}...` : r.content,
    score: Number(r.score.toFixed(4)),
  };
}
