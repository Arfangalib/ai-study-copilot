import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { quizQuestions, quizAttempts } from "@/db/schema";
import { completeJSON } from "@/lib/llm/provider";
import { recordTopicSignal } from "@/lib/weak-topics";

export type GradeResult = {
  isCorrect: boolean;
  score: number;
  expectedAnswer: string;
  explanation: string;
};

const shortGradeSchema = z.object({
  correct: z.boolean(),
  score: z.number().min(0).max(1),
  explanation: z.string().min(1),
});

const SHORT_GRADE_SYSTEM = `You grade a student's short answer against an expected answer and rubric.
Respond as JSON: { "correct": boolean, "score": number 0..1, "explanation": one sentence }.
Be fair: award correct=true when the answer captures the key idea, even if worded differently.`;

/** Grade an attempt, persist it, and update the topic's weak-score. */
export async function gradeAttempt(
  quizQuestionId: string,
  userAnswer: string,
): Promise<GradeResult> {
  const question = await db.query.quizQuestions.findFirst({
    where: eq(quizQuestions.id, quizQuestionId),
  });
  if (!question) throw new Error("Quiz question not found.");

  let result: GradeResult;

  if (question.type === "mcq") {
    const isCorrect =
      userAnswer.trim().toLowerCase() === question.expectedAnswer.trim().toLowerCase();
    result = {
      isCorrect,
      score: isCorrect ? 1 : 0,
      expectedAnswer: question.expectedAnswer,
      explanation: isCorrect
        ? "Correct."
        : `Not quite — the expected answer is: ${question.expectedAnswer}`,
    };
  } else {
    const graded = shortGradeSchema.parse(
      await completeJSON({
        system: SHORT_GRADE_SYSTEM,
        user: `QUESTION: ${question.prompt}\nEXPECTED: ${question.expectedAnswer}\nRUBRIC: ${
          question.rubric ?? "(none)"
        }\nSTUDENT ANSWER: ${userAnswer}`,
        tier: "fast",
      }),
    );
    result = {
      isCorrect: graded.correct,
      score: graded.score,
      expectedAnswer: question.expectedAnswer,
      explanation: graded.explanation,
    };
  }

  await db.insert(quizAttempts).values({
    quizQuestionId,
    userAnswer,
    isCorrect: result.isCorrect,
    score: result.score,
    explanation: result.explanation,
  });

  if (question.topic) await recordTopicSignal(question.topic, result.isCorrect);

  return result;
}
