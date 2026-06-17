import { db } from "@/db";
import { askQueries, type Citation } from "@/db/schema";
import { complete } from "@/lib/llm/provider";
import {
  retrieve,
  isGrounded,
  strongChunks,
  toCitation,
  type RetrievedChunk,
} from "@/lib/retrieval";

export type AskResult = {
  question: string;
  answer: string;
  groundingStatus: "grounded" | "not_found";
  citations: Citation[];
};

const REFUSAL =
  "I couldn't find this in your uploaded materials, so I won't guess. Try uploading notes that cover this topic, or rephrase the question.";

const SYSTEM = `You are a grounded study assistant. You answer ONLY using the numbered SOURCES provided.
Rules:
- Use only facts present in the SOURCES. Do not add outside knowledge.
- Cite every claim with bracketed source numbers like [1] or [2][3].
- If the SOURCES do not contain enough information to answer, reply with exactly: NOT_FOUND
- Be concise and concrete.`;

function buildContext(chunks: RetrievedChunk[]): string {
  return chunks
    .map((c, i) => `[${i + 1}] (from "${c.sourceTitle}")\n${c.content}`)
    .join("\n\n");
}

/**
 * Core grounded Q&A. Retrieves, decides grounding by retrieval confidence, then
 * either answers strictly from the cited chunks or refuses. Persists the result.
 */
export async function askGrounded(question: string): Promise<AskResult> {
  const retrieved = await retrieve(question);
  const grounded = isGrounded(retrieved);
  const supporting = strongChunks(retrieved);

  if (!grounded || supporting.length === 0) {
    return persist({
      question,
      answer: REFUSAL,
      groundingStatus: "not_found",
      citations: [],
    });
  }

  const answer = await complete({
    system: SYSTEM,
    user: `QUESTION:\n${question}\n\nSOURCES:\n${buildContext(supporting)}`,
    tier: "reasoning",
  });

  // The model is the second guardrail: it self-refuses when context is insufficient.
  if (!answer || answer.trim().toUpperCase().startsWith("NOT_FOUND")) {
    return persist({
      question,
      answer: REFUSAL,
      groundingStatus: "not_found",
      citations: [],
    });
  }

  return persist({
    question,
    answer,
    groundingStatus: "grounded",
    citations: supporting.map(toCitation),
  });
}

async function persist(result: AskResult): Promise<AskResult> {
  await db.insert(askQueries).values({
    question: result.question,
    answer: result.answer,
    groundingStatus: result.groundingStatus,
    citations: result.citations,
  });
  return result;
}
