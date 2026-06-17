/**
 * Seed the database with a DSA + cloud corpus so the demo and eval set have real
 * coverage. Idempotent: clears existing sources (chunks cascade) before seeding.
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

Key rule: shrink the window only AFTER it becomes invalid. For "longest substring without repeating
characters", advance right; when a duplicate appears, advance left until the duplicate is gone, then
record the best length. A common off-by-one bug is removing s[left] from the set without also
advancing left, which loops forever or removes the wrong element. Time complexity is O(n) because
each index is visited at most twice.`,
  },
  {
    title: "Binary Search Invariants",
    text: `Binary search works on a sorted range by halving the search space each step. The loop
invariant is that the target, if present, always lies within [lo, hi].

Use lo <= hi with hi = mid - 1 and lo = mid + 1 to avoid infinite loops. Compute mid as
lo + (hi - lo) / 2 to avoid integer overflow that (lo + hi) / 2 can cause. The classic bug is using
lo < hi with the wrong update, which skips the boundary element. Binary search runs in O(log n).`,
  },
  {
    title: "Two Pointers Technique",
    text: `The two pointers technique uses two indices that move through a sequence, often from both
ends toward the middle or both forward at different speeds. On a sorted array, a pair summing to a
target is found by moving the left pointer right when the sum is too small and the right pointer left
when the sum is too large. The fast/slow variant detects cycles in a linked list: the fast pointer
moves two steps and the slow one step; they meet inside a cycle. Two pointers usually turn an O(n^2)
brute force into O(n).`,
  },
  {
    title: "Hash Maps and Hashing",
    text: `A hash map stores key-value pairs and offers average O(1) insert, lookup, and delete by
hashing the key to a bucket. Collisions (two keys hashing to the same bucket) are resolved by
chaining (a list per bucket) or open addressing (probing for the next free slot). Worst-case lookup
is O(n) when many keys collide. Hash maps are the standard tool for de-duplication, frequency
counting, and memoization because membership tests are constant time on average.`,
  },
  {
    title: "Recursion and Base Cases",
    text: `A recursive function solves a problem by calling itself on smaller inputs. Every recursion
needs a base case that returns without recursing; missing or wrong base cases cause infinite
recursion and a stack overflow. The recursive case must make progress toward the base case. Each
call adds a frame to the call stack, so recursion depth is bounded by the stack size. Tail recursion
and converting to an explicit stack can avoid deep recursion.`,
  },
  {
    title: "Big-O Time Complexity",
    text: `Big-O notation describes how an algorithm's running time grows with input size n, ignoring
constants and lower-order terms. Common classes from fastest to slowest: O(1) constant, O(log n)
logarithmic, O(n) linear, O(n log n), O(n^2) quadratic, and O(2^n) exponential. Nested loops over n
elements are usually O(n^2). Halving the input each step gives O(log n). Big-O describes the upper
bound on growth, which matters most as n becomes large.`,
  },
  {
    title: "Dynamic Programming Basics",
    text: `Dynamic programming (DP) solves problems with overlapping subproblems and optimal
substructure by storing subproblem results to avoid recomputation. Top-down DP adds memoization to a
recursive solution; bottom-up DP fills a table iteratively. The Fibonacci sequence is the classic
example: naive recursion is O(2^n), but memoizing each value makes it O(n). Identifying the state and
the recurrence relation is the core of designing a DP solution.`,
  },
  {
    title: "Stacks and Queues",
    text: `A stack is a last-in-first-out (LIFO) structure with push and pop at one end; it underlies
function call stacks, undo features, and matching-parentheses checks. A queue is first-in-first-out
(FIFO) with enqueue at the back and dequeue at the front; it underlies breadth-first search and task
scheduling. Both offer O(1) insertion and removal. A deque (double-ended queue) allows push and pop
at both ends and powers sliding-window-maximum algorithms.`,
  },
  {
    title: "Cloud Autoscaling",
    text: `Horizontal autoscaling adds or removes instances based on a target metric such as average
CPU utilization or request rate. A scaling policy defines the target value plus cooldown periods to
prevent thrashing (rapidly scaling up and down). Scale-out adds instances when demand rises; scale-in
removes them when demand falls. Always set a minimum and maximum instance count so the system stays
available under load but bounded in cost.`,
  },
  {
    title: "Load Balancing",
    text: `A load balancer distributes incoming requests across multiple backend instances so no single
instance is overwhelmed. Common algorithms include round-robin (each instance in turn), least-
connections (the instance with the fewest active requests), and IP-hash (sticky sessions by client).
Health checks let the balancer stop routing to unhealthy instances. Load balancing improves both
availability and horizontal scalability.`,
  },
  {
    title: "Caching Strategies",
    text: `A cache stores frequently accessed data in fast storage to reduce latency and load on the
origin. Cache-aside (lazy loading) has the application check the cache first and populate it on a
miss. Write-through writes to the cache and the database together for consistency; write-back writes
to the cache first and flushes later for speed. Eviction policies like LRU (least recently used)
decide what to drop when the cache is full. A TTL bounds how long stale data can live.`,
  },
  {
    title: "CAP Theorem and Consistency",
    text: `The CAP theorem states that a distributed system can guarantee at most two of Consistency,
Availability, and Partition tolerance at the same time. Because network partitions are unavoidable,
real systems choose between consistency and availability during a partition. CP systems reject
requests to stay consistent; AP systems keep serving but may return stale data. Eventual consistency
means replicas converge once the partition heals.`,
  },
];

async function main() {
  const { db } = await import("../src/db");
  const { sources } = await import("../src/db/schema");
  const { ingestText } = await import("../src/lib/ingest");

  // Idempotent: wipe existing sources (chunks cascade) so reseeding stays clean.
  await db.delete(sources);
  console.log("Cleared existing sources.");

  for (const note of SAMPLE_NOTES) {
    const result = await ingestText({ title: note.title, kind: "text", text: note.text });
    console.log(`Indexed "${result.title}" -> ${result.chunkCount} chunks`);
  }
  console.log(`Seed complete: ${SAMPLE_NOTES.length} sources.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
