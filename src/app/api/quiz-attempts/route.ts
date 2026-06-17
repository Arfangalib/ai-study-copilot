import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { gradeAttempt } from "@/lib/quiz";
import { guardRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60; // short-answer grading calls the model

const schema = z.object({
  quizQuestionId: z.string().uuid(),
  userAnswer: z.string().min(1).max(4000),
});

/** Grade a practice answer, persist the attempt, and update the topic's weak-score. */
export async function POST(req: NextRequest) {
  try {
    const guard = await guardRequest(req.headers, "quiz-attempts");
    if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const result = await gradeAttempt(parsed.data.quizQuestionId, parsed.data.userAnswer);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[quiz-attempts]", err);
    return NextResponse.json({ error: "Grading failed." }, { status: 500 });
  }
}
