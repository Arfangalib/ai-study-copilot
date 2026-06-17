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
    console.error("[eval/runs]", err);
    return NextResponse.json({ error: "Failed to load eval runs." }, { status: 500 });
  }
}
