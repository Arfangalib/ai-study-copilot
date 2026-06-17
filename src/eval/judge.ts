import { z } from "zod";
import { completeJSON } from "@/lib/llm/provider";

const schema = z.object({
  total: z.number(),
  supported: z.number(),
});

const JUDGE_SYSTEM = `You are a strict grading judge measuring whether an answer is supported by its cited sources.
Break the ANSWER into its distinct factual claims. Then count how many of those claims are directly
supported by the CITED SOURCES. A claim counts as supported only if a source actually states it;
do not credit outside knowledge. Respond as JSON: { "total": <number of claims>, "supported": <number supported> }.`;

/**
 * LLM-as-judge for answer support: returns how many of the answer's claims are
 * backed by the cited excerpts. Uses the fast model to keep eval cost low.
 */
export async function judgeSupport(
  question: string,
  answer: string,
  citedSnippets: string[],
): Promise<{ supported: number; total: number }> {
  const sources = citedSnippets.map((s, i) => `[${i + 1}] ${s}`).join("\n\n");
  const raw = await completeJSON({
    system: JUDGE_SYSTEM,
    user: `QUESTION: ${question}\n\nANSWER:\n${answer}\n\nCITED SOURCES:\n${sources}`,
    tier: "fast",
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { supported: 0, total: 0 };

  const total = Math.max(0, Math.floor(parsed.data.total));
  const supported = Math.min(total, Math.max(0, Math.floor(parsed.data.supported)));
  return { supported, total };
}
