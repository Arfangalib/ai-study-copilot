import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runBugHunt } from "@/lib/bug-hunt";
import { guardRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60; // diagnosis + question generation can take >10s

const schema = z.object({
  code: z.string().min(1).max(20000),
  language: z.string().max(40).optional(),
});

/** Diagnose a bug (model inference), then cite the underlying concept + practice. */
export async function POST(req: NextRequest) {
  try {
    const guard = await guardRequest(req.headers, "bug-hunt");
    if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const result = await runBugHunt(parsed.data.code, parsed.data.language);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[bug-hunt]", err);
    return NextResponse.json({ error: "Bug hunt failed." }, { status: 500 });
  }
}
