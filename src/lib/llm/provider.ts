import OpenAI from "openai";
import { env } from "@/lib/env";

/**
 * Thin, provider-swappable LLM boundary. Everything in the app talks to the model
 * through these functions only -- so switching provider/model (or to Claude) is a
 * change here, not across the codebase. Model ids come from env.
 */
const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

/** Which configured model to use for a call. */
export type ModelTier = "reasoning" | "fast";

function modelFor(tier: ModelTier): string {
  return tier === "reasoning" ? env.OPENAI_REASONING_MODEL : env.OPENAI_FAST_MODEL;
}

/** Embed a batch of texts. Returns one vector per input, in order. */
export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const res = await client.embeddings.create({
    model: env.OPENAI_EMBEDDING_MODEL,
    input: texts,
  });
  return res.data.map((d) => d.embedding as number[]);
}

/** Embed a single text. */
export async function embedOne(text: string): Promise<number[]> {
  const [vec] = await embed([text]);
  return vec;
}

export type CompleteArgs = {
  system: string;
  user: string;
  tier?: ModelTier;
};

/** Plain text completion. */
export async function complete({
  system,
  user,
  tier = "reasoning",
}: CompleteArgs): Promise<string> {
  const res = await client.chat.completions.create({
    model: modelFor(tier),
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return res.choices[0]?.message?.content?.trim() ?? "";
}

/**
 * JSON completion. Forces a JSON object response and parses it. The caller is
 * responsible for validating the shape (e.g. with zod).
 */
export async function completeJSON<T = unknown>({
  system,
  user,
  tier = "reasoning",
}: CompleteArgs): Promise<T> {
  const res = await client.chat.completions.create({
    model: modelFor(tier),
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const raw = res.choices[0]?.message?.content ?? "{}";
  return JSON.parse(raw) as T;
}
