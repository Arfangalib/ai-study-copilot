import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { gradeAttempt } from "@/lib/quiz";

export const runtime = "nodejs";

const schema = z.object({
  quizQuestionId: z.string().uuid(),
  userAnswer: z.string().min(1).max(4000),
});

/** Grade a practice answer, persist the attempt, and update the topic's weak-score. */
export async function POST(req: NextRequest) {
  try {
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
    const message = err instanceof Error ? err.message : "Grading failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
