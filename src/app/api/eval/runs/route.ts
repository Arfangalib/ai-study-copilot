import { NextResponse } from "next/server";
import { getLatestEvalRun, getEvalHistory } from "@/lib/dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Read-only: latest eval run + recent history. No model calls. */
export async function GET() {
  try {
    const [latest, history] = await Promise.all([getLatestEvalRun(), getEvalHistory()]);
    return NextResponse.json({ latest, history });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load eval runs.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
