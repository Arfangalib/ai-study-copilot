import { NextResponse } from "next/server";
import {
  getCoverage,
  getWeakTopics,
  getRecentAsks,
  getRecentBugHunts,
} from "@/lib/dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Read-only: corpus coverage, weak topics, and recent activity. No model calls. */
export async function GET() {
  try {
    const [coverage, weakTopics, recentAsks, recentBugHunts] = await Promise.all([
      getCoverage(),
      getWeakTopics(),
      getRecentAsks(),
      getRecentBugHunts(),
    ]);
    return NextResponse.json({ coverage, weakTopics, recentAsks, recentBugHunts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load dashboard.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
