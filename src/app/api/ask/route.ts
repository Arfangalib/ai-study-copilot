import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { askGrounded } from "@/lib/ask";
import { guardRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60; // retrieval + grounded completion can take >10s

const schema = z.object({ question: z.string().min(1).max(2000) });

/** Grounded Q&A: answer strictly from uploaded materials with citations, or refuse. */
export async function POST(req: NextRequest) {
  try {
    const guard = await guardRequest(req.headers, "ask");
    if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const result = await askGrounded(parsed.data.question);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ask failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
