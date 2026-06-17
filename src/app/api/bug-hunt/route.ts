import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runBugHunt } from "@/lib/bug-hunt";

export const runtime = "nodejs";

const schema = z.object({
  code: z.string().min(1).max(20000),
  language: z.string().max(40).optional(),
});

/** Diagnose a bug (model inference), then cite the underlying concept + practice. */
export async function POST(req: NextRequest) {
  try {
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
    const message = err instanceof Error ? err.message : "Bug hunt failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
