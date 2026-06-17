import { z } from "zod";
import { db } from "@/db";
import { bugHunts, quizQuestions, type Citation } from "@/db/schema";
import { completeJSON } from "@/lib/llm/provider";
import { retrieve, strongChunks, toCitation, type RetrievedChunk } from "@/lib/retrieval";
import { recordTopicSignal } from "@/lib/weak-topics";

/** A practice question as returned to the client (answers withheld). */
export type PublicQuestion = {
  id: string;
  type: "mcq" | "short";
  prompt: string;
  options: string[];
};

export type BugHuntResult = {
  bugHuntId: string;
  /** Model inference, NOT grounded in the user's notes. */
  diagnosis: string;
  topic: string;
  /** Whether the underlying concept was found in the user's materials. */
  groundingStatus: "grounded" | "not_found";
  conceptCitations: Citation[];
  questions: PublicQuestion[];
};

const diagnosisSchema = z.object({
  diagnosis: z.string().min(1),
  topic: z.string().min(1),
  retrievalQuery: z.string().min(1),
});

const questionsSchema = z.object({
  questions: z
    .array(
      z.object({
        type: z.enum(["mcq", "short"]),
        prompt: z.string().min(1),
        options: z.array(z.string()).default([]),
        expectedAnswer: z.string().min(1),
        rubric: z.string().nullish(),
      }),
    )
    .default([]),
});

const DIAGNOSE_SYSTEM = `You are an expert code reviewer and DSA/cloud tutor. Diagnose the single most likely bug in the user's code.
Your diagnosis is your own reasoning (model inference) -- it is NOT sourced from any document, so do not cite anything.
Respond as JSON with keys:
- "diagnosis": 3-5 sentences. Name the bug, explain why it is wrong, and give the concrete fix.
- "topic": a short lowercase canonical concept label (e.g. "sliding window", "binary search", "integer overflow", "recursion base case").
- "retrievalQuery": a concise natural-language query to find the underlying concept in a student's study notes.
If there is no obvious bug, say so in "diagnosis" and still infer the most relevant "topic".`;

const QUESTIONS_SYSTEM = `You write short practice questions to reinforce a concept, using ONLY the provided SOURCES.
Respond as JSON { "questions": [...] } with 2-3 questions. Each question object:
- "type": "mcq" or "short"
- "prompt": the question text
- For "mcq": "options" (array of exactly 4 distinct strings) and "expectedAnswer" (must exactly equal one of the options)
- For "short": "expectedAnswer" (the ideal concise answer) and "rubric" (1-2 sentences on what a correct answer must include)
Include at least one "mcq". Use only facts present in SOURCES; do not invent details.`;

function buildContext(chunks: RetrievedChunk[]): string {
  return chunks
    .map((c, i) => `[${i + 1}] (from "${c.sourceTitle}")\n${c.content}`)
    .join("\n\n");
}

/**
 * Bug-hunt pipeline (honest grounding):
 *  1. Diagnose the bug      -> MODEL INFERENCE (labeled as such, no citations)
 *  2. Infer topic + query   -> retrieve the *concept* from notes (not raw code)
 *  3. Cite concept chunks   -> grounded
 *  4. Generate practice Qs   -> strictly from the cited chunks
 *  5. Persist + mark the topic as weak (a bug just happened on it)
 */
export async function runBugHunt(code: string, language?: string): Promise<BugHuntResult> {
  // 1 + 2: diagnose and infer topic/query.
  const raw = await completeJSON({
    system: DIAGNOSE_SYSTEM,
    user: `LANGUAGE: ${language ?? "unknown"}\n\nCODE:\n${code}`,
    tier: "reasoning",
  });
  const diag = diagnosisSchema.parse(raw);

  // 3: retrieve the underlying concept by the inferred query (NOT the raw code).
  const retrieved = await retrieve(diag.retrievalQuery);
  const concept = strongChunks(retrieved);
  const grounded = concept.length > 0;
  const conceptCitations = concept.map(toCitation);

  // 4: generate grounded practice questions (only when the concept is in the notes).
  const generated = grounded
    ? questionsSchema.parse(
        await completeJSON({
          system: QUESTIONS_SYSTEM,
          user: `TOPIC: ${diag.topic}\n\nSOURCES:\n${buildContext(concept)}`,
          tier: "fast",
        }),
      ).questions
    : [];

  // 5: persist bug hunt, questions, and the weak-topic signal.
  const [bugHunt] = await db
    .insert(bugHunts)
    .values({
      code,
      language: language ?? null,
      topic: diag.topic,
      diagnosis: diag.diagnosis,
      conceptCitations,
    })
    .returning({ id: bugHunts.id });

  const sourceChunkIds = concept.map((c) => c.chunkId);
  const questions: PublicQuestion[] = [];
  for (const q of generated) {
    const isMcq = q.type === "mcq" && q.options.length >= 2;
    const [saved] = await db
      .insert(quizQuestions)
      .values({
        bugHuntId: bugHunt.id,
        topic: diag.topic,
        type: isMcq ? "mcq" : "short",
        prompt: q.prompt,
        options: isMcq ? q.options : [],
        expectedAnswer: q.expectedAnswer,
        rubric: q.rubric ?? null,
        sourceChunkIds,
      })
      .returning({ id: quizQuestions.id });
    questions.push({
      id: saved.id,
      type: isMcq ? "mcq" : "short",
      prompt: q.prompt,
      options: isMcq ? q.options : [],
    });
  }

  await recordTopicSignal(diag.topic, false);

  return {
    bugHuntId: bugHunt.id,
    diagnosis: diag.diagnosis,
    topic: diag.topic,
    groundingStatus: grounded ? "grounded" : "not_found",
    conceptCitations,
    questions,
  };
}
