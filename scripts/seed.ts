/**
 * Seed the database with a small DSA + cloud corpus so the demo works immediately.
 * Run with: npm run db:seed  (requires DATABASE_URL + OPENAI_API_KEY in .env.local)
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const SAMPLE_NOTES: { title: string; text: string }[] = [
  {
    title: "Sliding Window Technique",
    text: `The sliding window technique maintains a window [left, right] over an array or string and
moves it instead of recomputing from scratch. You GROW the window by advancing 'right', and you
SHRINK it by advancing 'left'.

Key rule: shrink the window only AFTER the window becomes invalid. For "longest substring without
repeating characters", you advance right, and when a duplicate appears you advance left until the
duplicate is gone. A common off-by-one bug is shrinking the window before recording the answer, or
moving left past the duplicate. Record the best answer once the window is valid again.

Time complexity is O(n) because each index is visited at most twice (once by right, once by left).`,
  },
  {
    title: "Binary Search Invariants",
    text: `Binary search works on a sorted range by halving the search space each step. The loop
invariant is that the target, if present, always lies within [lo, hi].

Use lo <= hi with hi = mid - 1 and lo = mid + 1 to avoid infinite loops. Compute mid as
lo + (hi - lo) / 2 to avoid integer overflow. The classic bug is using lo < hi with the wrong
update, which skips the boundary element. Binary search runs in O(log n) time.`,
  },
  {
    title: "Cloud Autoscaling Basics",
    text: `Horizontal autoscaling adds or removes instances based on a target metric such as average
CPU utilization or request rate. A scaling policy defines the target value, plus cooldown periods
to prevent thrashing (rapidly scaling up and down).

Scale-out adds instances when demand rises; scale-in removes them when demand falls. Always set a
minimum and maximum instance count. A load balancer distributes incoming traffic across the healthy
instances so no single instance is overwhelmed.`,
  },
];

async function main() {
  const { ingestText } = await import("../src/lib/ingest");
  for (const note of SAMPLE_NOTES) {
    const result = await ingestText({ title: note.title, kind: "text", text: note.text });
    console.log(`Indexed "${result.title}" -> ${result.chunkCount} chunks`);
  }
  console.log("Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
